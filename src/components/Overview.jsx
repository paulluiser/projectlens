import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRightIcon, ChevronRightIcon } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { WorkspaceNotice, useWorkspace } from '@/lib/workspace'
import { milestonesPath, projectOverviewPath, projectsPath, reportPath } from '@/lib/routes.mjs'
import { defaultWeek, summarize, todayIso } from '@/lib/weekly.mjs'
import { ProjectMark } from './ProjectMark'
import { ChartIllustration } from './Illustrations'

export function Overview() {
  useEffect(() => { document.title = 'Overview · Lens' }, [])
  return <WorkspaceNotice><OverviewContent /></WorkspaceNotice>
}

function percent(done, total) {
  return total ? Math.round(done / total * 100) : 0
}

function OverviewContent() {
  const { workspace } = useWorkspace()
  const recent = workspace.projects
    .flatMap(project => project.months.filter(month => month.report).map(month => ({ project, month })))
    .sort((first, second) => second.month.id.localeCompare(first.month.id)
      || (second.month.publishedAt ?? '').localeCompare(first.month.publishedAt ?? ''))
  const latest = recent[0]
  const months = workspace.projects.flatMap(project => project.months)
  const published = months.filter(month => month.report).length
  const coverage = percent(published, months.length)
  const drafts = workspace.canEdit ? months.filter(month => month.draft).length : 0

  return (
    <main id="main-content" tabIndex={-1} className="site-width workspace-overview">
      <header className="overview-header">
        <div><p className="page-eyebrow">Workspace</p><h1>Overview</h1><p>Pick up with the latest published reviews.</p></div>
        <Button asChild variant="outline" className="action"><Link to={projectsPath}>Browse projects</Link></Button>
      </header>

      {latest && <section className="overview-lead" aria-label="Latest review">
        <article className="overview-spotlight">
          <p className="overview-spotlight-meta"><span className="overview-dot" aria-hidden="true" />Latest review · {latest.month.label}</p>
          <h2>{latest.project.name}</h2>
          <p className="overview-spotlight-line">{latest.month.report.coverLine || latest.month.report.title}</p>
          <div className="overview-spotlight-actions">
            <Button asChild className="overview-spotlight-open"><Link to={reportPath(latest.project.id, latest.month.id)}>Open review <ArrowRightIcon label="" /></Link></Button>
            <Link className="overview-spotlight-link" to={milestonesPath(latest.project.id)}>Milestones</Link>
          </div>
        </article>
        <article className="overview-stats" aria-label="Reporting across projects">
          <div className="overview-stats-figure"><strong>{published}</strong><span>/ {months.length}</span></div>
          <p>reporting months published</p>
          <div className="meter" role="img" aria-label={`${coverage}% of reporting months published`}><span style={{ width: `${coverage}%` }} /></div>
          <dl>
            <div><dt>Projects</dt><dd>{workspace.projects.length}</dd></div>
            <div><dt>{workspace.canEdit ? 'Drafts' : 'Coverage'}</dt><dd>{workspace.canEdit ? drafts : `${coverage}%`}</dd></div>
          </dl>
          <Link className="overview-stats-link" to={projectsPath}>All projects <ChevronRightIcon label="" size="small" /></Link>
        </article>
      </section>}

      <ProjectsAtAGlance projects={workspace.projects} />

      <section className="overview-recent" aria-labelledby="recent-reviews">
        <div className="section-heading"><h2 id="recent-reviews">Recent reviews</h2>{recent.length > 0 && <span>{Math.min(recent.length, 6)} of {recent.length}</span>}</div>
        {recent.length ? (
          <ul className="row-list">
            {recent.slice(0, 6).map(({ project, month }, index) => (
              <li key={project.id + ':' + month.id}>
                <Link to={reportPath(project.id, month.id)} data-current={index === 0 || undefined}>
                  <ProjectMark project={project} />
                  <span className="overview-review-name"><strong>{project.name}</strong><span>{month.report.title}</span></span>
                  <span className="overview-month">{index === 0 && <span className="overview-latest">Latest · </span>}{month.label}</span>
                  <ArrowRightIcon label="" />
                </Link>
              </li>
            ))}
          </ul>
        ) : <div className="overview-empty"><ChartIllustration /><p>Published reviews will appear here.</p></div>}
      </section>
    </main>
  )
}

// Each project's latest published completion as a bar, with milestone and current-week progress as text.
function ProjectsAtAGlance({ projects }) {
  const today = todayIso()
  const rows = projects.map(project => {
    const latest = project.months.filter(month => month.report).sort((a, b) => b.id.localeCompare(a.id))[0]
    const progress = latest?.report.progress
    const completion = progress?.total ? Math.round(progress.projectCompleted / progress.total * 100) : null
    const milestones = project.milestones ?? []
    const week = defaultWeek([...(project.weeks ?? [])].sort((a, b) => a.start.localeCompare(b.start)), today)
    const tasks = week ? summarize(week.tasks ?? []) : null
    return { project, latest, completion, milestonesDone: milestones.filter(item => item.status === 'completed').length, milestones: milestones.length, tasks }
  })
  if (!rows.length) return null
  return <section className="overview-glance" aria-labelledby="glance-title">
    <div className="section-heading"><h2 id="glance-title">Projects at a glance</h2><span>Completion at the latest review</span></div>
    <ul className="glance-list">
      {rows.map(({ project, latest, completion, milestonesDone, milestones, tasks }) => <li key={project.id}>
        <Link to={projectOverviewPath(project.id)}>
          <span className="glance-name"><ProjectMark project={project} /><strong>{project.name}</strong></span>
          <span className="glance-bar" role="img" aria-label={completion === null ? 'No published review' : `${completion}% complete at ${latest.label}`}>
            {completion === null ? <em>No published review</em> : <><span className="meter"><span style={{ width: `${completion}%` }} data-tip={`${latest.label}: ${completion}%`} /></span><b>{completion}%</b></>}
          </span>
          <span className="glance-facts"><span>{milestonesDone}/{milestones} milestones</span><span>{tasks ? `${tasks.done}/${tasks.total} tasks this week` : 'No week planned'}</span></span>
          <ArrowRightIcon label="" />
        </Link>
      </li>)}
    </ul>
  </section>
}
