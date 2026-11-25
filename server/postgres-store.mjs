import { Pool } from 'pg'
import { isDeepStrictEqual } from 'node:util'

const failure = (status, message) =>
  Object.assign(new Error(message), { status })
const unavailable = () =>
  failure(
    503,
    'The database workspace has not been initialized or is unavailable.',
  )
const conflict = () =>
  failure(409, 'The workspace changed. Reload and try again.')
const clone = (value) => structuredClone(value)
const definitions = [
  { table: 'lens_projects', keys: ['id'], collections: true },
  { table: 'lens_reports', keys: ['project_id', 'id'] },
  { table: 'lens_milestones', keys: ['project_id', 'id'] },
  { table: 'lens_weekly_plans', keys: ['project_id', 'id'], collections: true },
  { table: 'lens_weekly_tasks', keys: ['project_id', 'week_id', 'id'] },
  { table: 'lens_accounts', keys: ['id'] },
  { table: 'lens_guest_codes', keys: ['id'] },
  { table: 'lens_audit_events', keys: ['id'] },
  { table: 'lens_history_events', keys: ['id'] },
  { table: 'lens_login_attempts', keys: ['id'] },
  { table: 'lens_retired_credentials', keys: ['id'] },
]
const byTable = Object.fromEntries(definitions.map((d) => [d.table, d]))
const rowKey = (definition, row) =>
  JSON.stringify(definition.keys.map((key) => row[key]))
const identity = (item, index) =>
  typeof item?.id === 'string' ? item.id : `#index:${index}`
const SNAPSHOT_SQL = `/* lens:snapshot */ SELECT jsonb_build_object(
  'meta', (SELECT jsonb_build_object('revision', revision::text, 'data', data, 'collections', collections) FROM lens_workspace_meta WHERE singleton = true),
  ${definitions.map(({ table }) => `'${table}', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM ${table} r), '[]'::jsonb)`).join(',\n  ')}
) AS snapshot`

// Manifests retain ordering and distinguish absent collections from empty collections.
// Each business/security record is stored independently; no serialized workspace row exists.
function flatten(source) {
  const data = JSON.parse(JSON.stringify(source))
  const collections = {}
  const rows = Object.fromEntries(
    definitions.map(({ table }) => [table, new Map()]),
  )
  function add(table, keyValues, payload, manifest) {
    const definition = byTable[table]
    const row = {
      ...Object.fromEntries(
        definition.keys.map((key, i) => [key, keyValues[i]]),
      ),
      data: payload,
      ...(definition.collections ? { collections: manifest || {} } : {}),
    }
    const key = rowKey(definition, row)
    if (rows[table].has(key) && !isDeepStrictEqual(rows[table].get(key), row))
      throw failure(
        400,
        'Imported workspace contains duplicate record identifiers.',
      )
    rows[table].set(key, row)
  }
  function list(owner, manifest, field, table, prefix, visit) {
    if (!Array.isArray(owner[field])) return
    const items = owner[field]
    delete owner[field]
    manifest[field] = items.map(identity)
    items.forEach((item, index) => {
      const record = clone(item),
        nested = {}
      visit?.(record, nested, manifest[field][index])
      add(table, [...prefix, manifest[field][index]], record, nested)
    })
  }
  list(
    data,
    collections,
    'projects',
    'lens_projects',
    [],
    (project, manifest, projectId) => {
      list(project, manifest, 'months', 'lens_reports', [projectId])
      list(project, manifest, 'milestones', 'lens_milestones', [projectId])
      list(
        project,
        manifest,
        'weeks',
        'lens_weekly_plans',
        [projectId],
        (week, weekManifest, weekId) => {
          list(week, weekManifest, 'tasks', 'lens_weekly_tasks', [
            projectId,
            weekId,
          ])
        },
      )
    },
  )
  list(data, collections, 'history', 'lens_history_events', [])
  if (
    data.security &&
    typeof data.security === 'object' &&
    !Array.isArray(data.security)
  ) {
    const security = data.security,
      manifest = (collections.security = {})
    list(security, manifest, 'users', 'lens_accounts', [])
    list(security, manifest, 'guestCodes', 'lens_guest_codes', [])
    list(security, manifest, 'auditEvents', 'lens_audit_events', [])
    if (Array.isArray(security.retiredHashes)) {
      manifest.retiredHashes = security.retiredHashes
      for (const hash of security.retiredHashes)
        add('lens_retired_credentials', [hash], hash)
      delete security.retiredHashes
    }
    if (
      security.attempts &&
      typeof security.attempts === 'object' &&
      !Array.isArray(security.attempts)
    ) {
      manifest.attempts = Object.keys(security.attempts)
      for (const key of manifest.attempts)
        add('lens_login_attempts', [key], security.attempts[key])
      delete security.attempts
    }
  }
  return { data, collections, rows }
}
function records(snapshot) {
  return Object.fromEntries(
    definitions.map((d) => [
      d.table,
      new Map((snapshot[d.table] || []).map((row) => [rowKey(d, row), row])),
    ]),
  )
}
function reconstruct(snapshot) {
  if (!snapshot?.meta) throw unavailable()
  const state = clone(snapshot.meta.data),
    maps = records(snapshot),
    collections = snapshot.meta.collections
  function get(table, keys) {
    const row = maps[table].get(JSON.stringify(keys))
    if (!row) throw unavailable()
    return clone(row)
  }
  function list(owner, manifest, field, table, prefix, visit) {
    if (!Object.hasOwn(manifest, field)) return
    owner[field] = manifest[field].map((id) => {
      const row = get(table, [...prefix, id])
      visit?.(row.data, row.collections || {}, id)
      return row.data
    })
  }
  list(
    state,
    collections,
    'projects',
    'lens_projects',
    [],
    (project, manifest, projectId) => {
      list(project, manifest, 'months', 'lens_reports', [projectId])
      list(project, manifest, 'milestones', 'lens_milestones', [projectId])
      list(
        project,
        manifest,
        'weeks',
        'lens_weekly_plans',
        [projectId],
        (week, weekManifest, weekId) => {
          list(week, weekManifest, 'tasks', 'lens_weekly_tasks', [
            projectId,
            weekId,
          ])
        },
      )
    },
  )
  list(state, collections, 'history', 'lens_history_events', [])
  if (collections.security) {
    const manifest = collections.security,
      security = state.security
    list(security, manifest, 'users', 'lens_accounts', [])
    list(security, manifest, 'guestCodes', 'lens_guest_codes', [])
    list(security, manifest, 'auditEvents', 'lens_audit_events', [])
    if (Object.hasOwn(manifest, 'retiredHashes'))
      security.retiredHashes = manifest.retiredHashes.map(
        (hash) => get('lens_retired_credentials', [hash]).data,
      )
    if (Object.hasOwn(manifest, 'attempts'))
      security.attempts = Object.fromEntries(
        manifest.attempts.map((key) => [
          key,
          get('lens_login_attempts', [key]).data,
        ]),
      )
  }
  return { state, etag: String(snapshot.meta.revision) }
}

