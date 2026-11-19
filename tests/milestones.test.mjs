import test from 'node:test'
import assert from 'node:assert/strict'
import { milestoneTimeline, milestoneTime } from '../src/lib/milestones.mjs'

test('milestone timeline keeps checkpoints inside the axis and only shows an in-range today marker', () => {
  const items = [{dueDate:'2026-11-10'}, {dueDate:'2026-12-08'}]
  const axis = milestoneTimeline(items, milestoneTime('2026-11-19'))
  assert.equal(axis.ticks.length, 5)
  assert.ok(axis.position(milestoneTime(items[0].dueDate)) > 0)
  assert.ok(axis.position(milestoneTime(items[1].dueDate)) < 100)
  assert.ok(axis.today > 0 && axis.today < 100)
  assert.equal(milestoneTimeline(items, milestoneTime('2027-01-01')).today, null)
})
test('empty, same-day, and year-boundary timelines stay well-defined', () => {
  assert.equal(milestoneTimeline([]), null)
  const sameDay = milestoneTimeline([{dueDate:'2026-11-10'}, {dueDate:'2026-11-10'}])
  assert.equal(sameDay.position(milestoneTime('2026-11-10')), 50)
  const yearEnd = milestoneTimeline([{dueDate:'2026-12-31'}, {dueDate:'2027-01-01'}])
  assert.ok(yearEnd.start < milestoneTime('2026-12-31'))
  assert.ok(yearEnd.end > milestoneTime('2027-01-01'))
})

test('source date windows determine the range while undated milestones stay unscheduled', () => {
  const items = [{ startDate: '2026-11-03', dueDate: '2026-11-12' }, { dueDate: '' }]
  const axis = milestoneTimeline(items)
  assert.ok(axis.start < milestoneTime('2026-11-03'))
  assert.ok(axis.end > milestoneTime('2026-11-12'))
  assert.equal(milestoneTimeline([{dueDate:''}]), null)
})
