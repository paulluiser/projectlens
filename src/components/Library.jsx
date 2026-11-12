import { ProjectMark } from './ProjectMark'
import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRightIcon, ProjectIcon, SearchIcon, SuccessIcon, ClockIcon, CalendarIcon, ChartIcon } from '@/components/ui/icons'
import { Link, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fade, useReducedMotion } from '@/lib/motion'
import { useWorkspace, WorkspaceNotice } from '@/lib/workspace'
import { RecordEditor, DeleteRecord, EditorAccess } from './RecordEditor'
import { projectPath, projectsPath, reportPath } from '@/lib/routes.mjs'

function Filter({ Icon, label, value, options, onChange }) {
  const id = label.toLowerCase()
  return (
    <div className="library-filter">
      <label htmlFor={id}>{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="filter-trigger">
          <span className="filter-value"><Icon label="" /><SelectValue /></span>
        </SelectTrigger>
        <SelectContent position="popper">
          {options.map(({ value: option, label: title }) => (
            <SelectItem key={option} value={option}>{title}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

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
  const months = [...new Map(visibleProjects.flatMap((entry) => entry.months.map((month) => [month.id, month.label])))]
    .sort(([first], [second]) => second.localeCompare(first))
  const query = params.get('q')?.trim() ?? ''
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  const monthId = params.get('month')
  const month = months.some(([id]) => id === monthId) ? monthId : null
  const rows = visibleProjects.flatMap((entry) => {
    const matches = entry.months
      .filter((item) => {
        const searchable = `${entry.name} ${item.label} ${item.id} ${(item.draft ?? item.report)?.title ?? ''}`.toLowerCase()
        return (!month || item.id === month) && terms.every((term) => searchable.includes(term))
      })
      .map((item) => ({ project: entry, month: item }))
    if (entry.months.length === 0 && !month && terms.every((term) => entry.name.toLowerCase().includes(term))) {
      matches.push({ project: entry, month: null })
    }
    return matches
  })

  function relatedPlan(entry, item) {
    return entry.months.find((candidate) => candidate.report?.next.month === item.label)
  }


  useEffect(() => {
    document.title = `${unknownProject ? 'Project unavailable' : project ? project.name : 'Projects'} · Project Lens`
  }, [unknownProject, project?.name])

  if (unknownProject) {
    return (
      <main id="main-content" tabIndex={-1} className="site-width missing-page">
        <h1>Project unavailable</h1>
        <Link to={projectsPath} className="text-link">Back to the report library <ArrowRightIcon label="" /></Link>
      </main>
    )
  }

  if (!project) return <ProjectDashboard query={query} />

  function updateFilter(field, value) {
    const next = new URLSearchParams(params)
    if (value === 'all') next.delete(field)
    else next.set(field, value)

    if (field === 'project') {
      const selection = projects.find((entry) => entry.id === value)
      if (selection && !selection.months.some((item) => item.id === next.get('month'))) next.delete('month')
      next.delete('project')
      const query = next.toString()
      navigate((selection ? projectPath(selection.id) : projectsPath) + (query ? `?${query}` : ''))
      return
    }
    setParams(next, { preventScrollReset: true })
  }

  return (
    <main id="main-content" tabIndex={-1} className="site-width library">
      <div className="page-heading directory-heading">
        <span className="section-icon"><ProjectIcon label="" /></span>
        <div><h1>{project?.name ?? 'Projects'}</h1><p>{project?.description || 'Find a monthly report by project and month.'}</p></div>
        <div className="record-toolbar">
          <EditorAccess />
          <RecordEditor kind="project" project={project} onSaved={(next, data) => {
            const saved = project ?? next.projects.find((entry) => entry.name === data.name)
            if (saved) navigate(projectPath(saved.id))
          }} />
          {project && <><RecordEditor kind="report" project={project} onSaved={(_, data, monthId) => navigate(reportPath(project.id, monthId) + '?preview=1')} /><DeleteRecord project={project} onDeleted={() => navigate(projectsPath)} /></>}
        </div>
      </div>
      <section aria-label="Available reports">
        <div className="library-filters">
          <Filter Icon={ProjectIcon} label="Project" value={project?.id ?? 'all'} onChange={(value) => updateFilter('project', value)}
            options={[{ value: 'all', label: 'All projects' }, ...projects.map((entry) => ({ value: entry.id, label: entry.name }))]} />
          <Filter Icon={CalendarIcon} label="Month" value={month ?? 'all'} onChange={(value) => updateFilter('month', value)}
            options={[{ value: 'all', label: 'All months' }, ...months.map(([value, label]) => ({ value, label }))]} />
          {query && <Button variant="outline" className="action search-clear" onClick={() => updateFilter('q', 'all')}>
            <SearchIcon label="" /> Clear “{query}”
          </Button>}
          <span className="library-count" role="status">{rows.length} {rows.length === 1 ? 'record' : 'records'}</span>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={`${project?.id ?? 'all'}:${month ?? 'all'}:${query}`} className="library-results" {...fade(reduced, 4)}>
            <table role="table" className="report-table" data-project-selected={Boolean(project)} aria-label="Monthly reports">
              <thead role="rowgroup"><tr role="row"><th scope="col">Project</th><th scope="col">Report month</th><th scope="col">Status</th><th scope="col">Related plan</th><th scope="col" hidden={!workspace.canEdit}><span className="sr-only">Actions</span></th></tr></thead>
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
                    <td role="cell" data-label="Project"><span className="project-cell"><ProjectMark project={entry} />{entry.name}</span></td>
                    <td role="cell" data-label="Report month">{destination ? <Link to={destination} aria-label={`${entry.name} ${item.label} review`}>{item.label}</Link> : item?.label ?? 'No reports yet'}</td>
                    <td role="cell" data-label="Status">{item && <span className={`lozenge ${item.report ? 'success' : 'neutral'}`}>{item.report ? <SuccessIcon label="" size="small" /> : <ClockIcon label="" size="small" />}{item.draft ? item.report ? 'Published with draft changes' : 'Draft' : item.report ? 'Published' : 'Awaiting report'}</span>}</td>
                    <td role="cell" data-label="Related plan">{plan && <Link className="pending-link" to={reportPath(entry.id, plan.id, 'next-month')}>See plan <ArrowRightIcon label="" size="small" /></Link>}</td>
                    <td role="cell" data-label="Manage" hidden={!workspace.canEdit}><div className="row-actions">{item ? <><RecordEditor compact kind="report" project={entry} month={item} onSaved={(_, data, id) => navigate(reportPath(entry.id, id) + '?preview=1')} /><DeleteRecord project={entry} month={item} /></> : <RecordEditor kind="report" project={entry} onSaved={(_, data, monthId) => navigate(reportPath(entry.id, monthId) + '?preview=1')} />}</div></td>
                  </tr>
                })}
              </tbody>
            </table>
            {rows.length === 0 && <div className="empty-state"><h2>{projects.length ? 'No matching reports' : 'Create your first project'}</h2><p>{projects.length ? 'Choose another project or month, or clear your search.' : 'Start with a project, then add a monthly review.'}</p>{projects.length > 0 && <Button variant="outline" className="action" onClick={() => navigate(projectsPath)}>Clear all filters</Button>}</div>}
          </motion.div>
        </AnimatePresence>
      </section>
    </main>
  )
}

function ProjectDashboard({ query }) {
  const reduced = useReducedMotion()
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
    { label: 'Projects', count: workspace.projects.length, Icon: ProjectIcon, tone: 'blue' },
    { label: 'Published reports', count: publishedCount, Icon: SuccessIcon, tone: 'green' },
    { label: workspace.canEdit ? 'Draft reports' : 'Awaiting reports', count: workspace.canEdit ? draftCount : pendingCount, Icon: ClockIcon, tone: 'amber' },
  ]
  return <main id="main-content" tabIndex={-1} className="site-width library project-dashboard">
    <div className="page-heading directory-heading">
      <span className="section-icon"><ProjectIcon label="" /></span>
      <div><h1>Projects</h1></div>
      <div className="record-toolbar"><EditorAccess /><RecordEditor kind="project" onSaved={(next, data) => {
        const saved = next.projects.find(project => project.name === data.name)
        if (saved) navigate(projectPath(saved.id))
      }} /></div>
    </div>
    <section className="portfolio-metrics" aria-label="Project dashboard">
      <div className="portfolio-feature">
        <div className="portfolio-feature-copy">
          <span><ChartIcon label="" /> Reporting coverage</span>
          <strong>{trackedCount ? `${coverage}%` : '—'}</strong>
          <p>{trackedCount ? `${publishedCount} of ${trackedCount} reporting months published` : 'Create a reporting month to track coverage.'}</p>
        </div>
        <motion.div className="portfolio-dial" aria-hidden="true" style={{ '--coverage': `${coverage}%` }}
          initial={reduced ? false : { opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduced ? 0 : .45 }} />
      </div>
      {counters.map(({ label, count, Icon, tone }, index) => (
        <motion.div className="portfolio-counter" data-tone={tone} key={label}
          initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : .24, delay: reduced ? 0 : index * .045 }}>
          <span className="portfolio-icon"><Icon label="" /></span>
          <strong>{count}</strong><span>{label}</span>
        </motion.div>
      ))}
    </section>
    <section aria-label="All projects" className="project-index">
      <div className="project-dashboard-results">
        <h2>All projects</h2>
        {query && <><span role="status">{projects.length} shown</span><Button variant="outline" className="action search-clear" onClick={() => navigate(projectsPath)}><SearchIcon label="" /> Clear “{query}”</Button></>}
      </div>
      {projects.length > 0 ? <table role="table" className="report-table" aria-label="Projects overview">
        <thead role="rowgroup"><tr role="row"><th scope="col">Project</th><th scope="col">Reports</th><th scope="col">Latest publication</th><th scope="col"><span className="sr-only">Open project</span></th></tr></thead>
        <tbody role="rowgroup">{projects.map(project => {
          const published = project.months.filter(month => month.report).sort((first, second) => second.id.localeCompare(first.id))
          const drafts = project.months.filter(month => month.draft).length
          return <tr role="row" key={project.id}>
            <td role="cell" data-label="Project"><Link className="project-cell" to={projectPath(project.id)}><ProjectMark project={project} /><strong>{project.name}</strong></Link>{project.description && <p className="project-description">{project.description}</p>}</td>
            <td role="cell" data-label="Reports"><span>{published.length} published</span>{workspace.canEdit && drafts > 0 && <span className="project-draft-count">{drafts} {drafts === 1 ? 'draft' : 'drafts'}</span>}</td>
            <td role="cell" data-label="Latest publication">{published[0]?.label ?? 'No published reports'}</td>
            <td role="cell" data-label="Open"><Link className="text-link" to={projectPath(project.id)} aria-label={`Open ${project.name}`}>Open project <ArrowRightIcon label="" /></Link></td>
          </tr>
        })}</tbody>
      </table> : <div className="empty-state"><h2>{query ? 'No matching projects' : 'Create your first project'}</h2><p>{query ? 'Try a different project name or report title.' : 'Use Create project above to start your first monthly review.'}</p>{query && <Button variant="outline" className="action" onClick={() => navigate(projectsPath)}>Clear search</Button>}</div>}
    </section>
  </main>
}
