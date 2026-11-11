import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { chapters, findReport, reportPath, stepChapter } from '../src/lib/reports.mjs'

test('September review keeps October plans separate from the October report', () => {
  const report = findReport('simsdotnet', '2026-09')
  assert.equal(report.progress.completed, 26)
  assert.equal(report.progress.total, 188)
  assert.equal(report.next.month, 'October 2026')
  assert.equal(findReport('simsdotnet', '2026-10'), undefined)
})

test('a month cannot resolve to another project', () => {
  assert.equal(findReport('another-project', '2026-09'), undefined)
})

test('chapter paths can be shared and sequential navigation respects the endpoints', () => {
  assert.equal(reportPath('simsdotnet', '2026-09', 'blockers'), '/landing/projects/simsdotnet/2026-09/blockers')
  assert.equal(reportPath('simsdotnet', '2026-09'), '/landing/projects/simsdotnet/2026-09/progress')
  assert.equal(stepChapter('blockers', 1), chapters.at(-1).id)
  assert.equal(stepChapter('progress', -1), undefined)
  assert.equal(stepChapter('next-month', 1), undefined)
  assert.equal(stepChapter('invalid', 1), undefined)
})

test('the versioned JSON file provides the rendered report content', () => {
  const source = new URL('../data/projects/simsdotnet/2026-09/report.json', import.meta.url)
  assert.deepEqual(findReport('simsdotnet', '2026-09'), JSON.parse(readFileSync(source, 'utf8')))
})
