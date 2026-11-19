"""Extract the supplied timeline workbooks without changing them.
Usage: python3 scripts/import-milestones.py /path/to/workbooks
"""
import hashlib
import json
import re
import sys
import zipfile
from datetime import datetime, timedelta
from pathlib import Path
import xml.etree.ElementTree as ET

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
ROOT = Path(__file__).resolve().parents[1]


def sheets(path):
    with zipfile.ZipFile(path) as archive:
        shared = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            shared = [''.join(node.itertext()) for node in ET.fromstring(archive.read('xl/sharedStrings.xml'))]
        result = []
        for sheet in ['xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml']:
            if sheet not in archive.namelist():
                continue
            cells = {}
            for cell in ET.fromstring(archive.read(sheet)).findall('.//m:sheetData/m:row/m:c', NS):
                value = cell.find('m:v', NS)
                value = value.text if value is not None else ''
                if cell.get('t') == 's':
                    value = shared[int(value)]
                elif cell.get('t') == 'inlineStr':
                    value = ''.join(node.text or '' for node in cell.findall('.//m:t', NS))
                cells[cell.get('r')] = value
            result.append(cells)
        return result


def excel_date(value):
    return (datetime(1899, 12, 30) + timedelta(days=float(value))).date().isoformat()


def record(id, title, owner, due, notes, start='', status='planned'):
    return dict(id=id, title=title.strip(), owner=owner.strip() or 'Unassigned', startDate=start,
                dueDate=due, status=status, description=notes, sample=False)


def extract(directory):
    sims = sheets(directory / 'SIMS.xlsx')[1]
    # The named gate sheet is the milestone authority; the master/playbook are supporting activities.
    gate_windows = [
        (4, 'Oct 26 – Nov 13, 2026', '2026-10-26', '2026-11-13'),
        (5, 'Nov 23 – Dec 11, 2026', '2026-11-23', '2026-12-11'),
        (6, 'Dec 11 – 17, 2026', '2026-12-11', '2026-12-17'),
        (8, 'Jan 6 – 8, 2027', '2027-01-06', '2027-01-08'),
        (9, 'Jan 11 – 12', '2027-01-11', '2027-01-12'),
        (10, 'Jan 13', '', '2027-01-13'),
        (11, 'Jan 14', '', '2027-01-14'),
        (12, 'Jan 15 – 17', '2027-01-15', '2027-01-17'),
        (13, 'Jan 18, 2027', '', '2027-01-18'),
        (14, 'Jan 29, 2027', '', '2027-01-29'),
    ]
    sims_records = []
    for row, expected, start, end in gate_windows:
        if sims[f'B{row}'] != expected:
            raise ValueError(f'SIMS date window changed at B{row}; review the mapping.')
        notes = (f"Gate requirement: {sims[f'D{row}']}\nDecision / risk: {sims[f'E{row}']}\n"
                 'Schedule constraint: no scheduled project activities from 18 Dec 2026 through 5 Jan 2027. '
                 'The 18 Jan go-live is conditional on acceptance, backups, security, and reconciled control totals.\n'
                 f'Source: SIMS.xlsx · Milestones & Gates · A{row}:E{row}.')
        sims_records.append(record(f'sims-gate-{row}', sims[f'A{row}'], sims[f'C{row}'], end, notes, start))

    pms = sheets(directory / 'PMS.xlsx')[0]
    pms_records = []
    for row in range(11, 23):
        notes = (f"Completion criteria: {pms[f'H{row}']}\nBudget: {pms[f'C{row}']} workdays. "
                 f"Predecessor ID: {pms[f'G{row}']}.\n"
                 'Source schedule: planned, very high delivery risk, no separate QA resource or contingency. '
                 'All-feature acceptance and no release-blocking defects are required.\n'
                 f'Source: PMS.xlsx · Timeline · A{row}:H{row}.')
        pms_records.append(record(f'pms-package-{pms[f"A{row}"]}', pms[f'B{row}'], pms[f'F{row}'],
                                  excel_date(pms[f'E{row}']), notes, excel_date(pms[f'D{row}'])))

    mobile = sheets(directory / 'Mobile.xlsx')[0]
    mobile_records = []
    for row in range(7, 14):
        target = mobile[f'B{row}']
        match = re.fullmatch(r'(Oct|Nov) (\d+)(?:[–-](\d+))?', target)
        due, start = '', ''
        if match:
            month = '10' if match[1] == 'Oct' else '11'
            due = f'2026-{month}-{int(match[3] or match[2]):02d}'
            if match[3]:
                start = f'2026-{month}-{int(match[2]):02d}'
        elif target != 'After QA approval':
            raise ValueError(f'Unknown Mobile target at B{row}: {target}')
        notes = (f"Source status: {mobile[f'C{row}']}. Confidence: {mobile[f'D{row}']}.\n"
                 f"{mobile[f'E{row}']}\nTarget: {target}. Owner not specified in the source.\n"
                 'Dates are forecasts based on the 20 Oct 2026 estimate, not committed deadlines. '
                 'Notifications and payslip PDF downloads are excluded pending backend support.\n'
                 f'Source: Mobile.xlsx · Mobile Timeline · A{row}:E{row}.')
        mobile_records.append(record(f'mobile-milestone-{row}', mobile[f'A{row}'], '', due, notes, start,
                                     'completed' if mobile[f'C{row}'] == 'Completed' else 'planned'))
        mobile_records[-1]['forecast'] = mobile[f'C{row}'] == 'Forecast'
    return {'simsdotnet': sims_records, 'performance-management-system-pms': pms_records, 'hrdotnet-mobile': mobile_records}


if __name__ == '__main__':
    source_dir = Path(sys.argv[1])
    data = extract(source_dir)
    destination = ROOT / 'data/projects/milestones.json'
    destination.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
    for file in ['SIMS.xlsx', 'PMS.xlsx', 'Mobile.xlsx']:
        print(f'{file}: SHA256 {hashlib.sha256((source_dir / file).read_bytes()).hexdigest()}')
    print('Imported:', {key: len(value) for key, value in data.items()})
