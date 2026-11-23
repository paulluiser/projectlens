export const landingPath = '/landing'
export const overviewPath = `${landingPath}/overview`
export const projectsPath = `${landingPath}/projects`
export const publicTabs = [
  { id: 'home', label: 'Home', path: landingPath },
  { id: 'features', label: 'Features', path: `${landingPath}/features` },
  { id: 'how-it-works', label: 'How it works', path: `${landingPath}/how-it-works` },
  { id: 'use-cases', label: 'Use cases', path: `${landingPath}/use-cases` },
  { id: 'updates', label: 'Updates', path: `${landingPath}/updates` },
]

export const chapters = [
  { id: 'progress', label: 'Progress' },
  { id: 'accomplishments', label: 'Accomplishments' },
  { id: 'blockers', label: 'Blockers' },
  { id: 'next-month', label: 'Next month' },
]

export function projectPath(projectId) {
  return `${projectsPath}/${encodeURIComponent(projectId)}`
}

export function milestonesPath(projectId) {
  return `${projectPath(projectId)}/milestones`
}

export function projectOverviewPath(projectId) {
  return `${projectPath(projectId)}/overview`
}

export function weeklyPath(projectId) {
  return `${projectPath(projectId)}/weekly`
}

// Sections of a project, in sidebar and tab order. Reports keeps the project's base path.
export const projectSections = [
  { id: 'overview', label: 'Overview', path: projectOverviewPath },
  { id: 'reports', label: 'Reports', path: projectPath },
  { id: 'milestones', label: 'Milestones', path: milestonesPath },
  { id: 'weekly', label: 'Weekly', path: weeklyPath },
]

export function reportPath(projectId, monthId, chapter = 'progress') {
  return `${projectPath(projectId)}/${encodeURIComponent(monthId)}/${encodeURIComponent(chapter)}`
}

export function stepChapter(chapterId, direction) {
  const current = chapters.findIndex((chapter) => chapter.id === chapterId)
  return current < 0 ? undefined : chapters[current + direction]?.id
}

export function libraryReturnPath() {
  try {
    const saved = sessionStorage.getItem('lens-library-location')
    if (saved && /^\/landing\/projects(?:\/[a-z0-9-]+)?(?:\?.*)?$/.test(saved)) return saved
  } catch { /* Browser storage may be unavailable. */ }
  return projectsPath
}
