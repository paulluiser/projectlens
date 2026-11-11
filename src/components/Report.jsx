import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useIsPresent } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, ChevronRight, Maximize2, Minimize2,
} from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  BlockersCopy, ChapterGraphic, ChapterDetails, PlanCopy, ProgressCopy, ProgressVisual, WinsCopy,
} from './Chapters'
import { LensOptic } from './LensOptic'
import { chapters, findReport, projectPath, projects, projectsPath, reportPath, stepChapter } from '@/lib/reports.mjs'
import { easing, fade, useReducedMotion } from '@/lib/motion'

const copyByChapter = {
  progress: ProgressCopy,
  accomplishments: WinsCopy,
  blockers: BlockersCopy,
  'next-month': PlanCopy,
}

function ChapterPane(props) {
  const isPresent = useIsPresent()
  return <motion.div inert={!isPresent} {...props} />
}

function ChapterNavigation({ project, report, activeId, reduced }) {
  const nav = useRef(null)
  const [indicator, setIndicator] = useState(null)

  useLayoutEffect(() => {
    const element = nav.current
    const active = element.querySelector('[aria-current="page"]')

    function measure() {
      const x = active.offsetLeft
      const width = active.offsetWidth
      setIndicator((previous) => previous?.x === x && previous.width === width ? previous : { x, width })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    for (const link of element.querySelectorAll('a')) observer.observe(link)
    return () => observer.disconnect()
  }, [activeId])

  return (
    <div className="chapter-navigation">
      <span className="report-period"><CalendarDays size={16} /> {report.label}</span>
      <nav ref={nav} aria-label="Report chapters" className="chapter-nav">
        {chapters.map((entry) => (
          <Link key={entry.id} to={reportPath(project.id, report.month, entry.id)}
            aria-current={entry.id === activeId ? 'page' : undefined}>
            {entry.label}
          </Link>
        ))}
        {indicator && <motion.span className="chapter-indicator" initial={false} animate={indicator}
          transition={{ duration: reduced ? 0 : 0.39, ease: easing }} aria-hidden="true" />}
      </nav>
    </div>
  )
}

function ReportUnavailable({ project, month }) {
  useEffect(() => { document.title = 'Review unavailable · Project Lens' }, [])
  return (
    <main className="site-width missing-page" id="main-content" tabIndex={-1}>
      <h1>{month ? `${month.label} review` : 'Review unavailable'}</h1>
      {month && <p>The {project.name} report for this month is awaiting content.</p>}
      <Link className="text-link" to={projectsPath}>Back to the report library <ArrowRight size={16} /></Link>
    </main>
  )
}

export function Report() {
  const { projectId, monthId, chapterId } = useParams()
  const project = projects.find((entry) => entry.id === projectId)
  const month = project?.months.find((item) => item.id === monthId)
  const report = findReport(projectId, monthId)
  if (!report) return <ReportUnavailable project={project} month={month} />
  const chapterIndex = chapters.findIndex((chapter) => chapter.id === chapterId)
  if (chapterIndex === -1) return <Navigate replace to={reportPath(projectId, monthId)} />
  return <ReportReader key={`${projectId}:${monthId}`} project={project} report={report} chapterIndex={chapterIndex} />
}

function ReportReader({ project, report, chapterIndex }) {
  const reduced = useReducedMotion()
  const isPresent = useIsPresent()
  const navigate = useNavigate()
  const [presenting, setPresenting] = useState(false)
  const lastIndex = useRef(chapterIndex)
  const chapter = chapters[chapterIndex]
  const focusedChapter = useRef(chapter.id)
  const Copy = copyByChapter[chapter.id]
  const previous = stepChapter(chapter.id, -1)
  const next = stepChapter(chapter.id, 1)
  const direction = chapterIndex >= lastIndex.current ? 1 : -1
  const nextPath = next ? reportPath(project.id, report.month, next) : null
  const previousPath = previous ? reportPath(project.id, report.month, previous) : null
  const focusChapter = useCallback((node) => {
    if (!node || focusedChapter.current === chapter.id) return
    focusedChapter.current = chapter.id
    const heading = node.querySelector('h1')
    if (heading) {
      heading.tabIndex = -1
      heading.focus({ preventScroll: true })
    }
  }, [chapter.id])

  useEffect(() => {
    document.title = `${chapter.label} · ${project.name} · ${report.label}`
    if (lastIndex.current !== chapterIndex) {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    lastIndex.current = chapterIndex
  }, [chapter.label, chapterIndex, project.name, report.label])

  useEffect(() => {
    if (!isPresent) return

    function onKey(event) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [role="combobox"], [contenteditable]')) return
      if (event.key === 'Escape' && presenting) {
        setPresenting(false)
        return
      }
      const target = event.key === 'ArrowLeft' ? previousPath : event.key === 'ArrowRight' ? nextPath : null
      if (target) {
        event.preventDefault()
        navigate(target)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isPresent, navigate, nextPath, presenting, previousPath])

  const transition = { duration: reduced ? 0 : 0.39, ease: easing }
  const copyMotion = {
    enter: (step) => ({ opacity: reduced ? 1 : 0, x: reduced ? 0 : step * 24 }),
    show: { opacity: 1, x: 0 },
    exit: (step) => ({ opacity: reduced ? 1 : 0, x: reduced ? 0 : step * -18, transition: { ...transition, duration: reduced ? 0 : 0.16 } }),
  }

  return (
    <main className="site-width report-shell" id="main-content" tabIndex={-1} data-presenting={presenting}>
      <div className="report-context">
        <nav className="report-crumb" aria-label="Report location">
          <Link to={projectsPath}>Report library</Link>
          <ChevronRight size={14} />
          <Link to={projectPath(project.id)}>{project.name}</Link>
        </nav>
        <Button type="button" variant="outline" className="action present-button" aria-pressed={presenting}
          onClick={() => setPresenting((active) => !active)}>
          {presenting ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          {presenting ? 'Exit presentation' : 'Present'}
        </Button>
      </div>

      <ChapterNavigation project={project} report={report} activeId={chapter.id} reduced={reduced} />

      <div className="chapter-grid">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <ChapterPane className="chapter-copy" key={chapter.id} ref={focusChapter} custom={direction}
            variants={copyMotion} initial="enter" animate="show" exit="exit" transition={transition}>
            <p className="eyebrow"><span /> {chapter.label}</p>
            <Copy report={report} />
          </ChapterPane>
        </AnimatePresence>

        <div className="chapter-stage">
          <AnimatePresence mode="sync" custom={direction}>
            <ChapterPane className="stage-content" key={chapter.id} custom={direction}
              initial={reduced ? false : { opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduced ? undefined : { opacity: 0, scale: 0.98 }}
              transition={{ duration: reduced ? 0 : 0.45, ease: easing }}>
              {chapter.id === 'progress' ? <ProgressVisual report={report} reduced={reduced} /> : <ChapterGraphic chapter={chapter} report={report} />}
            </ChapterPane>
          </AnimatePresence>
          <LensOptic chapter={chapterIndex} reduced={reduced} />
        </div>
      </div>

      <div className="chapter-controls">
        {previousPath
          ? <Button asChild variant="outline" className="action chapter-back"><Link to={previousPath}><ArrowLeft size={17} /> Previous</Link></Button>
          : <Button variant="outline" className="action chapter-back" disabled><ArrowLeft size={17} /> Previous</Button>}
        <p aria-live="polite"><strong>{chapterIndex + 1}</strong><span> / {chapters.length}</span></p>
        <Button asChild className="action action-primary chapter-next">
          {nextPath ? <Link to={nextPath}>Next <ArrowRight size={17} /></Link>
            : <Link to={projectsPath}>Report library <ArrowUpRight size={17} /></Link>}
        </Button>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {(chapter.id === 'progress' || chapter.id === 'next-month') && (
          <ChapterPane key={chapter.id} {...fade(reduced, 5)}>
            <ChapterDetails chapter={chapter.id} report={report} reduced={reduced} />
          </ChapterPane>
        )}
      </AnimatePresence>
      <p className="report-source">Source · {report.source}</p>
    </main>
  )
}
