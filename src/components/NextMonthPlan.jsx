import { useEffect, useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarIcon, ChevronDownIcon, ChevronUpIcon, FlagIcon, PeopleIcon, PersonIcon, TargetIcon } from '@/components/ui/icons'
import { fade } from '@/lib/motion'

const shortDate = new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function groupByDeadline(items) {
  const groups = new Map()
  for (const item of items) {
    const group = groups.get(item.date) ?? []
    group.push(item)
    groups.set(item.date, group)
  }
  return [...groups].sort(([first], [second]) => first.localeCompare(second))
}

function dayLabel(date) {
  return shortDate.format(new Date(date))
}

function DeadlineCalendar({ reportMonth, month, deadlines, activeDate, today, onSelect, reduced }) {
  const [expanded, setExpanded] = useState(true)
  const calendarId = useId()
  const first = new Date(`${reportMonth}-01T00:00:00Z`)
  first.setUTCMonth(first.getUTCMonth() + 1)
  const following = new Date(first)
  following.setUTCMonth(following.getUTCMonth() + 1, 0)
  const daysInMonth = following.getUTCDate()
  const offset = (first.getUTCDay() + 6) % 7
  const datePrefix = first.toISOString().slice(0, 7)
  const actionsByDate = new Map(deadlines)
  const weeks = Array.from({ length: Math.ceil((offset + daysInMonth) / 7) }, (_, week) =>
    Array.from({ length: 7 }, (_, column) => week * 7 + column - offset + 1))

  return (
    <section className="workspace-panel plan-calendar" aria-label={`${month} deadlines`}>
      <div className="calendar-toolbar" data-chapter-controls>
        <div className="panel-heading"><CalendarIcon label="" /><h3>Deadline calendar</h3></div>
        <div className="calendar-toolbar-actions">
          {deadlines.length > 0 && <button className="calendar-reset" type="button" aria-pressed={!activeDate} onClick={() => onSelect(null)}>Show all dates</button>}
          <button className="icon-button calendar-toggle" type="button"
            aria-label={expanded ? 'Collapse calendar' : 'Expand calendar'}
            title={expanded ? 'Collapse calendar' : 'Expand calendar'}
            aria-expanded={expanded} aria-controls={calendarId} onClick={() => setExpanded(value => !value)}>
            {expanded ? <ChevronUpIcon label="" /> : <ChevronDownIcon label="" />}
          </button>
        </div>
      </div>
      <motion.div className="calendar-body" id={calendarId} initial={false} aria-hidden={!expanded} inert={!expanded}
        animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }} transition={{ duration: reduced ? 0 : .18 }}>
        <table aria-label={`${month} calendar`}>
          <thead><tr>{weekdays.map(day => <th key={day} scope="col">{day}</th>)}</tr></thead>
          <tbody>{weeks.map(week => (
            <tr key={week[0]}>{week.map(day => {
              if (day < 1 || day > daysInMonth) return <td className="calendar-outside" key={day} />
              const date = `${datePrefix}-${String(day).padStart(2, '0')}`
              const actions = actionsByDate.get(date)
              const dateNumber = <time dateTime={date} aria-current={date === today ? 'date' : undefined}>{day}</time>
              return <td key={day} data-today={date === today || undefined}>
                {actions ? <button type="button" className="calendar-deadline" aria-pressed={activeDate === date}
                  aria-label={`${dayLabel(date)}, ${actions.length} ${actions.length === 1 ? 'deadline' : 'deadlines'}`}
                  aria-controls="plan-action-list" data-chapter-controls
                  onClick={() => onSelect(activeDate === date ? null : date)}>
                  {dateNumber}
                  <span className="calendar-stamp" aria-hidden="true">{actions[0].title}</span>
                  <span className="calendar-count" aria-hidden="true">{actions.length}</span>
                </button> : <div className="calendar-day">{dateNumber}</div>}
              </td>
            })}</tr>
          ))}</tbody>
        </table>
      </motion.div>
    </section>
  )
}

export function NextMonthPlan({ report, reduced }) {
  const { month, items, milestones, support } = report.next
  const [dateFilter, setDateFilter] = useState(null)
  const deadlines = groupByDeadline(items)
  const activeDate = deadlines.some(([date]) => date === dateFilter) ? dateFilter : null
  const visible = activeDate ? deadlines.filter(([date]) => date === activeDate) : deadlines
  const count = visible.reduce((total, [, actions]) => total + actions.length, 0)

  useEffect(() => {
    if (dateFilter && !activeDate) setDateFilter(null)
  }, [dateFilter, activeDate])

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const lastDeadline = items.map(item => item.date).sort().at(-1)
  const historical = lastDeadline ? lastDeadline < today : false

  return (
    <section className="next-plan">
      <div className="plan-heading">
        <span className="section-icon" aria-hidden="true"><CalendarIcon label="" /></span>
        <div>
          <h2>{month} plan</h2>
          <p>{items.length} {items.length === 1 ? 'action' : 'actions'} across {deadlines.length} {deadlines.length === 1 ? 'deadline' : 'deadlines'}</p>
        </div>
      </div>

      {historical && <p className="plan-time-context">Historical plan · dates are shown as originally planned.</p>}
      <DeadlineCalendar reportMonth={report.month} month={month} deadlines={deadlines} activeDate={activeDate} today={today} onSelect={setDateFilter} reduced={reduced} />
      <div className="plan-layout">
        <section className="workspace-panel plan-actions" aria-labelledby="plan-actions-title">
          <div className="panel-heading">
            <TargetIcon label="" /><h3 id="plan-actions-title">{activeDate ? `Planned actions · ${dayLabel(activeDate)}` : 'Planned actions'}</h3>
          </div>
          <p className="sr-only" role="status">{count} {count === 1 ? 'action' : 'actions'} shown</p>
          {items.length === 0 && <p className="plan-empty">No actions are listed for this month.</p>}
          <div id="plan-action-list">
            <AnimatePresence initial={false} mode="wait">
              <motion.div key={activeDate ?? 'all'} {...fade(reduced, 4)}>
                {visible.map(([date, actions]) => (
                  <section className="deadline-group" key={date}>
                    <h4><CalendarIcon label="" size="small" /><time dateTime={date}>{dayLabel(date)}</time></h4>
                    <ul>
                      {actions.map((item) => (
                        <li key={item.title} className="plan-action">
                          <div><strong>{item.title}</strong>{item.detail && <p>{item.detail}</p>}</div>
                          <span className="action-owner"><PersonIcon label="" size="small" /><span className="sr-only">Assigned to </span>{item.owner}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {(milestones.length > 0 || support) && (
          <aside className="workspace-panel plan-context" aria-label="Plan milestones and support">
            {milestones.length > 0 && (
              <section>
                <div className="panel-heading"><FlagIcon label="" /><h3>Milestones</h3></div>
                <ul>{milestones.map((milestone) => <li key={milestone}>{milestone}</li>)}</ul>
              </section>
            )}
            {support && (
              <section>
                <div className="panel-heading"><PeopleIcon label="" /><h3>Support needed</h3></div>
                <p>{support}</p>
              </section>
            )}
          </aside>
        )}
      </div>
    </section>
  )
}
