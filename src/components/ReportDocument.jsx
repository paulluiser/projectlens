import { formatOwners, formatRange, summarize, taskFlags, taskStatuses } from '@/lib/weekly.mjs'

const number = value => value == null ? 'Not reported' : new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(value)
const date = value => value ? new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value.length === 10 ? `${value}T00:00:00Z` : value)) : 'Not specified'
const outcomeLabels = { completed: 'Completed', 'carried-over': 'Carried over', changed: 'Changed', dropped: 'Dropped' }

function DocumentHeader({ project, title, period, status, publishedAt }) {
  return <header className="document-header">
    <p className="document-brand">Project Lens</p>
    <h1>{project.name}</h1><p className="document-title">{title}</p>
    <dl className="document-metadata"><div><dt>Reporting period</dt><dd>{period}</dd></div>{status && <div><dt>Document status</dt><dd>{status}</dd></div>}{publishedAt && <div><dt>Published</dt><dd>{date(publishedAt)}</dd></div>}</dl>
  </header>
}

function DataTable({ caption, headings, children, className = '' }) {
  return <table className={`document-table ${className}`}><caption>{caption}</caption><thead><tr>{headings.map(heading => <th key={heading} scope="col">{heading}</th>)}</tr></thead><tbody>{children}</tbody></table>
}

export function MonthlyReportDocument({ project, month, report, preview = false, visible = false }) {
  const { progress, wins, blockers, next } = report
  const completion = progress.total ? new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(progress.projectCompleted / progress.total * 100) + '%' : '0%'
  const metrics = [
    ['Tasks planned this month', number(progress.planned)], ['Tasks completed this month', number(progress.completed)],
    ['Tasks carried over', number(progress.carryOver)], ['Total project tasks', number(progress.total)],
    ['Cumulative tasks completed', number(progress.projectCompleted)], ['Tasks remaining', number(Math.max(0, progress.total - progress.projectCompleted))],
    ['Overall project completion', completion], ['Hours logged this month', number(progress.hours)], ['Total running hours', number(progress.runningHours)],
  ]
  return <article className={`formal-document monthly-document ${visible ? 'document-preview' : 'print-only'}`} aria-label="Printable monthly report">
    <DocumentHeader project={project} title="Monthly progress report" period={month.label} status={preview ? 'DRAFT - not published' : 'Published report'} publishedAt={!preview && month.publishedAt} />
    {report.coverLine && <section className="document-summary"><h2>Executive summary</h2><p>{report.coverLine}</p></section>}
    <section className="document-section"><h2>1. Progress and delivery</h2>
      <DataTable caption="Delivery and project metrics" headings={['Measure', 'Reported value']} className="document-metrics">{metrics.map(([label,value]) => <tr key={label}><th scope="row">{label}</th><td>{value}</td></tr>)}</DataTable>
      <div className="document-table-pair">
        <DataTable caption="Classified workstreams" headings={['Workstream', 'Tasks']}>{progress.workstreams.length ? progress.workstreams.map(([label,value],index) => <tr key={index}><td>{label}</td><td>{number(value)}</td></tr>) : <tr><td colSpan="2">No workstreams recorded.</td></tr>}</DataTable>
        <DataTable caption="Reporting compliance" headings={['Measure', 'Compliance']}>{progress.reporting.length ? progress.reporting.map(([label,value],index) => <tr key={index}><td>{label}</td><td>{number(value)}%</td></tr>) : <tr><td colSpan="2">No compliance measures recorded.</td></tr>}</DataTable>
      </div>
    </section>
    <section className="document-section"><h2>2. Accomplishments</h2>{wins.length ? <ol className="document-list">{wins.map((win,index) => <li key={index}><p><strong>{win.title}</strong>{win.value && <span> - {win.value}</span>}</p>{win.detail && <p>{win.detail}</p>}</li>)}</ol> : <p>No accomplishments recorded for this period.</p>}</section>
    <section className="document-section"><h2>3. Blockers and responses</h2>{blockers.length ? <DataTable caption="Reported blockers and team response" headings={['Blocker', 'Impact', 'Response']} className="document-blockers">{blockers.map((item,index) => <tr key={index}><td><strong>{item.title}</strong></td><td>{item.impact || 'Not recorded'}</td><td>{item.response || 'No response recorded'}</td></tr>)}</DataTable> : <p>No blockers reported for this period.</p>}</section>
    <section className="document-section"><h2>4. Plan for {next.month}</h2>{next.items.length ? <DataTable caption={`Planned actions - ${next.month}`} headings={['Action / deliverable', 'Owner', 'Target date']} className="document-plan">{next.items.map((item,index) => <tr key={index}><td><strong>{item.title}</strong>{item.detail && <p>{item.detail}</p>}</td><td>{item.owner || 'Unassigned'}</td><td>{date(item.date)}</td></tr>)}</DataTable> : <p>No actions recorded for the incoming month.</p>}
      {next.milestones?.length > 0 && <><h3>Planned milestones</h3><ul className="document-list">{next.milestones.map((item,index) => <li key={index}>{item}</li>)}</ul></>}
      {next.support && <><h3>Support required</h3><p>{next.support}</p></>}
    </section>
    {report.carryForward?.length > 0 && <section className="document-section"><h2>5. Follow-through from the previous month</h2><DataTable caption="Previous commitments" headings={['Commitment', 'Owner', 'Outcome']} className="document-plan">{report.carryForward.map((item,index) => <tr key={index}><td><strong>{item.title}</strong>{item.context && <p>{item.context}</p>}</td><td>{item.owner || 'Unassigned'}</td><td>{outcomeLabels[item.status] ?? item.status}</td></tr>)}</DataTable></section>}
    <p className="document-end">End of report · {project.name} · {month.label}</p>
  </article>
}

