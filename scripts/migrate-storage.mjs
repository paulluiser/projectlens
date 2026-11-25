import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { pathToFileURL } from 'node:url'
import { get, put } from '@vercel/blob'
import { Pool } from 'pg'
import { createPostgresStore } from '../server/postgres-store.mjs'

import { canonical, checksum, counts, destinationState } from '../server/migration-format.mjs'
export { canonical, checksum, counts, destinationState } from '../server/migration-format.mjs'

const pathname = 'project-lens/workspace.json'
const directory = resolve(process.env.LENS_MIGRATION_DIRECTORY || '.local/migration')
function credentials() {
  if (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN) return { storeId: process.env.BLOB_STORE_ID }
  if (process.env.BLOB_READ_WRITE_TOKEN && process.env.BLOB_READ_WRITE_TOKEN !== '[SENSITIVE]') return { token: process.env.BLOB_READ_WRITE_TOKEN }
  throw new Error('Provide Blob OIDC credentials with BLOB_STORE_ID, or a usable Blob token. Never pass secrets as arguments.')
}
async function source() {
  const result = await get(pathname, { ...credentials(), access: 'private', useCache: false, headers: { 'accept-encoding': 'identity' } })
  if (!result?.stream) throw new Error('The source workspace is missing; refusing to seed or migrate.')
  const state = JSON.parse(await new Response(result.stream).text())
  if (!Array.isArray(state.projects) || !state.version) throw new Error('The source is not a valid workspace.')
  return { state, etag: result.blob.etag }
}
async function backup(state, etag, label) {
  await mkdir(directory, { recursive: true, mode: 0o700 })
  const file = join(directory, `${label}-${Date.now()}-${randomUUID().slice(0,8)}.json`)
  const snapshot = { format: 'project-lens-migration-v1', capturedAt: new Date().toISOString(), sourceETag: etag, checksum: checksum(state), counts: counts(state), state }
  await writeFile(file, JSON.stringify(snapshot, null, 2), { mode: 0o600, flag: 'wx' })
  return { file, checksum: snapshot.checksum, counts: snapshot.counts }
}
async function loadSnapshot(file) {
  if (!file) throw new Error('Supply the private snapshot file path.')
  const value = JSON.parse(await readFile(file, 'utf8'))
  if (value.format !== 'project-lens-migration-v1' || value.checksum !== checksum(value.state)) throw new Error('Snapshot checksum or format is invalid.')
  return value
}
async function run(command, argument) {
  if (command === 'backup' || command === 'freeze') {
    const { state, etag } = await source()
    if (command === 'backup') return backup(state, etag, 'blob-backup')
    if (argument !== '--prepared') throw new Error('Freeze requires --prepared after verifying the deployed mutation guard.')
    if (state.storageMigration?.status === 'frozen') return backup(state, etag, 'blob-frozen')
    await backup(state, etag, 'blob-before-freeze')
    state.storageMigration = { status: 'frozen', startedAt: new Date().toISOString() }
    state.version = randomUUID()
    const result = await put(pathname, JSON.stringify(state), { ...credentials(), access: 'private', addRandomSuffix: false, contentType: 'application/json', ifMatch: etag })
    return backup(state, result.etag, 'blob-frozen')
  }
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL === '[SENSITIVE]') throw new Error('A usable DATABASE_URL is required.')
  if (command === 'schema') {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 })
    try { await pool.query(await readFile(new URL('../server/schema.sql', import.meta.url), 'utf8')); return { schemaApplied: true } }
    finally { await pool.end() }
  }
  const store = createPostgresStore({ env: process.env })
  try {
    if (command === 'export-db') { const result = await store.read(); return backup(result.state, result.etag, 'postgres-backup') }
    if (!['import', 'verify'].includes(command)) throw new Error('Choose backup, freeze --prepared, schema, import <snapshot>, verify <snapshot>, or export-db.')
    const snapshot = await loadSnapshot(argument)
    const expected = destinationState(snapshot)
    if (command === 'import') await store.initialize(expected)
    const actual = await store.read()
    if (!isDeepStrictEqual(canonical(actual.state), canonical(expected))) throw new Error('Postgres verification failed. Do not switch production storage.')
    return { verified: true, checksum: checksum(actual.state), counts: counts(actual.state), sourceChecksum: snapshot.checksum }
  } finally { await store.close() }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await run(process.argv[2], process.argv[3]))) }
  catch (error) { console.error(error.message.replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[database URL redacted]')); process.exitCode = 1 }
}
