import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { landingPath, overviewPath, publicTabs } from '@/lib/routes.mjs'
import { ArrowRightIcon } from '@/components/ui/icons'
import { easing, useReducedMotion } from '@/lib/motion'
import { LandingTerrain } from './LandingTerrain'
import { ContourLoader } from './LoadingScreen'
import { ProjectBrand } from './ProjectBrand'
import { PublicPage } from './PublicPage'

// Generic chapter labels only: the landing page never loads project data.
const chapterKey = [
  { title: 'Progress', summary: 'Ground covered and what remains' },
  { title: 'Accomplishments', summary: 'What the team delivered' },
  { title: 'Blockers', summary: 'Where work slowed, and the response' },
  { title: 'Next month', summary: 'Owners and deadlines ahead' },
]

const reveal = {
  hidden: { opacity: 0, y: 14 },
  visible: index => ({ opacity: 1, y: 0, transition: { duration: .5, delay: .08 + index * .08, ease: easing } }),
  leaving: { opacity: 0, y: -6, transition: { duration: .18, ease: 'easeIn' } },
}

export function Home({ page }) {
  const reduced = useReducedMotion()
  const navigate = useNavigate()
  const [entering, setEntering] = useState(false)
  const [chapter, setChapter] = useState(0)
  const main = useRef(null)
  const home = page.id === 'home'

  useEffect(() => {
    document.title = home ? 'Project Lens · Monthly project reviews' : `${page.label} · Project Lens`
    window.scrollTo(0, 0)
    if (!home) main.current?.focus({ preventScroll: true })
  }, [home, page.label])

  function explore(event) {
    if (reduced || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    if (!entering) setEntering(true)
  }

  const variant = reduced ? undefined : reveal
  return (
    <div className="public-site">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="public-header" inert={entering}>
        <Link className="public-brand brand" to={landingPath} aria-label="Project Lens home"><ProjectBrand size={32} /></Link>
        <nav className="public-nav" aria-label="Main navigation">
          {publicTabs.map(tab => <NavLink key={tab.id} to={tab.path} end
            className={tab.id === page.id ? 'public-active' : undefined}
            aria-current={tab.id === page.id ? 'page' : undefined}>{tab.label}</NavLink>)}
        </nav>
      </header>
      <main id="main-content" ref={main} tabIndex={-1} className={home ? 'public-landing' : 'public-inner'} inert={entering}>
        {home ? <motion.div className="landing-layout" initial={reduced ? false : 'hidden'} animate={entering ? 'leaving' : 'visible'}>
          <div className="landing-copy">
            <motion.h1 className="landing-statement" variants={variant} custom={0}>Walk your team through the month.</motion.h1>
            <motion.p className="landing-description" variants={variant} custom={1}>
              Each monthly review follows the same four chapters. Present it live, then share the link so anyone can return to the part they need.
            </motion.p>
            <motion.div className="landing-actions" variants={variant} custom={2}>
              <Button asChild className="public-explore"><Link to={overviewPath} onClick={explore}>Open the workspace <ArrowRightIcon label="" /></Link></Button>
            </motion.div>
          </div>
          <motion.figure className="landing-map" variants={variant} custom={1.5}>
            <motion.div animate={{ scale: entering ? 1.06 : 1 }} transition={{ duration: .6, ease: easing }}>
              <LandingTerrain active={chapter} reduced={reduced} />
            </motion.div>
            <figcaption className="sr-only">Illustration: a review route across a survey map, with one marker per chapter.</figcaption>
            <ol className="landing-key" aria-label="The four review chapters">
              {chapterKey.map(({ title, summary }, index) => <li key={title}>
                <button type="button" aria-pressed={chapter === index} onClick={() => setChapter(index)} onMouseEnter={() => setChapter(index)} onFocus={() => setChapter(index)}>
                  <b aria-hidden="true">{index + 1}</b><strong>{title}</strong><span>{summary}</span>
                </button>
              </li>)}
            </ol>
          </motion.figure>
        </motion.div> : <PublicPage section={page.id} pageLabel={page.label} />}
      </main>
      {entering && <motion.div className="landing-entry-veil" role="status"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .22, duration: .36 }}
        onAnimationComplete={() => navigate(overviewPath, { state: { fromLanding: true } })}>
        <ContourLoader /><span>Opening workspace…</span>
      </motion.div>}
    </div>
  )
}
