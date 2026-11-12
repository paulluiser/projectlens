import catalog from '../data/projects/catalog.json' with { type: 'json' }
import september2026 from '../data/projects/simsdotnet/2026-09/report.json' with { type: 'json' }

const reports = { 'simsdotnet/2026-09': september2026 }
export const seedProjects = catalog.map(project => ({
  ...project,
  months: project.months.map(month => ({
    ...month,
    ...(reports[`${project.id}/${month.id}`] ? { report: reports[`${project.id}/${month.id}`] } : {}),
  })),
}))
