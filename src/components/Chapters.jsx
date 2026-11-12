import { useId, useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarIcon, SuccessIcon, ClockIcon, ImpactIcon, WorkItemIcon, ChartIcon, ChecklistIcon } from '@/components/ui/icons'
import { easing } from '@/lib/motion'
import { AnimatedMetric } from './AnimatedMetric'
import { previousMonthId } from '@/lib/review.mjs'

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

const shortMonth = new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' })
const percent = new Intl.NumberFormat('en', { maximumFractionDigits: 1 })

// Completed tasks drawn as an elevation profile: one station per published month, summit at the project total.
export function routeStations(report, project) {
  const earlier = (project?.months ?? [])
    .filter(month => month.report && month.id < report.month)
    .sort((first, second) => first.id.localeCompare(second.id))
    .map(month => month.report)
  const reports = [...earlier, report]
  const first = reports[0].progress
  return [
    { id: 'start', label: shortMonth.format(new Date(`${previousMonthId(reports[0].month)}-01T00:00:00Z`)), value: Math.max(0, first.projectCompleted - first.completed) },
    ...reports.map(entry => ({ id: entry.month, label: shortMonth.format(new Date(`${entry.month}-01T00:00:00Z`)), value: entry.progress.projectCompleted })),
  ]
}

export function ProgressVisual({ report, project, reduced, elapsed }) {
  const { projectCompleted: done, total } = report.progress
  const completion = total ? done / total : 0
  const stations = routeStations(report, project)
  const pattern = useId()
  const frame = useRef(null)
  const [width, setWidth] = useState(640)
  useLayoutEffect(() => {
    // Match the drawing width to the panel so axis labels stay at reading size on phones.
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(Math.min(760, Math.max(280, entry.contentRect.width)))))
    observer.observe(frame.current)
    return () => observer.disconnect()
  }, [])
  const height = width < 480 ? 200 : 230
  const [top, bottom, left, walkedRight] = [34, height - 34, 6, Math.round(width * .72)]
  const scaleTop = Math.max(total, ...stations.map(station => station.value), 1)
  const y = value => bottom - value / scaleTop * (bottom - top)
  const step = (walkedRight - left) / Math.max(stations.length - 1, 1)
  const points = stations.map((station, index) => ({ ...station, x: left + index * step, y: y(station.value) }))
  const here = points.at(-1)
  const line = points.map((point, index) => {
    if (!index) return `M${point.x} ${point.y}`
    const previous = points[index - 1]
    const middle = (previous.x + point.x) / 2
    return `C${middle} ${previous.y} ${middle} ${point.y} ${point.x} ${point.y}`
  }).join(' ')
  const summit = y(total)
  const draw = reduced ? false : { pathLength: 0 }
  return (
    <div className="progress-visual route-profile" ref={frame}>
      <div className="route-profile-head">
        <h2>Project completion</h2>
        <p className="route-reading"><strong><AnimatedMetric value={total ? `${percent.format(completion * 100)}%` : '—'} elapsed={elapsed} /></strong><span>{done} of {total} tasks</span></p>
      </div>
      <svg className="route-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Completed tasks by month: ${points.slice(1).map(point => `${point.label} ${point.value}`).join(', ')}, of ${total} tracked.`}>
        <defs>
          <pattern id={pattern} width="8" height="6" patternUnits="userSpaceOnUse"><path d="M0 5.5H8" stroke="var(--contour-soft)" strokeWidth="1" /></pattern>
        </defs>
        {[.25, .5, .75].map(share => <line key={share} x1={left} x2={width - 4} y1={y(total * share)} y2={y(total * share)} stroke="var(--grid)" strokeWidth="1" />)}
        <line x1={left} x2={width - 4} y1={summit} y2={summit} stroke="var(--contour)" strokeWidth="1" />
        <text className="route-summit-label" x={width - 4} y={summit - 8} textAnchor="end">Total {total}</text>
        <motion.path d={`${line} L${here.x} ${bottom} L${left} ${bottom} Z`} fill={`url(#${pattern})`}
          initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .5, delay: .5 }} />
        <motion.path d={`M${here.x} ${here.y} C${here.x + (width - here.x) / 3} ${here.y} ${width - (width - here.x) / 3} ${summit} ${width - 4} ${summit}`} fill="none" stroke="var(--ink-soft)" strokeWidth="1.5" strokeDasharray="5 5"
          initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .4, delay: .95 }} />
        <motion.path d={line} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round"
          initial={draw} animate={{ pathLength: 1 }} transition={{ duration: reduced ? 0 : .9, ease: easing, delay: .1 }} />
        <line x1={left} x2={width - 4} y1={bottom} y2={bottom} stroke="var(--border)" strokeWidth="1" />
        {points.map(point => <g key={point.id}>
          <line x1={point.x} x2={point.x} y1={bottom} y2={bottom + 5} stroke="var(--input)" />
          <text x={point.x} y={bottom + 20} textAnchor={point.x === left ? 'start' : 'middle'}>{point.label}</text>
          {point !== here && <circle cx={point.x} cy={point.y} r="3.5" fill="var(--paper)" stroke="var(--primary)" strokeWidth="2" />}
        </g>)}
        <motion.g initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3, delay: reduced ? 0 : .95 }}>
          <circle cx={here.x} cy={here.y} r="7" fill="var(--primary)" stroke="var(--paper)" strokeWidth="3" />
          <text className="route-here-label" x={here.x} y={here.y - 14} textAnchor="middle">{done} done</text>
        </motion.g>
      </svg>
      <dl className="route-legend status-legend">
        <div data-key="done"><i aria-hidden="true" /><dt>Completed</dt><dd><AnimatedMetric value={done} elapsed={elapsed} delay={55} /></dd></div>
        <div data-key="remaining"><i aria-hidden="true" /><dt>Remaining</dt><dd><AnimatedMetric value={total - done} elapsed={elapsed} delay={90} /></dd></div>
        <div data-key="total"><i aria-hidden="true" /><dt>Total tracked</dt><dd><AnimatedMetric value={total} elapsed={elapsed} delay={125} /></dd></div>
      </dl>
    </div>
  )
}
