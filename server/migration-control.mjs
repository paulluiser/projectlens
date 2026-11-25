// Temporary cutover control. Enabled only by a short-lived, high-entropy operator key.
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { get, put } from '@vercel/blob'
import { Pool } from 'pg'
import { createPostgresStore } from './postgres-store.mjs'
import { canonical, checksum, counts, destinationState } from './migration-format.mjs'

const path = 'project-lens/workspace.json'
export function createMigrationControl({ env = process.env, now = Date.now, blob = { get, put }, storeFactory = createPostgresStore, applySchema } = {}) {
  const fail = (status,message) => Object.assign(new Error(message),{status})
  async function source() {
    const result = await blob.get(path,{access:'private',token:env.BLOB_READ_WRITE_TOKEN,useCache:false,headers:{'accept-encoding':'identity'}})
    if (!result?.stream) throw fail(503,'Source workspace is missing.')
    const state = JSON.parse(await new Response(result.stream).text())
    if (!Array.isArray(state.projects) || !state.version) throw fail(503,'Source workspace is invalid.')
    return {state,etag:result.blob.etag}
  }
  function snapshot(state,etag) { return {format:'project-lens-migration-v1',capturedAt:new Date(now()).toISOString(),sourceETag:etag,checksum:checksum(state),counts:counts(state),state} }
  return async (req,res) => {
    res.setHeader('Cache-Control','no-store')
    res.setHeader('Content-Type','application/json; charset=utf-8')
    res.setHeader('X-Content-Type-Options','nosniff')
    let store
    try {
      const token = req.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1]
      const expected = env.LENS_MIGRATION_TOKEN_HASH
      const digest = token && createHash('sha256').update(token).digest('hex')
      if (!digest || !/^[a-f0-9]{64}$/.test(expected || '') || !timingSafeEqual(Buffer.from(digest),Buffer.from(expected)) || !(Date.parse(env.LENS_MIGRATION_EXPIRES_AT)>now())) throw fail(404,'Not found.')
      const url = new URL(req.url || '/', 'https://localhost')
      let action = url.searchParams.get('action')
      if (req.method === 'POST') {
        let body = req.body
        if (body === undefined) { let text='';for await (const chunk of req) { text+=chunk;if(Buffer.byteLength(text)>1024)throw fail(413,'Request too large.') }body=text }
        if (typeof body === 'string') body=JSON.parse(body)
        action=body?.action
      } else if (req.method !== 'GET') throw fail(405,'Method not allowed.')
      if (['freeze','initialize','schema'].includes(action) && req.method!=='POST') throw fail(405,'Use POST for this operation.')
      if (action === 'export' || action === 'freeze') {
        const {state,etag}=await source()
        if (action === 'freeze' && state.storageMigration?.status !== 'frozen') {
          state.storageMigration={status:'frozen',startedAt:new Date(now()).toISOString()}
          state.version=randomUUID()
          const result=await blob.put(path,JSON.stringify(state),{access:'private',token:env.BLOB_READ_WRITE_TOKEN,addRandomSuffix:false,contentType:'application/json',ifMatch:etag})
          return res.end(JSON.stringify(snapshot(state,result.etag)))
        }
        return res.end(JSON.stringify(snapshot(state,etag)))
      }
      if (!env.DATABASE_URL || env.DATABASE_URL === '[SENSITIVE]') throw fail(503,'Database is not connected.')
      if (action === 'schema') {
        if (applySchema) await applySchema()
        else {
          const pool=new Pool({connectionString:env.DATABASE_URL,max:1})
          try {await pool.query(await readFile(new URL('./schema.sql',import.meta.url),'utf8'))} finally {await pool.end()}
        }
        return res.end(JSON.stringify({schemaApplied:true}))
      }
      store=storeFactory({env})
      if (action === 'export-db') {const actual=await store.read();return res.end(JSON.stringify(snapshot(actual.state,actual.etag)))}
      if (!['initialize','verify'].includes(action)) throw fail(400,'Unknown migration action.')
      const {state,etag}=await source()
      const original=snapshot(state,etag)
      const expectedState=destinationState(original)
      if (action==='initialize') await store.initialize(expectedState)
      const actual=await store.read()
      if (JSON.stringify(canonical(expectedState))!==JSON.stringify(canonical(actual.state))) throw fail(409,'Database verification failed. Keep production on the source store.')
      res.end(JSON.stringify({verified:true,checksum:checksum(actual.state),sourceChecksum:original.checksum,counts:counts(actual.state)}))
    } catch(error) {
      res.statusCode=error.status || 503
      res.end(JSON.stringify({error:error.status?error.message:'Migration operation failed. No storage cutover was performed.'}))
    } finally {await store?.close()}
  }
}
