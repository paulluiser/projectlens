import { NavLink } from 'react-router-dom'
import { CalendarIcon, FlagIcon } from '@/components/ui/icons'
import { milestonesPath, projectPath } from '@/lib/routes.mjs'

export function ProjectTabs({ projectId }) {
  return <nav className="project-tabs" aria-label="Project sections">
    <NavLink to={projectPath(projectId)} end><CalendarIcon label="" /> Reports</NavLink>
    <NavLink to={milestonesPath(projectId)} end><FlagIcon label="" /> Milestones</NavLink>
  </nav>
}
