export function previousMonthId(monthId) {
  const [year, month] = monthId.split('-').map(Number)
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`
}

export function compareReports(current, previous) {
  if (!current || !previous) return []
  const completion = ({ progress }) => progress.total ? progress.projectCompleted / progress.total * 100 : 0
  return [
    ['completed', 'Completed', 'items', current.progress.completed, previous.progress.completed],
    ['planned', 'Planned', 'items', current.progress.planned, previous.progress.planned],
    ['carryOver', 'Carry-over', 'items', current.progress.carryOver, previous.progress.carryOver],
    ['hours', 'Hours', 'hours', current.progress.hours, previous.progress.hours],
    ['projectCompletion', 'Project completion', '%', completion(current), completion(previous)],
  ].map(([key, label, unit, current, previous]) => ({ key, label, current, previous, delta: current - previous, unit }))
}

export function reportCompleteness(report) {
  const hasTitle = (items) => items?.some((item) => item.title?.trim())
  return [
    ['Progress headline', report?.coverLine?.trim()],
    ['Accomplishments', hasTitle(report?.wins)],
    ['Blockers', hasTitle(report?.blockers)],
    ['Next-month actions', hasTitle(report?.next?.items)],
  ].filter(([, present]) => !present).map(([label]) => label)
}

export function carryForwardItems(previousReport, sourceMonth) {
  return (previousReport?.next?.items ?? []).map(({ title, owner, date }, sourceIndex) => ({
    sourceMonth, sourceIndex, title, owner, date, status: 'carried-over', context: '',
  }))
}

export function getPublishedReport(project, monthId) {
  return project?.months?.find((month) => month.id === monthId)?.report ?? null
}
