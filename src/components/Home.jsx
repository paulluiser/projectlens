import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { landingPath, overviewPath, projectsPath, publicTabs } from '@/lib/routes.mjs'
import { ArrowRightIcon, BlockerIcon, CalendarIcon, ChecklistIcon, FocusIcon, MilestoneIcon, ProgressIcon, SearchIcon, ShareIcon } from '@/components/ui/icons'
import { ProjectBrand } from './ProjectBrand'
import { PublicPage } from './PublicPage'

/* The audiences named on the Use cases page; the headline retypes them like an edit in a terminal. */
const HERO_ROLES = ['project leads', 'delivery teams', 'stakeholders']

const features = [
  [ProgressIcon, 'Progress at a glance', 'Planned and completed tasks on one bar, with overall completion, hours and reporting compliance.'],
  [ChecklistIcon, 'Accomplishments that stick', 'Record what shipped each month, grouped by workstream, so the record outlasts the meeting.'],
  [BlockerIcon, 'Blockers with responses', 'Every blocker sits next to how the team responded, so nothing is raised without an answer.'],
  [CalendarIcon, 'Next month, dated', 'Priorities, owners and deadlines on an agenda with a compact calendar you can filter by day.'],
  [MilestoneIcon, 'Milestones in three views', 'A roadmap, a calendar and a list, each with owners, status and the source notes they came from.'],
  [ShareIcon, 'One link per publication', 'Drafts stay with editors. Publishing replaces the shared copy, and the link always opens the latest.'],
  [FocusIcon, 'Present it live', 'A reading mode for the meeting itself, chapter by chapter, on the same report everyone reads later.'],
  [SearchIcon, 'Find any month', 'Search every project and report, then pick up where you left off with your filters kept.'],
]

const stats = [
  ['4', 'Chapters in every monthly review'],
  ['3', 'Ways to see milestones: roadmap, calendar and list'],
  ['1', 'Shared link per publication, always the latest'],
]

export function useReducedMotionPreference() {
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return reduced
}

function RotatingRole() {
  const reduced = useReducedMotionPreference()
  const [text, setText] = useState(HERO_ROLES[0])
  const index = useRef(0)
  useEffect(() => {
    let busy = false
    const timers = []
    const id = window.setInterval(() => {
      if (busy || document.hidden) return
      const current = HERO_ROLES[index.current % HERO_ROLES.length]
      const next = HERO_ROLES[++index.current % HERO_ROLES.length]
      if (reduced) { setText(next); return }
      busy = true
      let i = current.length, j = 0
      const remove = () => { if (i >= 0) { setText(current.slice(0, i--)); timers.push(window.setTimeout(remove, 22)); return } type() }
      const type = () => { if (j <= next.length) { setText(next.slice(0, j++)); timers.push(window.setTimeout(type, 38)); return } busy = false }
      remove()
    }, 2400)
    return () => { clearInterval(id); timers.forEach(clearTimeout) }
  }, [reduced])
  return <span className="lx-role">{text}</span>
}

/* Figures resolve from random characters, left to right, once the row is in view. Monospace keeps widths steady;
   screen readers get the final text and reduced motion skips the effect. */
const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789'
function useInView() {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element || seen || typeof IntersectionObserver === 'undefined') { if (!seen) setSeen(true); return }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setSeen(true); observer.disconnect() } }, { threshold: .4 })
    observer.observe(element)
    return () => observer.disconnect()
  }, [seen])
  return [ref, seen]
}

