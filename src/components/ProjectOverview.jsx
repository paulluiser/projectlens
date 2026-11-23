import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRightIcon, CalendarIcon, ChevronRightIcon, FlagIcon, PlanIcon } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { useWorkspace, WorkspaceNotice } from '@/lib/workspace'
import { milestonesPath, projectPath, projectsPath, reportPath, weeklyPath } from '@/lib/routes.mjs'
import { milestoneStatuses } from '@/lib/milestones.mjs'
import { defaultWeek, formatRange, summarize, todayIso, weekPhase, weekTitle } from '@/lib/weekly.mjs'
import { ProjectTabs } from './ProjectTabs'
import { ColumnChart, StatusSplit } from './Charts'
import { ChartIllustration } from './Illustrations'

const shortMonth = new Intl.DateTimeFormat(undefined, { month: 'short', year: '2-digit', timeZone: 'UTC' })
const percent = value => `${Math.round(value)}%`

export function ProjectOverview() {
  return <WorkspaceNotice><OverviewPage /></WorkspaceNotice>
}

function OverviewPage() {
  const { workspace } = useWorkspace()
  const { projectId } = useParams()
  const project = workspace.projects.find(item => item.id === projectId)
  useEffect(() => { document.title = `Overview · ${project?.name ?? 'Project unavailable'} · Lens` }, [project?.name])
  if (!project) return <main className="site-width missing-page" id="main-content" tabIndex={-1}><h1>Project unavailable</h1><p>This project may have been renamed or removed.</p><Link className="text-link" to={projectsPath}>Back to projects</Link></main>

  const today = todayIso()
  const published = project.months.filter(month => month.report).sort((a, b) => a.id.localeCompare(b.id))
  const latest = published.at(-1)
  const progress = latest?.report.progress
  const completion = progress?.total ? progress.projectCompleted / progress.total * 100 : 0
  const months = published.map(month => ({
    label: month.label, short: shortMonth.format(Date.parse(`${month.id}-01T00:00:00Z`)),
    completion: month.report.progress.total ? month.report.progress.projectCompleted / month.report.progress.total * 100 : 0,
    completed: month.report.progress.completed, planned: month.report.progress.planned,
  }))
  const milestones = project.milestones ?? []
  const milestoneCounts = Object.fromEntries(Object.keys(milestoneStatuses).map(key => [key, milestones.filter(item => item.status === key).length]))
  const weeks = [...(project.weeks ?? [])].sort((a, b) => a.start.localeCompare(b.start))
  const week = defaultWeek(weeks, today)
  const weekSummary = week ? summarize(week.tasks ?? []) : null
  const weekly = weeks.slice(-6).map(item => { const summary = summarize(item.tasks ?? []); return { label: weekTitle(item), short: formatRange(item.start, item.end).split(' – ')[0], axis: 'Week', done: summary.done, open: summary.total - summary.done } })

  const links = [
    { to: projectPath(project.id), Icon: CalendarIcon, title: `${published.length} published ${published.length === 1 ? 'review' : 'reviews'}`, text: latest ? `Latest: ${latest.label}` : 'No reviews published yet' },
    { to: milestonesPath(project.id), Icon: FlagIcon, title: `${milestoneCounts.completed} of ${milestones.length} milestones done`, text: milestoneCounts.blocked ? `${milestoneCounts.blocked} blocked` : 'Roadmap, calendar and list' },
    { to: weeklyPath(project.id), Icon: PlanIcon, title: week ? `${weekSummary.done} of ${weekSummary.total} tasks done` : 'No weeks planned', text: week ? `${weekTitle(week)} · ${weekPhase(week, today).text}` : 'Delegate tasks by week' },
  ]

  return <main className="site-width project-overview" id="main-content" tabIndex={-1}>
    <div className="page-heading directory-heading">
      <div><p className="page-eyebrow"><Link to={projectsPath}>Projects</Link></p><h1>{project.name}</h1><p>{project.description || 'Where this project stands across reviews, milestones and the current week.'}</p></div>
      {latest && <div className="record-toolbar"><Button asChild variant="outline" className="action"><Link to={reportPath(project.id, latest.id) + '?present=1'}>Present latest</Link></Button></div>}
    </div>
    <ProjectTabs projectId={project.id} />

    <section className="overview-lead" aria-label="Latest review">
      {latest ? <article className="overview-spotlight">
        <p className="overview-spotlight-meta"><span className="overview-dot" aria-hidden="true" />Latest review · {latest.label}</p>
        <h2>{latest.report.coverLine || latest.report.title}</h2>
        <div className="spotlight-meter"><div className="meter" role="img" aria-label={`Project completion ${percent(completion)}`}><span style={{ width: `${completion}%` }} /></div><span>{percent(completion)} complete · {progress.projectCompleted} of {progress.total} tasks</span></div>
        <div className="overview-spotlight-actions">
          <Button asChild className="overview-spotlight-open"><Link to={reportPath(project.id, latest.id)}>Open review <ArrowRightIcon label="" /></Link></Button>
          <Link className="overview-spotlight-link" to={reportPath(project.id, latest.id, 'next-month')}>Next month’s plan</Link>
        </div>
      </article> : <article className="empty-panel overview-empty-lead"><ChartIllustration /><h2>No published review yet</h2><p>Once a monthly review is published, its headline and completion show here.</p></article>}
      <article className="overview-stats" aria-label="This week">
        <p className="stats-eyebrow">{week ? weekTitle(week) : 'This week'}</p>
        {week ? <>
          <div className="overview-stats-figure"><strong>{weekSummary.done}</strong><span>/ {weekSummary.total} tasks done</span></div>
          <p>{weekPhase(week, today).text}</p>
          <div className="meter" role="img" aria-label={`${weekSummary.percent}% of this week's tasks done`}><span style={{ width: `${weekSummary.percent}%` }} /></div>
          <dl><div><dt>Blocked</dt><dd>{weekSummary.counts.blocked}</dd></div><div><dt>Owners</dt><dd>{weekSummary.owners.length}</dd></div></dl>
        </> : <p className="week-summary-empty">No week planned yet. Set one up in Weekly.</p>}
        <Link className="overview-stats-link" to={weeklyPath(project.id)}>Open weekly board <ChevronRightIcon label="" size="small" /></Link>
      </article>
    </section>

    <ul className="overview-links">{links.map(({ to, Icon, title, text }) => <li key={to}><Link to={to}><Icon label="" /><span><strong>{title}</strong><span>{text}</span></span><ChevronRightIcon label="" size="small" /></Link></li>)}</ul>

    <section className="chart-grid-section" aria-label="Trends">
      <ColumnChart title="Project completion by month" subtitle="Share of tracked tasks complete at each published review" data={months} max={100} format={percent}
        series={[{ key: 'completion', label: 'Completion', tone: 'brand' }]} emptyText="Publish a review to start this trend." />
      <ColumnChart title="Tasks completed vs planned" subtitle="Per published month" data={months}
        series={[{ key: 'planned', label: 'Planned', tone: 'neutral' }, { key: 'completed', label: 'Completed', tone: 'brand' }]} emptyText="Publish a review to compare months." />
      <StatusSplit title="Milestones" items={milestoneCounts} labels={milestoneStatuses} order={['completed', 'in-progress', 'blocked', 'planned']} />
      <ColumnChart title="Weekly throughput" subtitle="Tasks done and still open, last 6 weeks" data={weekly}
        series={[{ key: 'done', label: 'Done', tone: 'brand' }, { key: 'open', label: 'Open', tone: 'neutral' }]} emptyText="Plan a week to start tracking throughput." />
    </section>
  </main>
}
