const DAY = 86400000
export const milestoneStatuses = { planned: 'Planned', 'in-progress': 'In progress', blocked: 'Blocked', completed: 'Completed' }
export const milestoneDate = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
export const shortMilestoneDate = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', timeZone: 'UTC' })
export const milestoneTime = date => Date.parse(`${date}T00:00:00Z`)

// Plot supplied date windows only; undated QA-dependent milestones stay off the calendar.
export function milestoneTimeline(items, today = Date.now()) {
  const dates = items.flatMap(item => item.dueDate ? [milestoneTime(item.startDate || item.dueDate), milestoneTime(item.dueDate)] : [])
  if (!dates.length) return null
  const first = Math.min(...dates)
  const last = Math.max(...dates)
  const padding = Math.max(2 * DAY, Math.ceil((last - first) / DAY * 0.08) * DAY)
  const start = first - padding
  const end = last + padding
  const position = date => (date - start) / (end - start) * 100
  return {
    start, end, position,
    ticks: Array.from({ length: 5 }, (_, index) => start + (end - start) * index / 4),
    today: today >= start && today <= end ? position(today) : null,
  }
}
