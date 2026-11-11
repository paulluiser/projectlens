export const landingPath = '/landing'
export const projectsPath = `${landingPath}/projects`

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
