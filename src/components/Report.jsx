import { ProjectMark } from './ProjectMark'
import { ProjectBrand } from './ProjectBrand'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useIsPresent } from 'framer-motion'
import { ProgressIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpRightIcon, CalendarIcon, ChevronRightIcon, BlockerIcon, MilestoneIcon, MaximizeIcon, MinimizeIcon, PlanIcon } from '@/components/ui/icons'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  BlockersCopy, ProgressCopy, ProgressMetrics, ProgressVisual, TaskComparison, WinsCopy,
} from './Chapters'
import { useMetricReveal } from './AnimatedMetric'
import { MonthComparison, CommitmentOutcomes, PublishReport, ShareReport } from './ReviewTools'
import { NextMonthPlan } from './NextMonthPlan'
import { useWorkspace, WorkspaceNotice } from '@/lib/workspace'
import { RecordEditor, DeleteRecord, EditorAccess } from './RecordEditor'
import { chapters, libraryReturnPath, projectPath, projectsPath, reportPath, stepChapter } from '@/lib/routes.mjs'
import { easing, fade, useReducedMotion } from '@/lib/motion'

const chapterIcons = [ProgressIcon, MilestoneIcon, BlockerIcon, PlanIcon]

const copyByChapter = {
  accomplishments: WinsCopy,
  blockers: BlockersCopy,
  'next-month': NextMonthPlan,
}

function ChapterPane(props) {
  const isPresent = useIsPresent()
  return <motion.div inert={!isPresent} {...props} />
}

function ProgressChapter({ report, project, reduced }) {
  const elapsed = useMetricReveal(reduced)
  return <>
    <div className="progress-bento">
      <section className="workspace-panel chapter-stage"><ProgressVisual report={report} project={project} reduced={reduced} elapsed={elapsed} /></section>
      <section className="workspace-panel progress-month">
        <h2>{report.coverLine}</h2>
        <TaskComparison report={report} reduced={reduced} elapsed={elapsed} />
        <ProgressMetrics report={report} elapsed={elapsed} />
      </section>
      <ProgressCopy report={report} reduced={reduced} elapsed={elapsed} />
      <MonthComparison report={report} project={project} elapsed={elapsed} />
    </div>
    <CommitmentOutcomes report={report} />
  </>
}

// Concentric contours around the project summit; rings already climbed are drawn in contour orange.
function ContourRings({ completion, reduced }) {
  const rings = 10
  const climbed = Math.round(completion / 100 * rings)
  return <svg className="presentation-orbit" viewBox="0 0 200 200" aria-hidden="true">
    {Array.from({ length: rings }, (_, index) => {
      const radius = 96 - index * 9
      const points = Array.from({ length: 40 }, (_, step) => {
        const angle = step / 40 * Math.PI * 2
        const wobble = 1 + .06 * Math.sin(angle * 3 + index * .7) + .04 * Math.cos(angle * 5 - index)
        return `${(100 + Math.cos(angle) * radius * wobble).toFixed(1)} ${(100 + Math.sin(angle) * radius * wobble).toFixed(1)}`
      })
      return <motion.path key={index} d={`M${points.join('L')}Z`} data-walked={index < climbed || undefined}
        initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduced ? 0 : index * .04 }} />
    })}
  </svg>
}

