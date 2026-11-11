import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity, ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, CircleAlert, Flag, Route,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { chapters, featured, projectsPath, reportPath } from '@/lib/reports.mjs'
import { fade, useReducedMotion } from '@/lib/motion'

import { ProgressVisual } from './Chapters'

const icons = [Activity, Flag, CircleAlert, Route]
const { project, report } = featured
const reviewUrl = reportPath(project.id, report.month)

export function Home() {
  const reduced = useReducedMotion()
  const progress = report.progress
  const [view, setView] = useState('month')

  useEffect(() => { document.title = 'Project Lens · Monthly project reviews' }, [])

  return (
    <main id="main-content" tabIndex={-1} className="site-width home">
      <section className="hero" aria-labelledby="hero-title">
        <motion.div className="hero-copy" {...fade(reduced, 18)}>
          <p className="eyebrow"><span /> Monthly project reviews</p>
          <h1 id="hero-title">Project Lens<span>.</span></h1>
          <p className="hero-description">See what moved forward, what got in the way, and what the team is planning next.</p>
          <div className="hero-actions">
            <Button asChild size="lg" className="action action-primary">
              <Link to={reviewUrl}>Open {report.name} review <ArrowUpRight size={18} /></Link>
            </Button>
            <a className="text-link" href="#review">See the highlights <ArrowDown size={15} /></a>
          </div>
        </motion.div>

        <motion.section className="hero-preview" aria-label="Report preview" {...fade(reduced, 10)}>
          <div className="preview-header">
            <div><strong>{project.name}</strong><span>{report.label}</span></div>
            <div className="preview-toggle" role="group" aria-label="Chart view">
              <button type="button" aria-pressed={view === 'month'} onClick={() => setView('month')}>Month</button>
              <button type="button" aria-pressed={view === 'project'} onClick={() => setView('project')}>Project</button>
            </div>
          </div>
          <div className="preview-chart" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div className="preview-chart-inner" key={view} {...fade(reduced, 6)}>
                <ProgressVisual report={report} reduced={reduced} monthly={view === 'month'} />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.section>
      </section>

      <motion.section id="review" className="home-review" aria-labelledby="review-title" {...fade(reduced, 14)}>
        <div className="section-heading">
          <h2 id="review-title">{report.name} at a glance</h2>
          <Link to={projectsPath} className="text-link">Browse reports <ArrowRight size={16} /></Link>
        </div>
        <div className="review-strip">
          <Link className="review-strip-cover" to={reviewUrl}>
            <span className="cover-date"><CalendarDays size={15} /> {report.label}</span>
            <strong>{project.name}</strong>
            <span className="cover-arrow"><ArrowUpRight size={20} /></span>
          </Link>
          <dl className="review-metrics">
            <div><dd>{progress.completed}<span>/{progress.planned}</span></dd><dt>Planned tasks complete</dt></div>
            <div><dd>{(progress.projectCompleted / progress.total * 100).toFixed(1)}<span>%</span></dd><dt>Project complete</dt></div>
            <div><dd>{progress.carryOver}</dd><dt>Tasks carried over</dt></div>
          </dl>
        </div>
      </motion.section>

      <section className="home-chapters" aria-labelledby="chapters-title">
        <div className="section-heading"><h2 id="chapters-title">Inside the review</h2></div>
        <div className="chapter-tiles">
          {chapters.map((chapter, index) => {
            const Icon = icons[index]
            return (
              <Link to={reportPath(project.id, report.month, chapter.id)} className="chapter-tile" key={chapter.id}>
                <Icon size={23} strokeWidth={1.6} />
                <span>{chapter.label}</span>
                <ArrowUpRight size={17} className="tile-arrow" />
              </Link>
            )
          })}
        </div>
      </section>
    </main>
  )
}
