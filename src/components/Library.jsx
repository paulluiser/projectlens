import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, CalendarDays, Layers3 } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fade, useReducedMotion } from '@/lib/motion'
import { featured, projectPath, projects, projectsPath, reportPath } from '@/lib/reports.mjs'

function Filter({ label, value, options, onChange }) {
  const id = label.toLowerCase()
  return (
    <div className="library-filter">
      <label htmlFor={id}>{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="filter-trigger">
          <SelectValue />
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
  const reduced = useReducedMotion()
  const [params, setParams] = useSearchParams()
  const { projectId: pathProject } = useParams()
  const navigate = useNavigate()
  const projectId = pathProject ?? params.get('project')
  const project = projects.find((entry) => entry.id === projectId)
  const visibleProjects = project ? [project] : projects
  const months = [...new Map(visibleProjects.flatMap((entry) => entry.months.map((month) => [month.id, month.label])))]
    .sort(([first], [second]) => second.localeCompare(first))
  const monthId = params.get('month')
  const month = months.some(([id]) => id === monthId) ? monthId : null
  const rows = visibleProjects.flatMap((entry) => entry.months
    .filter((item) => !month || item.id === month)
    .map((item) => ({ project: entry, month: item })))

  useEffect(() => { document.title = 'Report library · Project Lens' }, [])

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
      <section className="library-intro">
        <p className="eyebrow"><span /> Monthly reviews</p>
        <h1>Report library</h1>
        <p>Choose a project and a month to find its review.</p>
      </section>
      <section aria-label="Available reports">
        <div className="library-filters">
          <Filter label="Project" value={project?.id ?? 'all'} onChange={(value) => updateFilter('project', value)}
            options={[{ value: 'all', label: 'All projects' }, ...projects.map((entry) => ({ value: entry.id, label: entry.name }))]} />
          <Filter label="Month" value={month ?? 'all'} onChange={(value) => updateFilter('month', value)}
            options={[{ value: 'all', label: 'All months' }, ...months.map(([value, label]) => ({ value, label }))]} />
          <span className="library-count" role="status">{rows.length} {rows.length === 1 ? 'month' : 'months'}</span>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={`${project?.id ?? 'all'}:${month ?? 'all'}`} className="library-results" {...fade(reduced, 8)}>
            {rows.map(({ project: entry, month: item }) => item.report ? (
              <Link className="library-row library-row-available" to={reportPath(entry.id, item.id)} key={`${entry.id}:${item.id}`}>
                <span className="library-icon"><Layers3 size={24} /></span>
                <span><span className="library-project">{entry.name}</span><strong>{item.label}</strong></span>
                <span className="library-status"><span className="status-dot" /> Review available</span>
                <ArrowUpRight className="library-arrow" size={21} />
              </Link>
            ) : (
              <div className="library-row" key={`${entry.id}:${item.id}`}>
                <span className="library-icon"><CalendarDays size={23} /></span>
                <span><span className="library-project">{entry.name}</span><strong>{item.label}</strong></span>
                <span className="library-status">Awaiting report</span>
                {entry.id === featured.project.id && item.label === featured.report.next.month && (
                  <Link className="text-link pending-link" to={reportPath(entry.id, featured.report.month, 'next-month')}>
                    See October plan <ArrowRight size={16} />
                  </Link>
                )}
              </div>
            ))}
            {rows.length === 0 && <p className="empty-state">There are no reports for this selection.</p>}
          </motion.div>
        </AnimatePresence>
      </section>
    </main>
  )
}