export function WeeklyReportDocument({ project, week, tasks, today, filtered }) {
  const summary = summarize(tasks)
  const overdue = tasks.filter(task => taskFlags(task, week, today).overdue).length
  return <article className="print-only formal-document weekly-document" aria-label="Printable weekly report">
    <DocumentHeader project={project} title="Weekly status report" period={formatRange(week.start, week.end)} />
    {week.label && <p className="document-week-label">{week.label}</p>}
    {filtered && <p className="document-filter-note">Filtered report: only the currently selected tasks are included.</p>}
    <section className="document-summary"><h2>Summary</h2><p>{summary.done} of {summary.total} tasks completed. {summary.total - summary.done} tasks remain open; {overdue} overdue.</p></section>
    <section className="document-section"><h2>1. Task register</h2><DataTable caption="Tasks, responsibilities and status" headings={['Task / deliverable', 'Owner(s)', 'Target date', 'Status']} className="document-weekly-tasks">{tasks.length ? tasks.map(task => <tr key={task.id}><td><strong>{task.title}</strong>{task.notes && <p>{task.notes}</p>}</td><td>{formatOwners(task)}</td><td>{date(task.dueDate)}</td><td>{taskStatuses[task.status]}{taskFlags(task, week, today).overdue && <span className="document-overdue">Overdue</span>}</td></tr>) : <tr><td colSpan="4">No tasks in this view.</td></tr>}</DataTable></section>
    {summary.owners.length > 0 && <section className="document-section"><h2>2. Workload by owner</h2><DataTable caption="Assigned and completed tasks" headings={['Owner', 'Assigned', 'Completed', 'Remaining']}>{summary.owners.map(owner => <tr key={owner.owner}><td>{owner.owner}</td><td>{owner.total}</td><td>{owner.done}</td><td>{owner.total - owner.done}</td></tr>)}</DataTable></section>}
    <p className="document-end">End of report · {project.name} · {formatRange(week.start, week.end)}</p>
  </article>
}
