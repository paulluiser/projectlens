import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ProjectMark } from './ProjectMark'
import { useWorkspace } from '@/lib/workspace'
import { projectPath, projectSections } from '@/lib/routes.mjs'
import { ChartIcon, CalendarIcon, ChevronDownIcon, FlagIcon, PlanIcon } from '@/components/ui/icons'

export const sectionIcons = { overview: ChartIcon, reports: CalendarIcon, milestones: FlagIcon, weekly: PlanIcon }

// Which section of a project a path belongs to: report months and chapters count as Reports.
export function projectSection(pathname, projectId) {
  const base = projectPath(projectId)
  if (pathname !== base && !pathname.startsWith(base + '/')) return null
  const rest = pathname.slice(base.length + 1)
  if (['overview', 'milestones', 'weekly'].includes(rest)) return rest
  return 'reports'
}

export function ProjectNav() {
  const { pathname } = useLocation()
  const { workspace } = useWorkspace()
  const projects = workspace?.projects ?? []
  const active = projects.find(project => projectSection(pathname, project.id))?.id
  const [open, setOpen] = useState(() => new Set(active ? [active] : []))
  useEffect(() => { if (active) setOpen(previous => previous.has(active) ? previous : new Set([...previous, active])) }, [active])
  if (!projects.length) return null
  const toggle = id => setOpen(previous => { const next = new Set(previous); next.has(id) ? next.delete(id) : next.add(id); return next })

  return (
    <div className="sidebar-project-group">
      <p className="sidebar-group-label" id="sidebar-projects-label">Projects</p>
      <ul className="sidebar-projects" aria-labelledby="sidebar-projects-label">
        {projects.map(project => {
          const current = projectSection(pathname, project.id)
          const expanded = open.has(project.id)
          const listId = `sidebar-sections-${project.id}`
          return (
            <li key={project.id} className="sidebar-project" data-current={current ? '' : undefined}>
              <button type="button" className="sidebar-project-toggle" aria-expanded={expanded} aria-controls={listId} onClick={() => toggle(project.id)}>
                <ProjectMark project={project} /><span className="sidebar-project-name">{project.name}</span><ChevronDownIcon label="" size="small" />
              </button>
              <ul id={listId} className="sidebar-sections" hidden={!expanded} aria-label={`${project.name} sections`}>
                {projectSections.map(section => {
                  const Icon = sectionIcons[section.id]
                  const here = current === section.id
                  const exact = pathname === section.path(project.id)
                  return <li key={section.id}>
                    <Link className="sidebar-link sidebar-section-link" to={section.path(project.id)} aria-current={here ? (exact ? 'page' : 'location') : undefined}>
                      <Icon label="" size="small" />{section.label}
                    </Link>
                  </li>
                })}
              </ul>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
