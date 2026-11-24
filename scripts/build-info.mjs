import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

export function formatBuildInfo(buildNumber, builtAt = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(builtAt).map(({ type, value }) => [type, value]))
  return { version: `${buildNumber}.${parts.month}${parts.day}${parts.year}.${parts.hour}${parts.minute}`, builtAt: builtAt.toISOString() }
}

export function buildInfo() {
  // Vercel can use a shallow clone; the committed baseline preserves the build number there.
  const { buildNumber } = JSON.parse(readFileSync(new URL('../build-info.json', import.meta.url), 'utf8'))
  let commits = 0
  try { commits = Number(execFileSync('git', ['rev-list', '--count', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()) } catch {}
  return formatBuildInfo(Math.max(buildNumber, commits))
}
