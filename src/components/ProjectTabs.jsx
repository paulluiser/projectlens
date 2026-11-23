import { NavLink, useLocation } from 'react-router-dom'
import { projectSections } from '@/lib/routes.mjs'
import { projectSection, sectionIcons } from './ProjectNav'

export function ProjectTabs({ projectId }) {
  const { pathname } = useLocation()
  const current = projectSection(pathname, projectId)
  return <nav className="project-tabs" aria-label="Project sections">
    {projectSections.map(section => {
      const Icon = sectionIcons[section.id]
      return <NavLink key={section.id} to={section.path(projectId)} end aria-current={current === section.id ? 'page' : undefined}>
        <Icon label="" /> {section.label}
      </NavLink>
    })}
  </nav>
}
