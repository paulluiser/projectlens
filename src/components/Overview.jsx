import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRightIcon, CalendarIcon } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { WorkspaceNotice, useWorkspace } from '@/lib/workspace'
import { projectsPath, reportPath } from '@/lib/routes.mjs'
import { ProjectMark } from './ProjectMark'

export function Overview() {
  useEffect(() => { document.title = 'Overview · Project Lens' }, [])
  return <WorkspaceNotice><OverviewContent /></WorkspaceNotice>
}

function OverviewContent() {
  const { workspace } = useWorkspace()
  const recent = workspace.projects
    .flatMap(project => project.months.filter(month => month.report).map(month => ({ project, month })))
    .sort((first, second) => second.month.id.localeCompare(first.month.id)
      || (second.month.publishedAt ?? '').localeCompare(first.month.publishedAt ?? ''))
    .slice(0, 6)

  return (
    <main id="main-content" tabIndex={-1} className="site-width workspace-overview">
      <header className="overview-header">
        <div><h1>Overview</h1><p>Pick up with the latest published reviews.</p></div>
        <Button asChild className="action action-primary"><Link to={projectsPath}>Browse projects</Link></Button>
      </header>
      <section className="overview-recent" aria-labelledby="recent-reviews">
        <h2 id="recent-reviews">Recent reviews</h2>
        {recent.length ? (
          <ul>
            {recent.map(({ project, month }) => (
              <li key={project.id + ':' + month.id}>
                <Link to={reportPath(project.id, month.id)}>
                  <ProjectMark project={project} />
                  <span className="overview-review-name"><strong>{project.name}</strong><span>{month.report.title}</span></span>
                  <span className="overview-month">{month.label}</span>
                  <ArrowRightIcon label="" />
                </Link>
              </li>
            ))}
          </ul>
        ) : <div className="overview-empty"><CalendarIcon label="" /><p>Published reviews will appear here.</p></div>}
      </section>
    </main>
  )
}
