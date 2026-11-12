import { ProjectMark } from './ProjectMark'
import { Link, useLocation } from 'react-router-dom'
import { useWorkspace } from '@/lib/workspace'
import { projectPath } from '@/lib/routes.mjs'

export function ProjectNav() {
  const { pathname } = useLocation()
  const { workspace } = useWorkspace()
  const projects = workspace?.projects ?? []
  if (!projects.length) return null
  return (
    <div className="sidebar-project-group">
      <p className="sidebar-group-label">Your projects</p>
      <ul className="sidebar-projects" aria-label="Available projects">
        {projects.map((project) => {
          const path = projectPath(project.id)
          const active = pathname === path || pathname.startsWith(path + '/')
          return (
            <li key={project.id}>
              <Link to={path} className="sidebar-link" aria-current={active ? 'location' : undefined}>
                <ProjectMark project={project} />{project.name}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
