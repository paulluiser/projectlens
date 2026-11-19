import { useEffect, useRef } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { landingPath, overviewPath, publicTabs } from '@/lib/routes.mjs'
import { ArrowRightIcon } from '@/components/ui/icons'
import { ProjectBrand } from './ProjectBrand'
import { PublicPage, workflow } from './PublicPage'

const reportChapters = [
  ['Progress', 'Planned work and completed tasks'],
  ['Accomplishments', 'What the team delivered'],
  ['Blockers', 'What needs attention'],
  ['Next month', 'Priorities, owners, and deadlines'],
]

export function Home({ page }) {
  const main = useRef(null)
  const home = page.id === 'home'

  useEffect(() => {
    document.title = home ? 'Project Lens · Monthly project reviews' : `${page.label} · Project Lens`
    window.scrollTo(0, 0)
    if (!home) main.current?.focus({ preventScroll: true })
  }, [home, page.label])

  return (
    <div className="public-site">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="public-header">
        <Link className="public-brand brand" to={landingPath} aria-label="Project Lens home"><ProjectBrand size={30} /></Link>
        <nav className="public-nav" aria-label="Main navigation">
          {publicTabs.map(tab => <NavLink key={tab.id} to={tab.path} end
            className={tab.id === page.id ? 'public-active' : undefined}
            aria-current={tab.id === page.id ? 'page' : undefined}>{tab.label}</NavLink>)}
        </nav>
      </header>
      <main id="main-content" ref={main} tabIndex={-1} className={home ? 'public-landing' : 'public-inner'}>
        {home ? <>
          <div className="landing-layout">
            <div className="landing-copy">
              <h1>Bring every month<br className="landing-title-break" /> into focus.</h1>
              <p className="landing-description">Review what moved forward, address what got in the way, and agree on the work ahead.</p>
              <div className="landing-actions">
                <Button asChild className="public-explore"><Link to={overviewPath}>Explore <ArrowRightIcon label="" /></Link></Button>
                <span>Monthly project reviews, in one place.</span>
              </div>
            </div>
            <section className="landing-report-outline" aria-label="Inside a monthly review">
              <div className="landing-report-heading"><span>Monthly review</span><span>Four chapters. One clear plan.</span></div>
              <ol>
                {reportChapters.map(([title, detail], index) => <li key={title}>
                  <span className="landing-chapter-number" aria-hidden="true">0{index + 1}</span>
                  <div><h2>{title}</h2><p>{detail}</p></div>
                </li>)}
              </ol>
            </section>
          </div>
          <section className="landing-method" aria-label="Monthly review workflow">
            <h2>A useful rhythm<br />for every month.</h2>
            <ul className="landing-workflow">
              {workflow.map(({ title, summary, section }) => <li key={title}>
                <Link to={publicTabs.find(tab => tab.id === section).path}>
                  <strong>{title}<ArrowRightIcon label="" /></strong><span>{summary}</span>
                </Link>
              </li>)}
            </ul>
          </section>
        </> : <PublicPage section={page.id} pageLabel={page.label} />}
      </main>
      <footer className="public-footer"><span>Project Lens</span><span>Monthly project reviews.</span></footer>
    </div>
  )
}
