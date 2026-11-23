// Weekly task delegation: statuses, week brackets and small date helpers (all dates are YYYY-MM-DD, UTC).
const DAY = 86400000
export const taskStatuses = { todo: 'To do', 'in-progress': 'In progress', blocked: 'Blocked', done: 'Done' }
export const taskStatusOrder = Object.keys(taskStatuses)
export const time = date => Date.parse(`${date}T00:00:00Z`)
export const isoDate = value => new Date(value).toISOString().slice(0, 10)
const dayMonth = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })
const dayMonthYear = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: 'UTC' })

export function todayIso(now = Date.now()) {
  const local = new Date(now)
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`
}
export const formatDay = date => dayMonth.format(time(date))
export const formatWeekday = date => weekday.format(time(date))
export function formatRange(start, end) {
  if (start === end) return dayMonthYear.format(time(start))
  const sameYear = start.slice(0, 4) === end.slice(0, 4)
  return `${(sameYear ? dayMonth : dayMonthYear).format(time(start))} – ${dayMonthYear.format(time(end))}`
}
export const weekTitle = week => week.label || formatRange(week.start, week.end)
export const bracketDays = week => Math.round((time(week.end) - time(week.start)) / DAY) + 1

// The week to open by default: the one containing today, else the next upcoming, else the latest.
export function defaultWeek(weeks, today) {
  if (!weeks.length) return null
  return weeks.find(week => week.start <= today && today <= week.end)
    ?? weeks.find(week => week.start > today)
    ?? weeks.at(-1)
}

// Suggested bracket for a new week: the Monday–Friday after the last week, or this week's Monday–Friday.
export function suggestedBracket(weeks, today) {
  const after = weeks.at(-1)?.end
  const from = new Date(time(after ? isoDate(time(after) + DAY) : today))
  const offset = (from.getUTCDay() + 6) % 7
  const monday = time(isoDate(from)) + (offset === 0 ? 0 : (after ? 7 - offset : -offset)) * DAY
  return { start: isoDate(monday), end: isoDate(monday + 4 * DAY), label: '' }
}

export function weekPhase(week, today) {
  if (today < week.start) return { tone: 'upcoming', text: `Starts in ${Math.round((time(week.start) - time(today)) / DAY)} days` }
  if (today > week.end) return { tone: 'past', text: 'Week ended' }
  const left = Math.round((time(week.end) - time(today)) / DAY)
  return { tone: 'current', text: left === 0 ? 'Last day' : `${left} ${left === 1 ? 'day' : 'days'} left` }
}

export function taskFlags(task, week, today) {
  return {
    overdue: task.status !== 'done' && task.dueDate < today,
    outside: task.dueDate < week.start || task.dueDate > week.end,
  }
}

export function summarize(tasks) {
  const counts = Object.fromEntries(taskStatusOrder.map(status => [status, tasks.filter(task => task.status === status).length]))
  const owners = [...tasks.reduce((map, task) => {
    const entry = map.get(task.owner) ?? { owner: task.owner, total: 0, done: 0 }
    entry.total++; if (task.status === 'done') entry.done++
    return map.set(task.owner, entry)
  }, new Map()).values()].sort((a, b) => b.total - a.total || a.owner.localeCompare(b.owner))
  return { counts, owners, total: tasks.length, done: counts.done, percent: tasks.length ? Math.round(counts.done / tasks.length * 100) : 0 }
}
