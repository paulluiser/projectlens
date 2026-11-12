export const landingPath = '/landing'
export const overviewPath = `${landingPath}/overview`
export const projectsPath = `${landingPath}/projects`
export const publicTabs = [
  { id: 'home', label: 'Home', path: landingPath },
  { id: 'features', label: 'Features', path: `${landingPath}/features` },
  { id: 'how-it-works', label: 'How It Works', path: `${landingPath}/how-it-works` },
  { id: 'use-cases', label: 'Use Cases', path: `${landingPath}/use-cases` },
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
