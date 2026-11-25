import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { createPostgresStore } from '../server/postgres-store.mjs'
import { createHandlers } from '../server/workspace.mjs'

async function dataFile(t) {
  const dir = await mkdtemp(join(tmpdir(), 'lens-postgres-test-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  return join(dir, 'workspace.json')
}

const sample = () => ({
  version: 'business-version',
  updatedAt: '2026-11-25T01:00:00.000Z',
  access: { editorEmails: ['member@example.com'] },
  extra: { preserve: true },
  projects: [
    { id: 'second', name: 'Second', months: [], milestones: [], weeks: [] },
    {
      id: 'first',
      name: 'First',
      months: [
        {
          id: '2026-10',
          draft: { title: 'Draft' },
          report: { title: 'Published' },
          publishedAt: 'then',
        },
      ],
      milestones: [
        { id: 'm2', title: 'Second' },
        { id: 'm1', title: 'First' },
      ],
      weeks: [
        {
          id: 'w',
          label: 'Week',
          tasks: [
            { id: 't2', title: 'Task 2', owners: ['A', 'B'] },
            { id: 't1', title: 'Task 1' },
          ],
        },
      ],
    },
    { id: 'optional', name: 'No optional arrays', months: [] },
  ],
  security: {
    users: [
      {
        id: 'u',
        firstName: 'Paul',
        encryptedCode: 'encrypted',
        codeHash: 'hashed',
      },
    ],
    guestCodes: [{ id: 'g', codeHash: 'guest-hash', consumedBy: 'v' }],
    auditEvents: [{ id: 'a', action: 'signIn' }],
    attempts: {
      global: { start: 123, count: 1 },
      iphash: { start: 123, count: 2 },
    },
    retiredHashes: ['retired-two', 'retired-one'],
    extraSecurity: { value: 1 },
  },
  history: [{ id: 'h', projectId: 'first', action: 'createTask' }],
})

// The fake is a SQL transport: the adapter must reconstruct records and calculate its own diff.
function database() {
  let meta = null,
    tables = {}
  const queries = []
  const pool = {
    async connect() {
      return {
        query,
        release() {
          queries.push({ sql: 'RELEASE' })
        },
      }
    },
    query,
    async end() {},
  }
  async function query(sql, values = []) {
    queries.push({ sql, values: structuredClone(values) })
    if (sql.includes('lens:snapshot'))
      return {
        rows: [
          {
            snapshot: {
              meta: structuredClone(meta),
              ...structuredClone(tables),
            },
          },
        ],
      }
    if (sql.startsWith('SELECT revision'))
      return { rows: meta ? [{ revision: meta.revision }] : [] }
    if (sql.startsWith('INSERT INTO lens_workspace_meta')) {
      if (meta) throw Object.assign(Error('duplicate'), { code: '23505' })
      meta = {
        singleton: true,
        revision: '1',
        data: JSON.parse(values[0]),
        collections: JSON.parse(values[1]),
      }
      return { rows: [] }
    }
    if (sql.startsWith('UPDATE lens_workspace_meta')) {
      meta = {
        ...meta,
        data: JSON.parse(values[0]),
        collections: JSON.parse(values[1]),
        revision: String(BigInt(meta.revision) + 1n),
      }
      return { rows: [{ revision: meta.revision }] }
    }
    const insert = sql.match(/^INSERT INTO (lens_\w+) \(([^)]+)\)/)
    if (insert) {
      const [, table, columns] = insert
      const names = columns.split(',').map((s) => s.trim())
      const row = Object.fromEntries(
        names.map((name, i) => [
          name,
          ['data', 'collections'].includes(name)
            ? JSON.parse(values[i])
            : values[i],
        ]),
      )
      const rows = (tables[table] ??= [])
      const keys = names.filter((n) => !['data', 'collections'].includes(n))
      const at = rows.findIndex((r) => keys.every((k) => r[k] === row[k]))
      if (at >= 0) rows[at] = row
      else rows.push(row)
      return { rows: [] }
    }
    const deletion = sql.match(/^DELETE FROM (lens_\w+) WHERE (.+)/)
    if (deletion) {
      const [, table, where] = deletion
      const keys = [...where.matchAll(/(\w+) = \$\d+/g)].map((m) => m[1])
      tables[table] = (tables[table] || []).filter(
        (r) => !keys.every((k, i) => r[k] === values[i]),
      )
      return { rows: [] }
    }
    if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) return { rows: [] }
    throw Error(`Unhandled SQL: ${sql}`)
  }
  return {
    pool,
    queries,
    get meta() {
      return meta
    },
  }
}

