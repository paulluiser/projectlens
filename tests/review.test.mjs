import assert from 'node:assert/strict'
import { test } from 'node:test'
import { previousMonthId, compareReports, reportCompleteness, carryForwardItems, getPublishedReport } from '../src/lib/review.mjs'

const report = (progress) => ({ progress })

test('previous month follows the calendar across the year boundary', () => {
  assert.equal(previousMonthId('2026-01'), '2025-12')
  assert.equal(previousMonthId('2026-10'), '2026-09')
})

test('comparison does not invent a missing previous report', () => {
  assert.deepEqual(compareReports(report({ completed: 4 }), null), [])
})

test('comparison reports count, hour and percentage point changes', () => {
  const current = report({ completed: 8, planned: 10, carryOver: 2, hours: 20.5, projectCompleted: 15, total: 20 })
  const previous = report({ completed: 5, planned: 12, carryOver: 7, hours: 24, projectCompleted: 10, total: 20 })
  assert.deepEqual(compareReports(current, previous), [
    { key: 'completed', label: 'Completed', current: 8, previous: 5, delta: 3, unit: 'items' },
    { key: 'planned', label: 'Planned', current: 10, previous: 12, delta: -2, unit: 'items' },
    { key: 'carryOver', label: 'Carry-over', current: 2, previous: 7, delta: -5, unit: 'items' },
    { key: 'hours', label: 'Hours', current: 20.5, previous: 24, delta: -3.5, unit: 'hours' },
    { key: 'projectCompletion', label: 'Project completion', current: 75, previous: 50, delta: 25, unit: '%' },
  ])
})

test('a previous zero stays a real value and zero project total produces zero percent', () => {
  const rows = compareReports(report({ completed: 2, planned: 3, carryOver: 0, hours: 4, projectCompleted: 1, total: 4 }), report({ completed: 0, planned: 0, carryOver: 0, hours: 0, projectCompleted: 0, total: 0 }))
  assert.equal(rows[0].previous, 0)
  assert.equal(rows[0].delta, 2)
  assert.equal(rows.at(-1).previous, 0)
  assert.equal(rows.at(-1).delta, 25)
})

test('completeness names optional narrative gaps without requiring unrelated fields', () => {
  assert.deepEqual(reportCompleteness({ coverLine: '  ', wins: [], blockers: [], next: { items: [] } }), ['Progress headline', 'Accomplishments', 'Blockers', 'Next-month actions'])
  assert.deepEqual(reportCompleteness({ coverLine: 'Progress', wins: [{ title: 'Delivered' }], blockers: [{ title: 'None' }], next: { items: [{ title: 'Next action' }] } }), [])
  assert.deepEqual(reportCompleteness({ coverLine: 'Progress', wins: [{ title: ' ' }], blockers: [{ title: '' }], next: { items: [{ title: '' }] } }), ['Accomplishments', 'Blockers', 'Next-month actions'])
})

test('carry forward copies action identity and provenance without mutating the source', () => {
  const prior = { next: { items: [{ title: 'Ship', owner: 'Paul', date: '2026-10-15', detail: 'Old detail' }, { title: 'Review', owner: '', date: '' }] } }
  const before = structuredClone(prior)
  assert.deepEqual(carryForwardItems(prior, '2026-09'), [
    { sourceMonth: '2026-09', sourceIndex: 0, title: 'Ship', owner: 'Paul', date: '2026-10-15', status: 'carried-over', context: '' },
    { sourceMonth: '2026-09', sourceIndex: 1, title: 'Review', owner: '', date: '', status: 'carried-over', context: '' },
  ])
  assert.deepEqual(prior, before)
  assert.deepEqual(carryForwardItems(null, '2026-09'), [])
})

test('published report lookup is scoped to the requested project month', () => {
  const published = { month: '2026-09' }
  const project = { months: [{ id: '2026-09', report: published }, { id: '2026-10' }] }
  assert.equal(getPublishedReport(project, '2026-09'), published)
  assert.equal(getPublishedReport(project, '2026-10'), null)
  assert.equal(getPublishedReport(project, '2026-08'), null)
  assert.equal(getPublishedReport(null, '2026-09'), null)
})
