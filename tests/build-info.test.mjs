import test from 'node:test'
import assert from 'node:assert/strict'
import { formatBuildInfo } from '../scripts/build-info.mjs'

test('build version uses build number and Manila deployment date/time with zero padding', () => {
  assert.deepEqual(formatBuildInfo(98, new Date('2026-11-23T02:36:00Z')), { version: '98.11232026.1036', builtAt: '2026-11-23T02:36:00.000Z' })
  assert.equal(formatBuildInfo(99, new Date('2026-12-31T16:05:00Z')).version, '99.01012027.0005')
})