test('Postgres never falls back to seeds when configuration or imported state is missing', async () => {
  const absent = createPostgresStore({ env: {} })
  await assert.rejects(absent.read(), { status: 503 })
  const db = database()
  const store = createPostgresStore({ env: {}, pool: db.pool })
  await assert.rejects(store.read(), { status: 503 })
  await assert.rejects(store.save(sample(), '1'), { status: 503 })
  assert.equal(db.queries.at(-2).sql, 'ROLLBACK')
  assert.equal(db.queries.at(-1).sql, 'RELEASE')
})
test('normalized records round-trip all state and ordered optional collections', async () => {
  const db = database(),
    store = createPostgresStore({ env: {}, pool: db.pool })
  const state = sample()
  await store.initialize(state)
  const result = await store.read()
  assert.deepEqual(result, { state, etag: '1' })
  assert.equal(
    db.queries.filter((q) => q.sql.includes('lens:snapshot')).length,
    1,
  )
  await assert.rejects(store.initialize(state), { status: 409 })
})
test('saving changes only affected records and meta, and CAS rejects a stale revision', async () => {
  const db = database(),
    store = createPostgresStore({ env: {}, pool: db.pool })
  await store.initialize(sample())
  const next = (await store.read()).state
  next.projects[1].weeks[0].tasks[0].title = 'Changed'
  next.history.push({ id: 'h2', action: 'updateTask' })
  db.queries.length = 0
  await store.save(next, '1')
  const writes = db.queries.filter((q) => q.sql.startsWith('INSERT INTO'))
  assert.deepEqual(
    writes.map((q) => q.sql.match(/^INSERT INTO (\w+)/)[1]).sort(),
    ['lens_history_events', 'lens_weekly_tasks'],
  )
  assert.deepEqual((await store.read()).state, next)
  assert.equal((await store.read()).etag, '2')
  db.queries.length = 0
  await assert.rejects(store.save(sample(), '1'), { status: 409 })
  assert.equal(
    db.queries.some((q) => q.sql.startsWith('INSERT INTO')),
    false,
  )
  assert.equal(db.queries.at(-2).sql, 'ROLLBACK')
  assert.equal(db.queries.at(-1).sql, 'RELEASE')
})
test('removing and reordering records preserves exact imported collection shape', async () => {
  const db = database(),
    store = createPostgresStore({ env: {}, pool: db.pool })
  await store.initialize(sample())
  const next = (await store.read()).state
  next.projects.reverse()
  next.projects[1].milestones.reverse()
  next.projects[1].weeks[0].tasks.splice(0, 1)
  delete next.projects[0].months
  delete next.security.retiredHashes
  delete next.history
  await store.save(next, '1')
  assert.deepEqual((await store.read()).state, next)
  assert.equal(
    db.queries.some((q) => q.sql.startsWith('DELETE FROM lens_weekly_tasks')),
    true,
  )
})

