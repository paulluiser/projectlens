import catalog from '../../data/projects/catalog.json' with { type: 'json' }
import september2026 from '../../data/projects/simsdotnet/2026-09/report.json' with { type: 'json' }

export const landingPath = '/landing'
export const projectsPath = `${landingPath}/projects`

export const chapters = [
  { id: 'progress', label: 'Progress' },
  { id: 'accomplishments', label: 'Accomplishments' },
  { id: 'blockers', label: 'Blockers' },
  { id: 'next-month', label: 'Next month' },
]

const reportFiles = {
  'simsdotnet/2026-09': september2026,
}

export const projects = catalog.map((project) => ({
  ...project,
  months: project.months.map((month) => ({
    ...month,
    report: reportFiles[`${project.id}/${month.id}`],
  })),
}))

export const featured = {
  project: projects.find((project) => project.id === 'simsdotnet'),
  report: september2026,
}

export function projectPath(projectId) {
  return `${projectsPath}/${encodeURIComponent(projectId)}`
}

export function findReport(projectId, monthId) {
  return projects.find((project) => project.id === projectId)
    ?.months.find((month) => month.id === monthId)?.report
}

export function reportPath(projectId, monthId, chapter = 'progress') {
  return `${projectPath(projectId)}/${encodeURIComponent(monthId)}/${encodeURIComponent(chapter)}`
}

export function stepChapter(chapterId, direction) {
  const current = chapters.findIndex((chapter) => chapter.id === chapterId)
  return current < 0 ? undefined : chapters[current + direction]?.id
}