function ChapterNavigation({ project, month, activeId, suffix }) {
  const nav = useRef(null)

  useLayoutEffect(() => {
    const element = nav.current
    const active = element.querySelector('[aria-current="page"]')

    function measure() {
      const x = active.offsetLeft
      const width = active.offsetWidth

      const scroller = element.parentElement
      const left = scroller.scrollLeft
      const right = left + scroller.clientWidth
      if (x < left) scroller.scrollLeft = x
      else if (x + width > right) scroller.scrollLeft = x + width - scroller.clientWidth
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    for (const link of element.querySelectorAll('a')) observer.observe(link)
    return () => observer.disconnect()
  }, [activeId])

  return (
    <div className="chapter-navigation">
      <nav ref={nav} aria-label="Report chapters" className="chapter-nav">
        {chapters.map((entry, index) => {
          const Icon = chapterIcons[index]
          return (
            <Link key={entry.id} to={reportPath(project.id, month.id, entry.id) + suffix}
              aria-current={entry.id === activeId ? 'page' : undefined}>
              <Icon label="" /> {entry.label}
              {entry.id === activeId && <motion.span className="chapter-marker" layoutId="chapter-marker" transition={{ duration: .3, ease: easing }} aria-hidden="true" />}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

function ReportUnavailable({ project, month }) {
  const navigate = useNavigate()
  useEffect(() => { document.title = 'Review unavailable · Project Lens' }, [])
  return (
    <main className="site-width missing-page" id="main-content" tabIndex={-1}>
      <h1>{month ? `${month.label} review` : 'Review unavailable'}</h1>
      {month && <p>The {project.name} report for this month is awaiting content.</p>}
      <Link className="text-link" to={libraryReturnPath()}>Back to the report library <ArrowRightIcon label="" /></Link>
      {project && <div className="record-toolbar"><EditorAccess /><RecordEditor kind="report" project={project} month={month} onSaved={(_, data, id) => navigate(reportPath(project.id, id) + '?preview=1')} />{month?.draft && <Link className="text-link" to={reportPath(project.id, month.id) + '?preview=1'}>Preview saved draft</Link>}</div>}
    </main>
  )
}

export function Report() {
  return <WorkspaceNotice><LoadedReport /></WorkspaceNotice>
}

function LoadedReport() {
  const { workspace } = useWorkspace()
  const projects = workspace.projects
  const { projectId, monthId, chapterId } = useParams()
  const project = projects.find((entry) => entry.id === projectId)
  const month = project?.months.find((item) => item.id === monthId)
  const [params] = useSearchParams()
  const preview = workspace.canEdit && params.get('preview') === '1'
  const report = preview ? month?.draft ?? month?.report : month?.report
  if (!report) return <ReportUnavailable project={project} month={month} />
  const chapterIndex = chapters.findIndex((chapter) => chapter.id === chapterId)
  if (chapterIndex === -1) return <Navigate replace to={reportPath(projectId, monthId) + (preview ? '?preview=1' : '')} />
  return <ReportReader key={`${projectId}:${monthId}`} project={project} month={month} report={report} preview={preview} chapterIndex={chapterIndex} />
}

function ReportReader({ project, month, report, chapterIndex, preview }) {
  const { workspace } = useWorkspace()
  const libraryReturn = libraryReturnPath()
  const [viewParams] = useSearchParams()
  const presenting = viewParams.get('present') === '1'
  const presentationHome = presenting && viewParams.get('view') !== 'chapter'
  const readerSuffix = preview ? '?preview=1' : ''
  const presentationSuffix = preview ? '?preview=1&present=1' : '?present=1'
  const suffix = presenting ? presentationSuffix + '&view=chapter' : readerSuffix
  const [ended, setEnded] = useState(false)
  const endHeading = useRef(null)
  useEffect(() => { if (ended) endHeading.current?.focus() }, [ended])
  const reduced = useReducedMotion()
  const isPresent = useIsPresent()
  const navigate = useNavigate()
  const lastIndex = useRef(chapterIndex)
  const chapter = chapters[chapterIndex]
  const focusedChapter = useRef(chapter.id)
  const Copy = copyByChapter[chapter.id]
  const currentPath = reportPath(project.id, month.id, chapter.id)
  const presentationHeading = useRef(null)
  useEffect(() => {
    if (presentationHome) {
      window.scrollTo({ top: 0, behavior: 'instant' })
      presentationHeading.current?.focus({ preventScroll: true })
    }
  }, [presentationHome])
  const previous = stepChapter(chapter.id, -1)
  const next = stepChapter(chapter.id, 1)
  const direction = chapterIndex >= lastIndex.current ? 1 : -1
  const nextPath = next ? reportPath(project.id, month.id, next) + suffix : null
  const previousPath = previous ? reportPath(project.id, month.id, previous) + suffix : null
  const focusChapter = useCallback((node) => {
    if (!node || focusedChapter.current === chapter.id) return
    focusedChapter.current = chapter.id
    const heading = node.querySelector('h2')
    if (heading) {
      heading.tabIndex = -1
      heading.focus({ preventScroll: true })
    }
  }, [chapter.id])

  useEffect(() => {
    document.title = `${chapter.label} · ${project.name} · ${month.label}`
    if (lastIndex.current !== chapterIndex) {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    setEnded(false)
    lastIndex.current = chapterIndex
  }, [chapter.label, chapterIndex, project.name, month.label])

  useEffect(() => {
    if (!isPresent) return

    function onKey(event) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (document.getElementById('main-content')?.closest('[inert]')) return
      if (document.querySelector('[role="dialog"]')) return
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [role="combobox"], [contenteditable]')) return
      if (event.key === 'Escape' && presenting) {
        setEnded(false)
        navigate(currentPath + readerSuffix, { replace: true })
        return
      }
      if (presentationHome) {
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          navigate(reportPath(project.id, month.id) + suffix)
        }
        return
      }
      if (event.target instanceof Element && event.target.closest('[data-chapter-controls]')) return
      const target = event.key === 'ArrowLeft' ? previousPath : event.key === 'ArrowRight' ? nextPath : null
      if (target) {
        event.preventDefault()
        navigate(target)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isPresent, navigate, nextPath, presenting, previousPath, presentationHome, currentPath, readerSuffix, suffix, project.id, month.id])

  const transition = { duration: reduced ? 0 : 0.24, ease: easing }
  const copyMotion = {
    enter: (step) => ({ opacity: reduced ? 1 : 0, x: reduced ? 0 : step * 24 }),
    show: { opacity: 1, x: 0 },
    exit: (step) => ({ opacity: reduced ? 1 : 0, x: reduced ? 0 : step * -18, transition: { ...transition, duration: reduced ? 0 : 0.16 } }),
  }

  if (presentationHome) {
    const { projectCompleted, total } = report.progress
    const completion = total ? Math.round(projectCompleted / total * 100) : 0
    const chapterSummaries = [
      `${report.progress.completed} tasks completed this month`,
      `${report.wins.length} ${report.wins.length === 1 ? 'accomplishment' : 'accomplishments'}`,
      `${report.blockers.length} ${report.blockers.length === 1 ? 'blocker' : 'blockers'} reported`,
      `${report.next.items.length} planned ${report.next.items.length === 1 ? 'action' : 'actions'}`,
    ]
    return (
      <main className="site-width report-shell presentation-index" id="main-content" data-presenting="true">
        <div className="presentation-topbar">
          <div className="presentation-brand"><ProjectBrand size={28} /></div>
          <Button variant="outline" className="action" onClick={() => navigate(currentPath + readerSuffix, { replace: true })}>Exit presentation</Button>
        </div>
        <div className="presentation-stage">
          <motion.header className="presentation-hero" {...fade(reduced, 12)}>
            <p>{month.label}{preview && ' · Draft'}</p>
            <h1 ref={presentationHeading} tabIndex={-1}>{project.name}</h1>
            <Button asChild className="action action-primary">
              <Link to={reportPath(project.id, month.id) + suffix}>Start review <ArrowRightIcon label="" /></Link>
            </Button>
          </motion.header>
          <motion.div className="presentation-reading" {...fade(reduced, 8)}>
            <ContourRings completion={completion} reduced={reduced} />
            <div className="presentation-figure">
              <strong>{total ? `${completion}%` : '—'}</strong>
              <span>Project completion</span>
              <span>{projectCompleted} of {total} tasks</span>
            </div>
          </motion.div>
        </div>
        <nav className="presentation-directory" aria-label="Presentation chapters">
          {chapters.map((entry, index) => {
            const Icon = chapterIcons[index]
            return <motion.div key={entry.id} initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : index * .055 }}>
              <Link className="presentation-tile" data-chapter={entry.id} to={reportPath(project.id, month.id, entry.id) + suffix}>
                <Icon label="" /><strong>{entry.label}</strong><ArrowUpRightIcon label="" />
                <span>{chapterSummaries[index]}</span>
              </Link>
            </motion.div>
          })}
        </nav>
      </main>
    )
  }

  return (
    <main className="site-width report-shell" id="main-content" tabIndex={-1} data-presenting={presenting}>
      <header className="report-header">
        <nav className="report-crumb" aria-label="Report location">
          <Link to={libraryReturn}>Projects</Link>
          <ChevronRightIcon label="" />
          <Link to={projectPath(project.id)}>{project.name}</Link>
        </nav>
        <div className="report-workflow"><span className={`lozenge ${preview ? 'neutral' : 'success'}`}>{preview ? 'Draft preview (editors only)' : 'Published review'}</span>{month.publishedAt && <span>Published {new Date(month.publishedAt).toLocaleString()}</span>}{workspace.canEdit && month.draft && !preview && <Link className="text-link" to={reportPath(project.id, month.id, chapter.id) + '?preview=1'}>Preview draft</Link>}{preview && month.report && <Link className="text-link" to={reportPath(project.id, month.id, chapter.id)}>View published version</Link>}{preview && <PublishReport project={project} month={month} onPublished={() => navigate(reportPath(project.id, month.id, chapter.id))} />}</div>
        <div className="report-context">
          <div className="report-title">
            <ProjectMark project={project} />
            <h1>{project.name}</h1>
            <label className="report-period"><CalendarIcon label="" /><span className="sr-only">Report month</span><select value={month.id} onChange={event => { const selected = project.months.find(item => item.id === event.target.value); const query = new URLSearchParams()
            if (preview || (selected?.draft && !selected.report)) query.set('preview', '1')
            if (presenting) { query.set('present', '1'); query.set('view', 'chapter') }
            navigate(reportPath(project.id, event.target.value, chapter.id) + (query.size ? `?${query}` : '')) }}>{project.months.map(item => <option key={item.id} value={item.id}>{item.label}{item.draft && !item.report ? ' (draft)' : ''}</option>)}</select></label>
          </div>
          <div className="record-toolbar">
            {!presenting && <><RecordEditor kind="report" project={project} month={month} onSaved={(_, data, id) => navigate(reportPath(project.id, id, chapter.id) + '?preview=1')} />
            <ShareReport projectId={project.id} monthId={month.id} chapterId={chapter.id} published={Boolean(month.report)} />
            <DeleteRecord project={project} month={month} onDeleted={() => navigate(projectPath(project.id))} /></>}
            <Button type="button" variant="outline" className="action present-button" aria-pressed={presenting}
              onClick={() => {
                setEnded(false)
                navigate(currentPath + (presenting ? readerSuffix : presentationSuffix), { replace: presenting })
              }}>
              {presenting ? <MinimizeIcon label="" /> : <MaximizeIcon label="" />}
              {presenting ? 'Exit presentation' : 'Present'}
            </Button>
          </div>
        </div>
      </header>
      <div className="report-workbench">
        <div className="report-rail">
          <ChapterNavigation project={project} month={month} activeId={chapter.id} suffix={suffix} />

          {presenting && <Link className="text-link presentation-back" to={currentPath + presentationSuffix}><ArrowLeftIcon label="" /> Presentation overview</Link>}
        </div>
        <div className="report-reading">
          {ended && <section className="workspace-panel review-ended"><h2 ref={endHeading} tabIndex={-1}>Review complete</h2><p>You’ve reached the end of {month.label}. Revisit the plan or return to the report library.</p><Button className="action" variant="outline" onClick={() => setEnded(false)}>Revisit the plan</Button><Button className="action action-primary" onClick={() => navigate(libraryReturn)}>Return to library</Button></section>}
          <div hidden={ended}>
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <ChapterPane className="chapter-content" key={chapter.id} ref={focusChapter} custom={direction}
                variants={copyMotion} initial="enter" animate="show" exit="exit" transition={transition}>
                {chapter.id === 'progress' ? (
                  <ProgressChapter key={`${project.id}:${month.id}`} report={report} project={project} reduced={reduced} />
                ) : <Copy report={report} reduced={reduced} />}
              </ChapterPane>
            </AnimatePresence>

            <div className="chapter-controls">
              {previousPath
                ? <Button asChild variant="outline" className="action chapter-back"><Link to={previousPath}><ArrowLeftIcon label="" /> Previous</Link></Button>
                : <Button variant="outline" className="action chapter-back" disabled><ArrowLeftIcon label="" /> Previous</Button>}
              {nextPath ? <Button asChild className="action action-primary chapter-next"><Link to={nextPath}>Next <ArrowRightIcon label="" /></Link></Button> : <Button className="action action-primary chapter-next" onClick={() => { setEnded(true); window.scrollTo({ top: 0, behavior: 'instant' }) }}>Finish review <ArrowUpRightIcon label="" /></Button>}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
