import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const report = JSON.parse(await readFile(new URL('../data/projects/simsdotnet/2026-09/report.json', import.meta.url)))
test('formal documents preserve report facts, draft state, missing counts and shared weekly owners', async t => {
  const vite = await createServer({ server: { middlewareMode: true } })
  t.after(() => vite.close())
  const { MonthlyReportDocument, WeeklyReportDocument } = await vite.ssrLoadModule('/src/components/ReportDocument.jsx')
  const data = structuredClone(report)
  data.presenterNotes = 'PRIVATE PRESENTER NOTES'
  data.progress.workstreams = [['Unspecified count', null], ['Zero count', 0]]
  const html = renderToStaticMarkup(createElement(MonthlyReportDocument, { project: { name: 'Test project' }, month: { label: 'September 2026', publishedAt: '2026-10-01T00:00:00Z' }, report: data, preview: true }))
  assert.match(html, /DRAFT - not published/)
  assert.doesNotMatch(html, /PRIVATE PRESENTER NOTES|workspace-panel|progress-bento|Published<\/dt>/)
  assert.match(html, /Unspecified count<\/td><td>Not reported/)
  assert.match(html, /Zero count<\/td><td>0/)
  assert.match(html, /Total running hours/)
  assert.match(html, /3,309/)
  assert.ok(html.includes(report.next.support))
  const weekly = renderToStaticMarkup(createElement(WeeklyReportDocument, { project: { name: 'Test project' }, week: { start: '2026-11-23', end: '2026-11-27' }, today: '2026-11-24', filtered: true, tasks: [{ id: 'one', title: 'Shared task', owners: ['Jess', 'KC'], dueDate: '2026-11-23', status: 'todo', notes: 'Task details' }] }))
  assert.match(weekly, /Filtered report/)
  assert.match(weekly, /Jess, KC/)
  assert.match(weekly, /Task details/)
  assert.match(weekly, /Overdue/)
  assert.match(weekly, /Workload by owner/)
})
