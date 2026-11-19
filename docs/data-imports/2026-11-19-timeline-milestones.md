# Timeline milestone import

Imported the user-supplied workbooks on 19 November 2026. These are source schedules, not an assertion that unfinished work has since completed. Original workbooks are unchanged.

| Workbook | Project | Source rows | Records |
| --- | --- | --- | --- |
| SIMS.xlsx | SIMSDotNet | Master Timeline A5:H39, Milestones & Gates A4:E14, Migration Playbook A4:D13 | 56 |
| PMS.xlsx | PMS | Timeline, A11:H22 | 12 |
| Mobile.xlsx | HRDotNet Mobile | Mobile Timeline, A7:E13 | 7 |

## Interpretation

- SIMS imports every activity, checkpoint, and playbook stage from its three schedule sheets. Overlapping summary rows remain separate items with their source reference. Protected-break rows are calendar constraints, with their original labels and notes retained. Worksheet headings, assumptions, and free-form notes remain contextual information.
- A window’s final date becomes the target date; its first date is retained as `startDate`. Roadmap spans represent only supplied windows. Single-date gates remain diamonds.
- PMS uses the cached Excel start/finish dates, including fractional-workday handoffs. Assigned developer remains “1 full-stack developer” because the workbook does not name a person. All packages remain Planned: dates alone cannot establish completion. Acceptance criteria, budgets, predecessor IDs, and fixed-deadline risk remain in notes.
- Mobile retains only the explicitly confirmed completed sign-in/home milestone. Forecast rows remain Planned with a visible Forecast label. The 3–4 November window uses 4 November as its target. Owners are Unassigned because none are listed. “Remove sample data” remains undated and QA-dependent; no fake deadline is plotted.
- Imported IDs are stable, each record contains workbook/sheet/row provenance, and no imported record is marked as sample data.

## Existing workspaces

The replacement revision resets the entire milestone list for each matching project to the workbook records, including previous custom and imported records. Monthly reports are preserved. Once saved, the revision prevents repeat resets and allows subsequent edits and deletions. Read-time replacement uses a deterministic version for optimistic concurrency.

The user explicitly requested this production replacement on 19 November 2026. A public workspace snapshot before replacement is saved locally under the ignored `.local/backups` directory. Private report drafts remain in the saved workspace and are preserved by the migration.

## Reproduction

Run `python3 scripts/import-milestones.py /path/to/source/workbooks` with the three original filenames. The script reads OOXML with the Python standard library and writes only `data/projects/milestones.json`. SIMS textual date windows are checked against the inspected source before conversion; changed windows require review.

Source SHA-256:

- SIMS.xlsx: `9ae4995b0fd312eb8784f4dacaf5f8cacbeacea96644b31fe6c4b74d2cfe4e3f`
- PMS.xlsx: `e68546eff10f275079446dc3c3cf322d3a54424a78f3b7374bada546a9b4149f`
- Mobile.xlsx: `7a9c4fb6d8699a383a2b7e1ce3d1c196b7e9cf04da4ab8c2b9b532b64aa1dae0`
