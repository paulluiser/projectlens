import { useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDownRight, ArrowRight, CalendarDays, Check, ChevronDown, CloudRain } from 'lucide-react'
import { easing, fade } from '@/lib/motion'

const hours = new Intl.NumberFormat('en', { maximumFractionDigits: 2 })

export function ProgressCopy({ report }) {
  const { completed, planned, carryOver, hours: effort } = report.progress
  return (
    <>
      <h1>{report.coverLine}<span>.</span></h1>
      <p className="chapter-description">{report.name} closed {completed} of {planned} planned tasks.</p>
      <dl className="progress-stats">
        <div><dt>Tasks carried over</dt><dd>{carryOver}</dd></div>
        <div><dt>Hours this month</dt><dd>{hours.format(effort)}<span> h</span></dd></div>
      </dl>
    </>
  )
}

export function WinsCopy({ report }) {
  return (
    <>
      <h1>{report.name} wins<span>.</span></h1>
      <ul className="wins-list">
        {report.wins.map((win) => (
          <li key={win.title}>
            <span className="win-value">{win.value}</span>
            <span><strong>{win.title}</strong><small>{win.detail}</small></span>
          </li>
        ))}
      </ul>
    </>
  )
}

export function BlockersCopy({ report }) {
  const [primary, ...other] = report.blockers
  return (
    <>
      <h1>{primary?.title ?? 'Blockers'}<span>.</span></h1>
      {primary ? (
        <>
          <p className="chapter-description">{primary.impact}</p>
          <div className="blocker-response">
            <span className="response-icon"><ArrowDownRight size={21} /></span>
            <div><strong>Response</strong><p>{primary.response}</p></div>
          </div>
          {other.map((blocker) => (
            <div className="extra-blocker" key={blocker.title}>
              <strong>{blocker.title}</strong><p>{blocker.impact} {blocker.response}</p>
            </div>
          ))}
        </>
      ) : <p className="chapter-description">The team reported no blockers.</p>}
    </>
  )
}

export function PlanCopy({ report }) {
  const { next } = report
  const monthName = next.month.split(' ')[0]
  return (
    <>
      <h1>{monthName}’s plan<span>.</span></h1>
      <ol className="plan-list" aria-label={`${next.month} priorities`}>
        {next.items.map((item) => (
          <li key={item.title}>
            <time dateTime={item.date}>{monthName.slice(0, 3)} <strong>{item.day}</strong></time>
            <span><strong>{item.title}</strong><small>{item.owner}</small></span>
          </li>
        ))}
      </ol>
    </>
  )
}

export function ProgressVisual({ report, reduced }) {
  const { projectCompleted: done, total } = report.progress
  const percentage = new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(total ? done / total * 100 : 0)
  return (
    <div className="progress-visual">
      <div className="stage-label"><span className="status-dot" /> Project completion</div>
      <div className="chart-area">
        <motion.div className="progress-ring" aria-hidden="true"
          initial={{ '--arc': reduced ? `${percentage}%` : '0%' }}
          animate={{ '--arc': `${percentage}%` }}
          transition={{ duration: reduced ? 0 : 0.8, ease: easing }} />
        <div className="chart-reading">
          <strong>{percentage}<span>%</span></strong>
          <span>{done} of {total} tasks</span>
        </div>
      </div>
      <dl className="chart-legend">
        <div><dt><i /> Complete</dt><dd>{done}</dd></div>
        <div><dt><i /> Remaining</dt><dd>{total - done}</dd></div>
      </dl>
    </div>
  )
}

export function ChapterGraphic({ chapter, report }) {
  if (chapter.id === 'accomplishments') {
    return (
      <div className="chapter-graphic">
        <div className="stage-label"><Check size={17} /> {report.wins.length} highlights</div>
        <ul className="milestone-graphic">
          {report.wins.map((win) => (
            <li key={win.title}>
              <span className="graphic-node"><Check size={18} /></span>
              <span>{win.title}</span>
              <strong>{win.value}</strong>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (chapter.id === 'blockers') {
    const blocker = report.blockers[0]
    return (
      <div className="chapter-graphic">
        <div className="stage-label"><CloudRain size={17} /> {report.blockers.length} reported {report.blockers.length === 1 ? 'blocker' : 'blockers'}</div>
        {blocker && (
          <div className="response-graphic">
            <div><span className="graphic-node"><CloudRain size={21} /></span><span>{blocker.title}</span></div>
            <ArrowRight className="response-arrow" size={23} aria-hidden="true" />
            <div><span className="graphic-node"><Check size={21} /></span><span>Response</span></div>
          </div>
        )}
      </div>
    )
  }

  const days = [...new Set(report.next.items.map((item) => item.day))]
  return (
    <div className="chapter-graphic">
      <div className="stage-label"><CalendarDays size={17} /> {report.next.month}</div>
      <ol className="plan-graphic" aria-label="Planned actions by day">
        {days.map((day) => {
          const count = report.next.items.filter((item) => item.day === day).length
          return <li key={day}><strong>{day}</strong><span>{count} {count === 1 ? 'action' : 'actions'}</span></li>
        })}
      </ol>
    </div>
  )
}

function ProgressDetails({ report }) {
  const { reporting, workstreams, hoursNote } = report.progress
  return (
    <>
      <div className="detail-columns">
        <div>
          <h3>Classified tasks by workstream</h3>
          <p>{workstreams.reduce((total, [, count]) => total + count, 0)} of {report.progress.planned} planned tasks are classified in the deck.</p>
          <dl>{workstreams.map(([label, value]) => (
            <div className="detail-row" key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}</dl>
        </div>
        <div>
          <h3>Reporting compliance</h3>
          <dl>{reporting.map(([label, value]) => (
            <div className="detail-row" key={label}><dt>{label}</dt><dd>{value}%</dd></div>
          ))}</dl>
        </div>
      </div>
      <p className="source-note">{hoursNote}</p>
    </>
  )
}

function PlanDetails({ report }) {
  return (
    <div className="detail-columns">
      <div>
        <h3>Targets and scope</h3>
        <ul>{report.next.items.filter((item) => item.detail).map((item) => <li key={item.title}>{item.detail}</li>)}</ul>
      </div>
      <div>
        <h3>Milestones and support</h3>
        <ul>{report.next.milestones.map((item) => <li key={item}>{item}</li>)}<li>{report.next.support}</li></ul>
      </div>
    </div>
  )
}

export function ChapterDetails({ chapter, report, reduced }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const isProgress = chapter === 'progress'
  const label = isProgress ? 'Workstreams and reporting' : 'Targets and support'

  return (
    <div className="chapter-details">
      <button type="button" className="details-trigger" aria-expanded={open} aria-controls={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}>
        {label} <ChevronDown size={17} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="details-body" id={id} {...fade(reduced, 5)}>
            {isProgress ? <ProgressDetails report={report} /> : <PlanDetails report={report} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
