import catalog from '../data/projects/catalog.json' with { type: 'json' }
import simsdotnet202609 from '../data/projects/simsdotnet/2026-09/report.json' with { type: 'json' }
import simsdotnet202610 from '../data/projects/simsdotnet/2026-10/report.json' with { type: 'json' }
import pms202610 from '../data/projects/performance-management-system-pms/2026-10/report.json' with { type: 'json' }
import hrdotnetMobile202610 from '../data/projects/hrdotnet-mobile/2026-10/report.json' with { type: 'json' }

// Static imports keep every report inside the serverless bundle on Vercel.
const reports = {
  'simsdotnet/2026-09': simsdotnet202609,
  'simsdotnet/2026-10': simsdotnet202610,
  'performance-management-system-pms/2026-10': pms202610,
  'hrdotnet-mobile/2026-10': hrdotnetMobile202610,
}
export const seedProjects = catalog.map(project => ({
  ...project,
  months: project.months.map(month => ({
    ...month,
    ...(reports[`${project.id}/${month.id}`] ? { report: reports[`${project.id}/${month.id}`] } : {}),
  })),
}))