export function createPostgresStore({
  env = process.env,
  pool: suppliedPool,
} = {}) {
  const pool =
    suppliedPool ||
    (env.DATABASE_URL
      ? new Pool({
          connectionString: env.DATABASE_URL,
          max: 3,
          connectionTimeoutMillis: 10000,
          idleTimeoutMillis: 10000,
          allowExitOnIdle: true,
        })
      : null)
  // Idle connection errors must not crash the process or print a connection string.
  if (!suppliedPool) pool?.on('error', () => {})
  const requirePool = () => {
    if (!pool) throw failure(503, 'Postgres storage is not configured.')
    return pool
  }
  const snapshot = async (client) =>
    (await client.query(SNAPSHOT_SQL)).rows[0]?.snapshot
  async function transaction(work) {
    const client = await requirePool().connect()
    try {
      await client.query('BEGIN')
      const result = await work(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      throw error
    } finally {
      client.release()
    }
  }
  async function writeDiff(client, before, next) {
    for (const definition of [...definitions].reverse()) {
      const { table, keys } = definition
      for (const [key, row] of before[table] || [])
        if (!next.rows[table].has(key)) {
          await client.query(
            `DELETE FROM ${table} WHERE ${keys.map((name, i) => `${name} = $${i + 1}`).join(' AND ')}`,
            keys.map((name) => row[name]),
          )
        }
    }
    for (const definition of definitions) {
      const { table, keys, collections } = definition
      const columns = [...keys, 'data', ...(collections ? ['collections'] : [])]
      for (const [key, row] of next.rows[table]) {
        if (isDeepStrictEqual(before[table]?.get(key), row)) continue
        const values = columns.map((name) =>
          ['data', 'collections'].includes(name)
            ? JSON.stringify(row[name])
            : row[name],
        )
        await client.query(
          `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')}) ON CONFLICT (${keys.join(', ')}) DO UPDATE SET data = EXCLUDED.data${collections ? ', collections = EXCLUDED.collections' : ''}`,
          values,
        )
      }
    }
  }
  return {
    async read() {
      return reconstruct(await snapshot(requirePool()))
    },
    async save(state, etag) {
      const next = flatten(state)
      return transaction(async (client) => {
        const locked = (
          await client.query(
            'SELECT revision::text AS revision FROM lens_workspace_meta WHERE singleton = true FOR UPDATE',
          )
        ).rows[0]
        if (!locked) throw unavailable()
        if (typeof etag !== 'string' || locked.revision !== etag)
          throw conflict()
        const baseline = await snapshot(client)
        await writeDiff(client, records(baseline), next)
        const updated = await client.query(
          'UPDATE lens_workspace_meta SET data = $1::jsonb, collections = $2::jsonb, revision = revision + 1 WHERE singleton = true RETURNING revision::text AS revision',
          [JSON.stringify(next.data), JSON.stringify(next.collections)],
        )
        return { etag: updated.rows[0].revision }
      })
    },
    // Explicit offline migration entry point. The caller applies schema.sql first.
    async initialize(state) {
      const next = flatten(state)
      return transaction(async (client) => {
        try {
          await client.query(
            'INSERT INTO lens_workspace_meta (data, collections) VALUES ($1::jsonb, $2::jsonb)',
            [JSON.stringify(next.data), JSON.stringify(next.collections)],
          )
        } catch (error) {
          if (error.code === '23505') throw conflict()
          throw error
        }
        await writeDiff(client, {}, next)
        return { etag: '1' }
      })
    },
    async presence({ user, write = false, now = Date.now() }) {
      requirePool()
      if (write)
        await pool.query(
          'INSERT INTO lens_presence (id, first_name, seen_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name, seen_at = EXCLUDED.seen_at',
          [user.id, user.firstName, new Date(now)],
        )
      const result = await pool.query(
        'SELECT id, first_name FROM lens_presence WHERE seen_at > $1 ORDER BY id',
        [new Date(now - 180000)],
      )
      return {
        viewers: result.rows.map((row) => ({
          id: row.id,
          firstName: row.first_name,
          self: row.id === user.id,
        })),
      }
    },
    async close() {
      if (!suppliedPool) await pool?.end()
    },
  }
}
