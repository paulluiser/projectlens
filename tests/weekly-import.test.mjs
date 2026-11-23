import test from 'node:test'
import assert from 'node:assert/strict'
import { importWeeklyPlans } from '../server/weekly-import.mjs'
import { seedProjects } from '../server/seed.mjs'

test('weekly plans for 3–6 and 9–13 November are imported once and keep existing weeks', () => {
  const own = { id: 'own-week', start: '2026-10-26', end: '2026-10-30', label: '', tasks: [] }
  const state = { version: 'before', projects: [{ id: 'simsdotnet', months: [], weeks: [own] }, { id: 'hrdotnet-mobile', months: [] }] }
  const upgraded = importWeeklyPlans(state, seedProjects)
  const sims = upgraded.projects[0]
  assert.deepEqual(sims.weeks.map(week => week.start), ['2026-10-26', '2026-11-03', '2026-11-09'])
  assert.equal(sims.weeks[1].tasks.length, 4)
  assert.equal(sims.weeks[1].tasks[1].status, 'in-progress', 'Ongoing maps to in progress')
  assert.equal(sims.weeks[2].tasks.length, 5)
  assert.equal(upgraded.projects[1].weeks[1].tasks[0].owner, 'Rose')
  assert.equal(state.projects[0].weeks.length, 1, 'does not mutate stored state')
  const deleted = { ...upgraded, projects: upgraded.projects.map(project => ({ ...project, weeks: [] })) }
  assert.equal(importWeeklyPlans(deleted, seedProjects), deleted, 'does not restore user deletions')
})

test('seeded weekly totals match the source plan', () => {
  const counts = Object.fromEntries(seedProjects.map(project => [project.id, project.weeks.map(week => week.tasks.length)]))
  assert.deepEqual(counts, { simsdotnet: [4, 5], 'performance-management-system-pms': [4, 4], 'hrdotnet-mobile': [5, 1] })
})
