import report from '../data/projects/simsdotnet/2026-09/report.json' with { type: 'json' }

// A small, stable workspace for server and UI tests, independent of the shipped seed data.
export const fixtureProjects = [{
  id: 'simsdotnet',
  name: 'SIMSDotNet',
  months: [
    { id: '2026-09', label: 'September 2026', report },
    { id: '2026-10', label: 'October 2026' },
  ],
}]
