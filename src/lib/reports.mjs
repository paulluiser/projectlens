import catalog from '../../data/projects/catalog.json' with { type: 'json' }
import september2026 from '../../data/projects/simsdotnet/2026-09/report.json' with { type: 'json' }

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

export function findReport(projectId, monthId) {
  return projects.find((project) => project.id === projectId)
    ?.months.find((month) => month.id === monthId)?.report
}
