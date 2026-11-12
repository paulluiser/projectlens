import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { landingPath, overviewPath, publicTabs } from '@/lib/routes.mjs'
import { ArrowRightIcon } from '@/components/ui/icons'
import { easing, useReducedMotion } from '@/lib/motion'
import { LandingOrb } from './LandingOrb'
import { OrbLoader } from './LoadingScreen'
import { ProjectBrand } from './ProjectBrand'
import { PublicPage, workflow } from './PublicPage'

const landingCopyMotion = {
  hidden: { opacity: 0, y: 12 },
  visible: index => ({
    opacity: 1, y: 0,
    transition: { duration: .42, delay: .1 + index * .075, ease: easing },
  }),
  leaving: index => ({
    opacity: 0, y: 6,
    transition: { duration: .15, delay: (3 - index) * .025, ease: 'easeIn' },
  }),
}

const landingOrbMotion = {
  hidden: { opacity: 0, scale: .94 },
  visible: { opacity: 1, scale: 1, transition: { duration: .48, ease: easing } },
  leaving: { opacity: 1, scale: 1 },
}

export function Home({ page }) {
  const reduced = useReducedMotion()
  const navigate = useNavigate()
  const [entering, setEntering] = useState(false)
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

  return (
    <div className="public-site">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="public-header" inert={entering}>
        <Link className="public-brand brand" to={landingPath} aria-label="Project Lens home"><ProjectBrand size={38} /></Link>
        <nav className="public-nav" aria-label="Main navigation">
          {publicTabs.map(tab => <NavLink key={tab.id} to={tab.path} end
            className={tab.id === page.id ? 'public-active' : undefined}
            aria-current={tab.id === page.id ? 'page' : undefined}>{tab.label}</NavLink>)}
        </nav>
      </header>
      <main id="main-content" ref={main} tabIndex={-1} className={home ? 'public-landing' : 'public-inner'} inert={entering}>
        {home ? <motion.div className="landing-layout" initial={reduced ? false : 'hidden'} animate={entering ? 'leaving' : 'visible'}>
          <motion.div className="landing-orb-reveal" variants={reduced ? undefined : landingOrbMotion} aria-hidden="true">
            <motion.div className="landing-orb" animate={{ scale: entering ? 7 : 1 }} transition={{ duration: .72, ease: easing }}>
              <LandingOrb reduced={reduced} />
            </motion.div>
          </motion.div>
          <div className="landing-copy">
            <h1>
              <motion.span className="landing-statement" variants={reduced ? undefined : landingCopyMotion} custom={0}>
                Bring every <span>month into <em>focus</em></span>
              </motion.span>
            </h1>
            <motion.p className="landing-description" variants={reduced ? undefined : landingCopyMotion} custom={1}>
              Plan, track, and turn monthly goals into progress.
            </motion.p>
            <motion.div className="landing-actions" variants={reduced ? undefined : landingCopyMotion} custom={2}>
              <Button asChild className="public-explore"><Link to={overviewPath} onClick={explore}>Explore <ArrowRightIcon label="" /></Link></Button>
            </motion.div>
            <motion.ul className="landing-workflow" aria-label="Monthly review workflow" variants={reduced ? undefined : landingCopyMotion} custom={3}>
              {workflow.map(({ title, Icon, summary, section }) => <li key={title}>
                <Link to={publicTabs.find(tab => tab.id === section).path}>
                  <span className="landing-workflow-icon" aria-hidden="true"><Icon label="" /></span>
                  <span><strong>{title}</strong><small>{summary}</small></span>
                </Link>
              </li>)}
            </motion.ul>
          </div>
        </motion.div> : <PublicPage section={page.id} pageLabel={page.label} />}
      </main>
      {entering && <motion.div className="landing-entry-veil" role="status"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .28, duration: .44 }}
        onAnimationComplete={() => navigate(overviewPath, { state: { fromLanding: true } })}>
        <OrbLoader /><span>Opening workspace…</span>
      </motion.div>}
    </div>
  )
}