function Scramble({ text, run, delay = 0, duration = 700, className }) {
  const reduced = useReducedMotionPreference()
  const [out, setOut] = useState(() => reduced ? text : text.replace(/\S/g, ' '))
  useEffect(() => {
    if (reduced) { setOut(text); return }
    if (!run) return
    let frame = 0
    const start = performance.now() + delay
    const tick = now => {
      const progress = Math.min(1, Math.max(0, (now - start) / duration))
      const done = Math.floor(progress * text.length)
      setOut(now < start ? text.replace(/\S/g, ' ') : text.split('').map((c, i) => i < done || c === ' ' ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0]).join(''))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [run, text, delay, duration, reduced])
  return <span className={className}><span className="sr-only">{text}</span><span aria-hidden="true" className="lx-scramble">{out}</span></span>
}

function Landing() {
  const [statsRef, statsSeen] = useInView()
  return <>
    <section className="lx-hero" aria-labelledby="lx-title">
      <h1 id="lx-title" className="lx-title">
        <span className="sr-only">Bring every month into focus for project leads, delivery teams and stakeholders</span>
        <span aria-hidden="true">Bring every month into focus for<br /><RotatingRole /><span className="lx-cursor" /></span>
      </h1>
      <p className="lx-lede">Monthly project reviews in four chapters: what moved forward, what the team delivered, what got in the way, and the work ahead.</p>
      <div className="lx-actions">
        <Button asChild size="lg" className="lx-primary"><Link to={overviewPath}>Open the workspace <ArrowRightIcon label="" /></Link></Button>
        <Button asChild size="lg" variant="outline" className="lx-secondary"><Link to={`${landingPath}/how-it-works`}>See how it works</Link></Button>
      </div>
      <p className="lx-meta">Progress · Accomplishments · Blockers · Next month</p>
    </section>

    <section className="lx-section lx-features" aria-labelledby="lx-features-title">
      <div className="lx-features-intro">
        <p className="lx-eyebrow">What you get</p>
        <h2 id="lx-features-title">One place for every project’s monthly review</h2>
        <p>Each review follows the same four chapters, so teams know where to look and stakeholders can open a shared link and go straight to what they need.</p>
      </div>
      <dl className="lx-feature-grid">
        {features.map(([Icon, title, detail]) => <div key={title} className="lx-feature">
          <span className="lx-feature-icon" aria-hidden="true"><Icon label="" size="small" /></span>
          <dt>{title}</dt>
          <dd>{detail}</dd>
        </div>)}
      </dl>
    </section>

    <section className="lx-section" aria-label="Lens in figures">
      <div ref={statsRef} className="lx-stats">
        {stats.map(([value, label], i) => <div key={label}>
          <Scramble text={value} run={statsSeen} delay={i * 140} duration={520} className="lx-stat-value" />
          <Scramble text={label} run={statsSeen} delay={i * 140 + 160} duration={760} className="lx-stat-label" />
        </div>)}
      </div>
    </section>
  </>
}

export function CallToAction() {
  return <section className="lx-section lx-cta-wrap" aria-labelledby="lx-cta-title">
    <div className="lx-cta">
      <span className="lx-badge">Ready when you are</span>
      <h2 id="lx-cta-title">Open this month’s review</h2>
      <p>Pick a project, choose a month and read the four chapters, or present them in the meeting.</p>
      <div className="lx-actions">
        <Button asChild size="lg" className="lx-cta-primary"><Link to={overviewPath}>Open the workspace <ArrowRightIcon label="" /></Link></Button>
        <Button asChild size="lg" variant="outline" className="lx-cta-secondary"><Link to={projectsPath}>Browse projects</Link></Button>
      </div>
    </div>
  </section>
}

function Footer() {
  return <footer className="lx-footer">
    <div className="lx-footer-grid">
      <div><p className="lx-footer-brand"><ProjectBrand size={22} /></p><p className="lx-footer-copy">Monthly project reviews for software teams: progress, accomplishments, blockers and the plan for next month.</p></div>
      <nav aria-label="Product"><p>Product</p>{publicTabs.filter(tab => tab.id !== 'home').map(tab => <Link key={tab.id} to={tab.path}>{tab.label}</Link>)}</nav>
      <nav aria-label="Workspace"><p>Workspace</p><Link to={overviewPath}>Overview</Link><Link to={projectsPath}>Projects</Link></nav>
      <div><p>Sharing</p><span>Drafts stay with editors</span><span>Shared links open the published review</span></div>
    </div>
    <p className="lx-copyright">© {new Date().getFullYear()} <span translate="no">Lens</span></p>
  </footer>
}

export function Home({ page }) {
  const main = useRef(null)
  const home = page.id === 'home'

  useEffect(() => {
    document.title = home ? 'Lens · Monthly project reviews' : `${page.label} · Lens`
    window.scrollTo(0, 0)
    if (!home) main.current?.focus({ preventScroll: true })
  }, [home, page.label])

  return (
    <div className="public-site lx">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="lx-header">
        <div className="lx-header-inner">
          <Link className="lx-brand" to={landingPath} aria-label="Lens home"><ProjectBrand size={24} /></Link>
          <nav className="lx-nav" aria-label="Main navigation">
            {publicTabs.map(tab => <NavLink key={tab.id} to={tab.path} end
              aria-current={tab.id === page.id ? 'page' : undefined}>{tab.label}</NavLink>)}
          </nav>
          <div className="lx-header-end"><Button asChild variant="outline" size="sm" className="lx-header-action"><Link to={overviewPath}>Open workspace</Link></Button></div>
        </div>
      </header>
      <main id="main-content" ref={main} tabIndex={-1} className={home ? 'public-landing' : 'public-inner'}>
        {home ? <Landing /> : <PublicPage section={page.id} pageLabel={page.label} />}
        <CallToAction />
      </main>
      <Footer />
    </div>
  )
}
