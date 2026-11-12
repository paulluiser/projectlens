import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { AnimatePresence, MotionConfig, motion, useIsPresent } from 'framer-motion'
import { ArrowDownRightIcon, ProjectsIcon, HomeIcon, SidebarIcon, SearchIcon } from '@/components/ui/icons'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { LoadingScreen, OrbLoader, SidebarSkeleton } from './components/LoadingScreen'
import { Home } from './components/Home'
import { ProjectBrand } from './components/ProjectBrand'
import { Overview } from './components/Overview'
import { landingPath, overviewPath, projectsPath, publicTabs, reportPath } from './lib/routes.mjs'
import { fade, useReducedMotion } from './lib/motion'
import { useWorkspace, WorkspaceProvider } from './lib/workspace'

const Library = lazy(() => import('./components/Library').then(({ Library }) => ({ default: Library })))
const Report = lazy(() => import('./components/Report').then(({ Report }) => ({ default: Report })))

const ProjectNav = lazy(() => import('./components/ProjectNav').then(({ ProjectNav }) => ({ default: ProjectNav })))
const mobileSidebar = matchMedia('(max-width: 760px), (max-height: 500px) and (pointer: coarse) and (max-width: 1050px)')

function subscribeToSidebarBreakpoint(listener) {
  mobileSidebar.addEventListener('change', listener)
  return () => mobileSidebar.removeEventListener('change', listener)
}

function Header({ expanded, onToggle, onNavigate, narrow }) {
  const navigate = useNavigate()
  const location = useLocation()
  const search = new URLSearchParams(location.search).get('q') ?? ''
  const searchInput = useRef(null)
  const searchToggle = useRef(null)
  const [searchOpen, setSearchOpen] = useState(false)
  useEffect(() => { if (searchOpen) searchInput.current?.focus() }, [searchOpen])
  useEffect(() => { setSearchOpen(false) }, [location.pathname, location.search])

  useEffect(() => {
    if (searchInput.current) searchInput.current.value = search
  }, [search])

  function findReports(event) {
    event.preventDefault()
    const query = new FormData(event.currentTarget).get('q').trim()
    onNavigate()
    setSearchOpen(false)
    navigate(query ? `${projectsPath}?${new URLSearchParams({ q: query })}` : projectsPath)
  }

  return (
    <header className="site-header" data-search-open={searchOpen}>
      <div className="header-brand">
        <button type="button" className="icon-button" id="sidebar-toggle" aria-label={expanded ? 'Hide sidebar' : 'Show sidebar'}
          aria-controls="workspace-sidebar" aria-expanded={expanded} onClick={onToggle}>
          <SidebarIcon label="" />
        </button>
        <Link className="brand" to={landingPath} aria-label="Project Lens home" onClick={onNavigate}>
          <ProjectBrand />
        </Link>
      </div>
      <button ref={searchToggle} type="button" className="icon-button mobile-search-toggle" aria-label={searchOpen ? 'Close search' : 'Open search'} aria-controls="global-search-form" aria-expanded={searchOpen} onClick={() => { onNavigate(); setSearchOpen(value => !value) }}><SearchIcon label="" /></button>
      <form id="global-search-form" className="global-search" role="search" onSubmit={findReports} onKeyDown={event => { if (event.key === 'Escape' && narrow) { event.preventDefault(); setSearchOpen(false); searchToggle.current?.focus() } }}>
        <SearchIcon label="" aria-hidden="true" />
        <input ref={searchInput} name="q" type="search" aria-label="Search projects and reports" placeholder="Search projects and reports…" defaultValue={search} enterKeyHint="search" />
        <button type="submit" className="icon-button search-submit" aria-label="Submit search"><ArrowDownRightIcon label="" /></button>
      </form>
    </header>
  )
}

function Sidebar({ showProjects, onNavigate, modal, onClose }) {
  return (
    <aside className="site-sidebar" id="workspace-sidebar" role={modal ? 'dialog' : undefined} aria-modal={modal || undefined} aria-label={modal ? 'Navigation' : undefined}>
      <div className="mobile-drawer-heading"><strong>Navigation</strong><button type="button" className="icon-button" aria-label="Close navigation" onClick={onClose}><SidebarIcon label="" /></button></div>
      <nav aria-label="Main navigation" onClick={(event) => {
        if (event.target.closest('a')) onNavigate()
      }}>
        <p className="sidebar-group-label">Workspace</p>
        <NavLink className="sidebar-link" to={overviewPath} end><HomeIcon label="" /> Overview</NavLink>
        <NavLink className="sidebar-link" to={projectsPath} end><ProjectsIcon label="" /> Projects</NavLink>
        {showProjects && <Suspense fallback={<SidebarSkeleton />}><ProjectNav /></Suspense>}
      </nav>
    </aside>
  )
}

