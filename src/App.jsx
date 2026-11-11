import { lazy, Suspense, useEffect, useRef } from 'react'
import { AnimatePresence, MotionConfig, motion, useIsPresent } from 'framer-motion'
import { Aperture, ArrowDownRight, ArrowUpRight, Layers3 } from 'lucide-react'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { Home } from './components/Home'
import { landingPath, projectsPath, reportPath } from './lib/routes.mjs'
import { fade, useReducedMotion } from './lib/motion'

const Library = lazy(() => import('./components/Library').then(({ Library }) => ({ default: Library })))
const Report = lazy(() => import('./components/Report').then(({ Report }) => ({ default: Report })))

function Header() {
  return (
    <header className="site-header">
      <div className="site-width header-content">
        <Link className="brand" to={landingPath} aria-label="Project Lens home">
          <span className="brand-mark"><Aperture size={20} strokeWidth={2.1} /></span>
          <span>Project Lens</span>
        </Link>
        <nav aria-label="Main navigation" className="header-nav">
          <NavLink className="header-link" to={projectsPath} end>
            <Layers3 size={16} /> <span>Report library</span>
          </NavLink>
        </nav>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="site-footer site-width">
      <Link to={landingPath} className="footer-brand"><Aperture size={17} /> Project Lens</Link>
      <Link to={projectsPath}>Report library <ArrowUpRight size={15} /></Link>
    </footer>
  )
}

function MissingPage() {
  useEffect(() => { document.title = 'Page unavailable · Project Lens' }, [])
  return (
    <main id="main-content" tabIndex={-1} className="site-width missing-page">
      <h1>Page unavailable</h1>
      <Link className="text-link" to={projectsPath}>Open the report library <ArrowDownRight size={17} /></Link>
    </main>
  )
}

function LegacyReport() {
  const { projectId, monthId, chapterId } = useParams()
  const { search } = useLocation()
  return <Navigate replace to={reportPath(projectId, monthId, chapterId) + search} />
}

function LegacyLibrary() {
  const { search } = useLocation()
  return <Navigate replace to={projectsPath + search} />
}

function RouteFrame({ page, location, reduced }) {
  const frame = useRef(null)
  const isPresent = useIsPresent()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (page !== landingPath) frame.current?.focus({ preventScroll: true })
  }, [page])

  return (
    <motion.div ref={frame} tabIndex={-1} inert={!isPresent} className="route-frame" {...fade(reduced, 6)}>
      <Suspense fallback={<p className="site-width page-loading" role="status">Loading review…</p>}>
        <Routes location={location}>
          <Route path="/" element={<Navigate replace to={landingPath} />} />
          <Route path={landingPath} element={<Home />} />
          <Route path={`${projectsPath}/:projectId?`} element={<Library />} />
          <Route path={`${projectsPath}/:projectId/:monthId/:chapterId?`} element={<Report />} />
          <Route path="/reports" element={<LegacyLibrary />} />
          <Route path="/reports/:projectId/:monthId/:chapterId?" element={<LegacyReport />} />
          <Route path="*" element={<MissingPage />} />
        </Routes>
      </Suspense>
    </motion.div>
  )
}

export function App() {
  const location = useLocation()
  const reduced = useReducedMotion()
  const path = location.pathname.replace(/\/$/, '') || '/'
  const relative = path.startsWith(projectsPath + '/') ? path.slice(projectsPath.length + 1) : ''
  const page = relative.includes('/') ? 'report' : relative ? projectsPath : path

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Header />
      <AnimatePresence mode="wait" initial={false}>
        <RouteFrame key={page} page={page} location={location} reduced={reduced} />
      </AnimatePresence>
      <Footer />
    </MotionConfig>
  )
}
