import { motion, useTransform } from 'framer-motion'
import { CalendarIcon, SuccessIcon, ClockIcon, ImpactIcon, WorkItemIcon, ChartIcon, ChecklistIcon } from '@/components/ui/icons'
import { easing } from '@/lib/motion'
import { AnimatedMetric } from './AnimatedMetric'

const hours = new Intl.NumberFormat('en', { maximumFractionDigits: 2 })

export function ProgressMetrics({ report, elapsed }) {
  const { carryOver, hours: effort } = report.progress
  // Older saved reports may still carry the published total in their source note.
  const legacyTotal = report.progress.hoursNote?.match(/([\d,]+(?:\.\d+)?) running hours/i)?.[1]
  const runningHours = report.progress.runningHours ?? (legacyTotal ? Number(legacyTotal.replaceAll(',', '')) : null)
  const metrics = [
    { Icon: CalendarIcon, tone: 'warning', value: carryOver, label: 'Tasks carried over' },
    { Icon: ClockIcon, tone: 'info', value: hours.format(effort), label: 'Hours this month' },
    { Icon: ChartIcon, tone: 'info', value: runningHours == null ? 'Not recorded' : hours.format(runningHours), label: 'Total running hours' },
  ]
  return (
    <dl className="summary-metrics">
      {metrics.map(({ Icon, tone, value, label }, index) => (
        <div className="workspace-panel metric-card" key={label}>
          <span className={`tile-icon ${tone}`} aria-hidden="true"><Icon label="" /></span>
          <div><dt>{label}</dt><dd><AnimatedMetric value={value} elapsed={elapsed} delay={140 + index * 45} /></dd></div>
        </div>
      ))}
    </dl>
  )
}

function ProgressBar({ value, reduced, delay }) {
  return <span className="bar-track" aria-hidden="true">
    <motion.span style={{ width: `${value}%` }} initial={reduced ? false : { scaleX: 0 }}
      animate={{ scaleX: 1 }} transition={{ duration: reduced ? 0 : .9, delay: reduced ? 0 : delay, ease: easing }} />
  </span>
}

export function TaskComparison({ report, elapsed, reduced }) {
  const { planned, completed } = report.progress
  const scale = Math.max(planned, completed, 1)
  const target = planned / scale * 100
  const fill = completed / scale * 100
  return <figure className="task-comparison">
    <figcaption>Tasks this month</figcaption>
    <div className="task-track" aria-hidden="true" style={{ '--target': `${target}%` }}>
      <motion.span className="task-fill" data-over-plan={completed > planned} style={{
        width: `${fill}%`,
        '--planned-share': `${completed ? planned / completed * 100 : 0}%`,
      }} initial={reduced ? false : { scaleX: 0 }} animate={{ scaleX: 1 }}
        transition={{ duration: reduced ? 0 : .9, delay: reduced ? 0 : .12, ease: easing }} />
      {planned > 0 || completed > 0 ? <span className="task-target" /> : null}
    </div>
    <dl className="task-key">
      {[['Completed', completed], ['Planned', planned]].map(([label, count], index) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd><AnimatedMetric value={count} elapsed={elapsed} delay={90 + index * 65} /></dd>
        </div>
      ))}
    </dl>
  </figure>
}

export function ProgressCopy({ report, elapsed, reduced }) {
  const { reporting, workstreams } = report.progress
  return (
    <>
      <section className="workspace-panel progress-detail">
        <div className="panel-heading"><ChecklistIcon label="" /><h2>Reporting compliance</h2></div>
        {reporting.length ? (
          <dl className="compliance-bars">
            {reporting.map(([label, value], index) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd><ProgressBar value={value} delay={.16 + Math.min(index, 4) * .05} reduced={reduced} /><strong><AnimatedMetric value={`${value}%`} elapsed={elapsed} delay={155 + Math.min(index, 4) * 40} /></strong></dd>
              </div>
            ))}
          </dl>
        ) : <p className="chapter-description">No compliance figures recorded.</p>}
      </section>
      {workstreams.length > 0 && <section className="workspace-panel progress-detail">
        <div className="panel-heading"><WorkItemIcon label="" /><h2>Classified workstreams</h2></div>
        <ul className="workstream-counts">
          {workstreams.map(([label, value]) => (
            <li key={label}>
              <WorkItemIcon label="" size="small" />
              <span className="workstream-label">{label}</span>
              {value != null && <span className="workstream-count"><AnimatedMetric value={value} elapsed={elapsed} delay={190} /></span>}
            </li>
          ))}
        </ul>
      </section>}
    </>
  )
}

export function WinsCopy({ report }) {
  return (
    <section className="workspace-panel chapter-copy">
      <div className="panel-heading">
        <SuccessIcon label="" /><h2>{report.name} wins</h2>
        <span className="lozenge success">{report.wins.length} {report.wins.length === 1 ? 'highlight' : 'highlights'}</span>
      </div>
      {report.wins.length > 0 ? (
        <ul className="wins-list">
          {report.wins.map((win) => (
            <li key={win.title}>
              <span className="achievement-mark" aria-hidden="true"><i /></span>
              <span><strong>{win.title}</strong><small>{win.detail}</small></span>
              <span className="lozenge success win-value">{win.value}</span>
            </li>
          ))}
        </ul>
      ) : <p className="chapter-description">No accomplishments were listed for this month.</p>}
    </section>
  )
}

export function BlockersCopy({ report }) {
  return (
    <section className="workspace-panel chapter-copy">
      <div className="panel-heading">
        <ImpactIcon label="" /><h2>Blockers</h2>
        <span className="lozenge neutral">{report.blockers.length} reported</span>
      </div>
      {report.blockers.length > 0 ? (
        <ul className="blockers-list">
          {report.blockers.map((blocker) => (
            <li key={blocker.title}>
              <div><h3>{blocker.title}</h3><p>{blocker.impact}</p></div>
              {blocker.response && <div className="blocker-response"><SuccessIcon label="" /><div><strong>Response</strong><p>{blocker.response}</p></div></div>}
            </li>
          ))}
        </ul>
      ) : <p className="chapter-description">The team reported no blockers.</p>}
    </section>
  )
}

export function ProgressVisual({ report, reduced, elapsed }) {
  const { projectCompleted: done, total } = report.progress
  const completion = total ? done / total : 0
  const percentage = new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(completion * 100)
  const coverage = useTransform(elapsed, [0, 1050], ['0%', `${completion * 100}%`])
  return (
    <div className="progress-visual status-overview">
      <h2>Project completion</h2>
      <div className="status-body">
        <motion.div className="status-dial" style={{ '--coverage': reduced ? `${completion * 100}%` : coverage }}>
          <strong><AnimatedMetric value={total ? `${percentage}%` : '—'} elapsed={elapsed} /></strong>
        </motion.div>
        <dl className="status-legend">
          <div><dt>Completed</dt><dd><AnimatedMetric value={done} elapsed={elapsed} delay={55} /></dd></div>
          <div><dt>Remaining</dt><dd><AnimatedMetric value={total - done} elapsed={elapsed} delay={90} /></dd></div>
          <div><dt>Total tracked</dt><dd><AnimatedMetric value={total} elapsed={elapsed} delay={125} /></dd></div>
        </dl>
      </div>
    </div>
  )
}