function MissingPage() {
  useEffect(() => { document.title = 'Page unavailable · Project Lens' }, [])
  return (
    <main id="main-content" tabIndex={-1} className="site-width missing-page">
      <h1>Page unavailable</h1>
      <Link className="text-link" to={projectsPath}>Open the report library <ArrowDownRightIcon label="" /></Link>
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

function RouteFrame({ page, location, reduced, covered }) {
  const frame = useRef(null)
  const isPresent = useIsPresent()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (page !== landingPath) frame.current?.focus({ preventScroll: true })
  }, [page])

  return (
    <motion.div ref={frame} tabIndex={-1} inert={!isPresent || covered} className="route-frame" {...fade(reduced, 6)}>
      <Suspense fallback={<LoadingScreen />}>
        <Routes location={location}>
          <Route path={overviewPath} element={<Overview />} />
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

function WorkspaceEntry() {
  const { workspace, error } = useWorkspace()
  return (
    <AnimatePresence initial={false}>
      {!workspace && !error && <motion.div className="workspace-entry-veil" role="status" exit={{ opacity: 0 }} transition={{ duration: .25 }}>
        <OrbLoader /><span>Opening workspace…</span>
      </motion.div>}
    </AnimatePresence>
  )
}

export function App() {
  const location = useLocation()
  useEffect(() => {
    const pauseMotion = () => { document.documentElement.dataset.motionPaused = String(document.hidden) }
    pauseMotion()
    document.addEventListener('visibilitychange', pauseMotion)
    return () => { document.removeEventListener('visibilitychange', pauseMotion); delete document.documentElement.dataset.motionPaused }
  }, [])
  const reduced = useReducedMotion()
  const narrow = useSyncExternalStore(subscribeToSidebarBreakpoint, () => mobileSidebar.matches)
  const mode = narrow ? 'mobile' : 'desktop'
  const [sidebars, setSidebars] = useState({ mobile: false, desktop: true })
  const expanded = sidebars[mode]
  const toggleSidebar = () => setSidebars((state) => ({ ...state, [mode]: !state[mode] }))
  const dismissMobileSidebar = () => {
    if (narrow) setSidebars((state) => ({ ...state, mobile: false }))
  }

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape' && expanded && narrow) {
        setSidebars((state) => ({ ...state, mobile: false }))
        document.getElementById('sidebar-toggle')?.focus()
        return
      }
      if (event.ctrlKey && event.key === '[') {
        event.preventDefault()
        setSidebars((state) => ({ ...state, [mode]: !state[mode] }))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded, mode, narrow])

  useEffect(() => {
    if (!narrow || !expanded) return
    const drawer = document.getElementById('workspace-sidebar')
    if (!drawer) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusable = () => [drawer.querySelector('[aria-label="Close navigation"]'), ...drawer.querySelectorAll('a[href]')].filter(Boolean)
    focusable()[0]?.focus()
    function trapFocus(event) {
      if (event.key !== 'Tab' || document.querySelector('.editor-dialog')) return
      const elements = focusable()
      const first = elements[0], last = elements.at(-1)
      if (event.shiftKey && (document.activeElement === first || !drawer.contains(document.activeElement))) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && (document.activeElement === last || !drawer.contains(document.activeElement))) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', trapFocus)
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', trapFocus); document.getElementById('sidebar-toggle')?.focus() }
  }, [narrow, expanded, location.pathname])

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    function updateViewport() {
      document.documentElement.style.setProperty('--visible-viewport-height', `${viewport.height}px`)
      document.documentElement.style.setProperty('--visible-viewport-top', `${viewport.offsetTop}px`)
    }
    updateViewport()
    viewport.addEventListener('resize', updateViewport)
    viewport.addEventListener('scroll', updateViewport)
    return () => {
      viewport.removeEventListener('resize', updateViewport); viewport.removeEventListener('scroll', updateViewport)
      document.documentElement.style.removeProperty('--visible-viewport-height'); document.documentElement.style.removeProperty('--visible-viewport-top')
    }
  }, [])

  const path = location.pathname.replace(/\/$/, '') || '/'
  const relative = path.startsWith(projectsPath + '/') ? path.slice(projectsPath.length + 1) : ''
  const page = relative.includes('/') ? 'report' : relative ? projectsPath : path

  const publicPage = publicTabs.find(tab => tab.path === (path === '/' ? landingPath : path))
  if (publicPage) return <Home key={publicPage.id} page={publicPage} />

  return (
    <WorkspaceProvider active={path === overviewPath || path === projectsPath || relative !== '' || path.startsWith('/reports')}>
    <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <div className="workspace" data-sidebar={expanded}>
        {path === overviewPath && location.state?.fromLanding && !reduced && <WorkspaceEntry />}
        <Header narrow={narrow} expanded={expanded} onToggle={toggleSidebar} onNavigate={dismissMobileSidebar} />
        <Sidebar modal={narrow && expanded} onClose={dismissMobileSidebar} showProjects={path === overviewPath || path === projectsPath || relative !== ''} onNavigate={dismissMobileSidebar} />
        {expanded && <button className="sidebar-scrim" type="button" aria-label="Close sidebar" onClick={toggleSidebar} />}
        <AnimatePresence mode="wait" initial={false}>
          <RouteFrame key={page} page={page} location={location} reduced={reduced} covered={expanded && narrow} />
        </AnimatePresence>
      </div>
    </MotionConfig>
    </WorkspaceProvider>
  )
}