async function call(handler, method = 'GET', body) {
  const response = { status: 200, headers: {} }
  await handler(
    {
      method,
      body,
      headers: { host: 'localhost', origin: 'http://localhost' },
    },
    {
      setHeader(k, v) {
        response.headers[k.toLowerCase()] = v
      },
      set statusCode(v) {
        response.status = v
      },
      end(value) {
        response.body = JSON.parse(value)
      },
    },
  )
  return response
}
test('postgres selection fails closed rather than falling back to a configured Blob', async (t) => {
  const file = await dataFile(t)
  let blobReads = 0
  const handlers = createHandlers({
    env: {
      LENS_STORAGE: 'postgres',
      LENS_DATA_FILE: file,
      LENS_DEV_AUTH_BYPASS: '1',
      BLOB_READ_WRITE_TOKEN: 'old-token',
    },
    blob: {
      get() {
        blobReads++
        throw Error('must not read')
      },
    },
  })
  assert.equal((await call(handlers.workspace)).status, 503)
  assert.equal(blobReads, 0)
})
test('handler business and security changes use Postgres CAS without touching files or Blob', async (t) => {
  const file = await dataFile(t)
  const db = database(),
    store = createPostgresStore({ env: {}, pool: db.pool })
  await store.initialize(sample())
  const handlers = createHandlers({
    env: {
      LENS_STORAGE: 'postgres',
      LENS_DATA_FILE: file,
      DATABASE_URL: 'postgres://test',
      LENS_DEV_AUTH_BYPASS: '1',
      BLOB_READ_WRITE_TOKEN: 'must-not-be-used',
    },
    blob: { get() { throw Error('Live Postgres must not read Blob') }, put() { throw Error('Live Postgres must not write Blob') } },
    postgresStore: store,
    projects: [],
  })
  const initial = await call(handlers.workspace)
  assert.equal(initial.status, 200)
  const updated = await call(handlers.workspace, 'POST', {
    action: 'createProject',
    expectedVersion: initial.body.version,
    data: { name: 'From SQL' },
  })
  assert.equal(updated.status, 200)
  assert.equal((await store.read()).state.projects.at(-1).name, 'From SQL')
  assert.equal((await store.read()).etag, '2')
})
test('frozen migration snapshots permit reads and logout but reject all workspace/security/login writes', async (t) => {
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises'),
    { tmpdir } = await import('node:os'),
    { join } = await import('node:path')
  const dir = await mkdtemp(join(tmpdir(), 'lens-freeze-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const file = join(dir, 'workspace.json')
  const frozen = { ...sample(), storageMigration: { status: 'frozen' } }
  await writeFile(file, JSON.stringify(frozen))
  const handlers = createHandlers({
    env: { LENS_DATA_FILE: file, LENS_DEV_AUTH_BYPASS: '1' },
    projects: [],
  })
  assert.equal((await call(handlers.workspace)).status, 200)
  assert.equal(
    (
      await call(handlers.workspace, 'POST', {
        action: 'createProject',
        expectedVersion: frozen.version,
        data: { name: 'Blocked' },
      })
    ).status,
    503,
  )
  const configured = createHandlers({
    env: {
      LENS_DATA_FILE: file,
      LENS_GOOGLE_CLIENT_ID: '123.apps.googleusercontent.com',
      LENS_ADMIN_EMAILS: 'owner@example.com',
      LENS_SESSION_SECRET: 'x'.repeat(40),
    },
    projects: [],
  })
  assert.equal(
    (await call(configured.session, 'POST', { code: 'INVALID' })).status,
    503,
  )
  const logout = await call(configured.session, 'DELETE')
  assert.equal(logout.status, 200)
  assert.match(logout.headers['set-cookie'].join(';'), /Max-Age=0/)
  assert.deepEqual(JSON.parse(await readFile(file, 'utf8')), frozen)
})
test('logout clears authentication cookies even when the selected database is unavailable', async (t) => {
  const file = await dataFile(t)
  const handlers = createHandlers({
    env: {
      LENS_STORAGE: 'postgres',
      LENS_DATA_FILE: file,
      DATABASE_URL: 'postgres://test',
    },
    postgresStore: {
      async read() {
        throw Error('offline')
      },
    },
  })
  const result = await call(handlers.session, 'DELETE')
  assert.equal(result.status, 503)
  assert.match(result.headers['set-cookie'].join(';'), /Max-Age=0/)
})
test('SQL presence only returns first names, honors 180-second TTL, and never changes workspace revision', async () => {
  const calls = [],
    rows = new Map()
  const pool = {
    async query(sql, values) {
      calls.push({ sql, values })
      if (sql.startsWith('INSERT INTO lens_presence')) {
        rows.set(values[0], {
          id: values[0],
          first_name: values[1],
          seen: values[2].getTime(),
        })
        return { rows: [] }
      }
      if (sql.startsWith('SELECT id, first_name'))
        return {
          rows: [...rows.values()].filter((r) => r.seen > values[0].getTime()),
        }
      throw Error('Unexpected revision/state query')
    },
  }
  const store = createPostgresStore({ env: {}, pool }),
    user = {
      id: 'u',
      firstName: 'Paul',
      lastName: 'Private',
      email: 'private@example.com',
    }
  assert.deepEqual(await store.presence({ user, write: true, now: 1000000 }), {
    viewers: [{ id: 'u', firstName: 'Paul', self: true }],
  })
  assert.deepEqual(await store.presence({ user, now: 1179999 }), {
    viewers: [{ id: 'u', firstName: 'Paul', self: true }],
  })
  assert.deepEqual(await store.presence({ user, now: 1180000 }), {
    viewers: [],
  })
  assert.equal(
    calls.every(({ sql }) => !sql.includes('workspace_meta')),
    true,
  )
  assert.equal(
    calls.some(
      ({ values }) =>
        values.includes(user.email) || values.includes(user.lastName),
    ),
    false,
  )
})
test(
  'real PostgreSQL imports exactly, rolls back failed writes, and consumes one winning CAS revision',
  { skip: !process.env.TEST_DATABASE_URL },
  async (t) => {
    const schema = `lens_test_${randomUUID().replaceAll('-', '')}`
    const admin = new Pool({
      connectionString: process.env.TEST_DATABASE_URL,
      max: 1,
    })
    const pool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL,
      max: 3,
      options: `-c search_path=${schema},public`,
    })
    t.after(async () => {
      await pool.end()
      try {
        await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
      } finally {
        await admin.end()
      }
    })
    await admin.query(`CREATE SCHEMA ${schema}`)
    await pool.query(
      await readFile(new URL('../server/schema.sql', import.meta.url), 'utf8'),
    )
    const store = createPostgresStore({ env: {}, pool }),
      initial = sample()
    await assert.rejects(store.read(), { status: 503 })
    await store.initialize(initial)
    assert.deepEqual(await store.read(), { state: initial, etag: '1' })
    await assert.rejects(store.initialize(initial), { status: 409 })
    assert.deepEqual((await store.read()).state, initial)
    const before = (
      await pool.query(
        'SELECT xmin::text AS xmin FROM lens_accounts WHERE id=$1',
        ['u'],
      )
    ).rows[0].xmin
    const left = structuredClone(initial),
      right = structuredClone(initial)
    left.projects[1].weeks[0].tasks[0].title = 'Left'
    right.projects[1].weeks[0].tasks[0].title = 'Right'
    const results = await Promise.allSettled([
      store.save(left, '1'),
      store.save(right, '1'),
    ])
    assert.deepEqual(results.map((r) => r.status).sort(), [
      'fulfilled',
      'rejected',
    ])
    assert.equal(
      results.find((r) => r.status === 'rejected').reason.status,
      409,
    )
    const winner = results[0].status === 'fulfilled' ? left : right
    assert.deepEqual(await store.read(), { state: winner, etag: '2' })
    assert.equal(
      (
        await pool.query(
          'SELECT xmin::text AS xmin FROM lens_accounts WHERE id=$1',
          ['u'],
        )
      ).rows[0].xmin,
      before,
    )
    const failing = createPostgresStore({
      env: {},
      pool: {
        async connect() {
          const client = await pool.connect()
          return {
            async query(sql, values) {
              if (sql.startsWith('UPDATE lens_workspace_meta'))
                throw Error('simulated transaction failure')
              return client.query(sql, values)
            },
            release() {
              client.release()
            },
          }
        },
      },
    })
    const broken = structuredClone(winner)
    broken.projects[1].weeks[0].tasks[0].title = 'Must roll back'
    await assert.rejects(
      failing.save(broken, '2'),
      /simulated transaction failure/,
    )
    assert.deepEqual(await store.read(), { state: winner, etag: '2' })
    assert.deepEqual(
      await store.presence({
        user: { id: 'u', firstName: 'Paul', lastName: 'Private' },
        write: true,
        now: 1000000,
      }),
      { viewers: [{ id: 'u', firstName: 'Paul', self: true }] },
    )
    assert.deepEqual(
      await store.presence({ user: { id: 'u' }, now: 1180000 }),
      { viewers: [] },
    )
    assert.equal((await store.read()).etag, '2')
  },
)
