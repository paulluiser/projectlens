import { ProjectMark } from './ProjectMark'
import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRightIcon, SearchIcon, SuccessIcon, ClockIcon } from '@/components/ui/icons'
import { Link, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { fade, useReducedMotion } from '@/lib/motion'
import { useWorkspace, WorkspaceNotice } from '@/lib/workspace'
import { RecordEditor, DeleteRecord } from './RecordEditor'
import { projectPath, projectOverviewPath, projectsPath, reportPath } from '@/lib/routes.mjs'
import { ChartIllustration, SearchIllustration } from './Illustrations'

export function Library() {
  return <WorkspaceNotice><LoadedLibrary /></WorkspaceNotice>
}

function LoadedLibrary() {
  const { workspace } = useWorkspace()
  const projects = workspace.projects
  const reduced = useReducedMotion()
  const [params, setParams] = useSearchParams()
  const { projectId: pathProject } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => { try { sessionStorage.setItem('lens-library-location', location.pathname + location.search) } catch {} }, [location.pathname, location.search])
  const projectId = pathProject
  const project = projects.find((entry) => entry.id === projectId)
  const unknownProject = Boolean(pathProject && !project)
  const visibleProjects = project ? [project] : projects
  const query = params.get('q')?.trim() ?? ''
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  const sort = params.get('sort') === 'oldest' ? 'oldest' : 'newest'
  const rows = visibleProjects.flatMap((entry) => {
    const matches = entry.months
      .filter((item) => {
        const searchable = `${entry.name} ${item.label} ${item.id} ${(item.draft ?? item.report)?.title ?? ''}`.toLowerCase()
        return terms.every((term) => searchable.includes(term))
      })
      .map((item) => ({ project: entry, month: item }))
    if (entry.months.length === 0 && terms.every((term) => entry.name.toLowerCase().includes(term))) {
      matches.push({ project: entry, month: null })
    }
    return matches
  }).sort((a,b) => sort === 'oldest' ? (a.month?.id ?? '').localeCompare(b.month?.id ?? '') : (b.month?.id ?? '').localeCompare(a.month?.id ?? ''))

  function relatedPlan(entry, item) {
    return entry.months.find((candidate) => candidate.report?.next.month === item.label)
  }


  useEffect(() => {
    document.title = `${unknownProject ? 'Project unavailable' : project ? project.name : 'Projects'} · Lens`
  }, [unknownProject, project?.name])

  if (unknownProject) {
    return (
      <main id="main-content" tabIndex={-1} className="site-width missing-page">
        <h1>Project unavailable</h1>
        <Link to={projectsPath} className="text-link">Back to projects <ArrowRightIcon label="" /></Link>
      </main>
    )
  }

  if (!project) return <ProjectDashboard query={query} />

  function updateQuery(field, value) {
    const next = new URLSearchParams(params)
    next.delete('month')
    next.delete('project')
    if (!value || (field === 'sort' && value === 'newest')) next.delete(field)
    else next.set(field,value)
    setParams(next, { preventScrollReset: true })
  }

  return (
    <main id="main-content" tabIndex={-1} className="site-width library">
      <div className="page-heading directory-heading">
        <div><p className="page-eyebrow"><Link to={projectsPath}>Projects</Link><span aria-hidden="true"> / </span><span>Reports</span></p><h1>{project?.name ?? 'Projects'}</h1><p>{project?.description || 'Monthly reports for this project.'}</p></div>
        <div className="record-toolbar">
          <RecordEditor kind="report" project={project} onSaved={(_, data, monthId) => navigate(reportPath(project.id, monthId) + '?preview=1')} />
        </div>
      </div>
      <section aria-label="Available reports">
        <div className="project-report-toolbar">
          <span className="library-count" role="status">{rows.length} {rows.length === 1 ? 'record' : 'records'}</span>
          <div className="project-report-tools">
            {query && <Button variant="outline" className="action search-clear" onClick={() => updateQuery('q','')}><SearchIcon label="" />Clear “{query}”</Button>}
            <label className="report-sort"><span>Sort by</span><select aria-label="Sort reports" value={sort} onChange={event => updateQuery('sort',event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
          </div>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={`${project?.id ?? 'all'}:${sort}:${query}`} className="library-results" {...fade(reduced, 4)}>
            <table role="table" className="report-table" data-project-selected={Boolean(project)} aria-label="Monthly reports">
              <thead role="rowgroup"><tr role="row"><th scope="col">Report month</th><th scope="col">Status</th><th scope="col">Related plan</th><th scope="col" hidden={!workspace.canEdit}><span className="sr-only">Actions</span></th></tr></thead>
              <tbody role="rowgroup">
                {rows.map(({ project: entry, month: item }) => {
                  const plan = item && relatedPlan(entry, item)
                  const destination = item?.report || item?.draft
                    ? reportPath(entry.id, item.id) + (!item.report ? '?preview=1' : '')
                    : null
                  return <tr role="row" key={`${entry.id}:${item?.id ?? 'empty'}`} className={destination ? 'report-open-row' : undefined}
                    onClick={destination ? event => {
                      if (!event.currentTarget.contains(event.target) || event.target.closest('a, button, input, select, textarea, label')) return
                      if (!event.defaultPrevented && !window.getSelection()?.toString()) navigate(destination)
                    } : undefined}>
                    <td role="cell" data-label="Report month">{destination ? <Link to={destination} aria-label={`${entry.name} ${item.label} review`}>{item.label}</Link> : item?.label ?? 'No reports yet'}</td>
                    <td role="cell" data-label="Status">{item && <span className={`lozenge ${item.report ? 'success' : item.draft ? 'neutral' : 'pending'}`}>{item.report ? <SuccessIcon label="" size="small" /> : <ClockIcon label="" size="small" />}{item.draft ? item.report ? 'Published with draft changes' : 'Draft' : item.report ? 'Published' : 'Awaiting report'}</span>}</td>
                    <td role="cell" data-label="Related plan">{plan && <Link className="pending-link" to={reportPath(entry.id, plan.id, 'next-month')}>See plan <ArrowRightIcon label="" size="small" /></Link>}</td>
                    <td role="cell" data-label="Manage" hidden={!workspace.canEdit}>{item && <div className="row-actions">{(item.report || item.draft) && <RecordEditor compact kind="report" project={entry} month={item} onSaved={(_, data, id) => navigate(reportPath(entry.id, id) + '?preview=1')} />}<DeleteRecord project={entry} month={item} /></div>}</td>
                  </tr>
                })}
              </tbody>
            </table>
            {rows.length === 0 && <div className="empty-state"><SearchIllustration /><h2>{projects.length ? 'No matching reports' : 'Create your first project'}</h2><p>{projects.length ? 'Clear your search to see all reports for this project.' : 'Start with a project, then add a monthly review.'}</p>{projects.length > 0 && <Button variant="outline" className="action" onClick={() => updateQuery('q','')}>Clear search</Button>}</div>}
          </motion.div>
        </AnimatePresence>
      </section>
    </main>
  )
}

function ProjectDashboard({ query }) {
  const { workspace } = useWorkspace()
  const navigate = useNavigate()
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  const projects = workspace.projects.filter(project => {
    const searchable = [project.name, project.description, ...project.months.flatMap(month => [month.label, month.id, month.report?.title, month.draft?.title])].filter(Boolean).join(' ').toLowerCase()
    return terms.every(term => searchable.includes(term))
  })
  const months = workspace.projects.flatMap(project => project.months)
  const publishedCount = months.filter(month => month.report).length
  const draftCount = workspace.canEdit ? months.filter(month => month.draft).length : 0
  const pendingCount = months.filter(month => !month.report && !month.draft).length
  const trackedCount = months.length
  const coverage = trackedCount ? Math.round(publishedCount / trackedCount * 100) : 0
  const counters = [
    { label: 'Projects', count: workspace.projects.length },
    { label: 'Published reports', count: publishedCount },
    { label: workspace.canEdit ? 'Draft reports' : 'Awaiting reports', count: workspace.canEdit ? draftCount : pendingCount },
  ]
  return <main id="main-content" tabIndex={-1} className="site-width library project-dashboard">
    <div className="page-heading directory-heading">
      <div><p className="page-eyebrow">Workspace</p><h1>Projects</h1><p>Every project’s monthly reviews, with how much of the reporting is published.</p></div>
      <div className="record-toolbar"><RecordEditor kind="project" onSaved={(next, data) => {
        const saved = next.projects.find(project => project.name === data.name)
        if (saved) navigate(projectPath(saved.id))
      }} /></div>
    </div>
    <section className="portfolio-summary" aria-label="Project dashboard">
      <dl>{counters.map(({ label, count }) => <div key={label}><dt>{label}</dt><dd>{count}</dd></div>)}</dl>
      <div className="portfolio-coverage"><span>Reporting coverage</span><strong>{trackedCount ? `${coverage}%` : 'No reporting months'}</strong>
        <p>{trackedCount ? `${publishedCount} of ${trackedCount} reporting months published` : 'Create a reporting month to track coverage.'}</p>
        <progress max="100" value={coverage} aria-label="Reporting coverage" />
      </div>
    </section>
    <section aria-label="All projects" className="project-index">
      <div className="project-dashboard-results">
        <h2>All projects</h2>
        {query && <><span role="status">{projects.length} shown</span><Button variant="outline" className="action search-clear" onClick={() => navigate(projectsPath)}><SearchIcon label="" /> Clear “{query}”</Button></>}
      </div>
      {projects.length > 0 ? <table role="table" className="report-table" aria-label="Projects overview">
        <thead role="rowgroup"><tr role="row"><th scope="col">Project</th><th scope="col">Progress</th><th scope="col">Milestones</th><th scope="col">Reports</th><th scope="col">Latest publication</th><th scope="col"><span className="sr-only">Open project</span></th></tr></thead>
        <tbody role="rowgroup">{projects.map(project => {
          const published = project.months.filter(month => month.report).sort((first, second) => second.id.localeCompare(first.id))
          const drafts = project.months.filter(month => month.draft).length
          const progress = published[0]?.report.progress
          const completion = progress?.total ? Math.round(progress.projectCompleted / progress.total * 100) : 0
          const milestones = project.milestones ?? []
          const done = milestones.filter(item => item.status === 'completed').length
          return <tr role="row" key={project.id}>
            <td role="cell" data-label="Project"><Link className="project-cell" to={projectOverviewPath(project.id)}><ProjectMark project={project} /><strong>{project.name}</strong></Link>{project.description && <p className="project-description">{project.description}</p>}</td>
            <td role="cell" data-label="Progress"><div className="project-index-progress">{progress ? <><span>{completion}% · {progress.projectCompleted} / {progress.total} tasks</span><progress value={completion} max="100" aria-label={`${project.name} completion`} />{progress.runningHours != null && <small>{new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(progress.runningHours)} total hours</small>}</> : <span>Not reported</span>}</div></td>
            <td role="cell" data-label="Milestones">{milestones.length ? `${done} / ${milestones.length} done` : 'No milestones'}</td>
            <td role="cell" data-label="Reports"><span>{published.length} published</span>{workspace.canEdit && drafts > 0 && <span className="project-draft-count">{drafts} {drafts === 1 ? 'draft' : 'drafts'}</span>}</td>
            <td role="cell" data-label="Latest publication">{published[0]?.label ?? 'No published reports'}</td>
            <td role="cell" data-label="Open"><Link className="text-link" to={projectOverviewPath(project.id)} aria-label={`Open ${project.name}`}>Open project <ArrowRightIcon label="" /></Link></td>
          </tr>
        })}</tbody>
      </table> : <div className="empty-state">{query ? <SearchIllustration /> : <ChartIllustration />}<h2>{query ? 'No matching projects' : 'Create your first project'}</h2><p>{query ? 'Try a different project name or report title.' : 'Use Create project above to start your first monthly review.'}</p>{query && <Button variant="outline" className="action" onClick={() => navigate(projectsPath)}>Clear search</Button>}</div>}
    </section>
  </main>
}
