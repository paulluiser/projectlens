import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createMigrationControl } from '../server/migration-control.mjs'
const token='a'.repeat(64)
const clock=Date.parse('2026-11-25T06:00:00Z')
async function call(handler,action,{authorized=true,method='GET'}={}) {
  let status=200;let data;const headers={}
  await handler({method,url:`/api/storage-migration?action=${action}`,headers:{...(authorized?{authorization:`Bearer ${token}`}:{})},...(method==='POST'?{body:{action}}:{})},{setHeader(k,v){headers[k]=v},set statusCode(v){status=v},end(body){data=JSON.parse(body)}})
  return {status,data,headers}
}
test('temporary migration control fails closed, freezes by CAS and verifies exact destination data',async()=>{
  let source={projects:[{id:'a',months:[],milestones:[]}],version:'source',security:{users:[{id:'u',encryptedCode:'encrypted-value'}],auditEvents:[]}}
  let revision=1;let destination;let initialized=0
  const env={LENS_MIGRATION_TOKEN_HASH:createHash('sha256').update(token).digest('hex'),LENS_MIGRATION_EXPIRES_AT:new Date(clock+60000).toISOString(),BLOB_READ_WRITE_TOKEN:'secret-token',DATABASE_URL:'postgres://unused'}
  const blob={async get(){return {stream:new Response(JSON.stringify(source)).body,blob:{etag:String(revision)}}},async put(path,text,options){assert.equal(options.ifMatch,String(revision));source=JSON.parse(text);return {etag:String(++revision)}}}
  const storeFactory=()=>({async initialize(state){assert.equal(initialized++,0);destination=structuredClone(state)},async read(){return {state:structuredClone(destination),etag:'1'}},async close(){}})
  const handler=createMigrationControl({env,now:()=>clock,blob,storeFactory,applySchema:async()=>{}})
  assert.equal((await call(handler,'export',{authorized:false})).status,404)
  assert.equal((await call(createMigrationControl({env:{...env,LENS_MIGRATION_EXPIRES_AT:new Date(clock).toISOString()},now:()=>clock,blob}),'export')).status,404)
  const original=await call(handler,'export');assert.equal(original.status,200);assert.equal(original.headers['Cache-Control'],'no-store');assert.equal(JSON.stringify(original.data).includes('secret-token'),false)
  assert.equal((await call(handler,'freeze')).status,405)
  assert.equal((await call(handler,'initialize',{method:'POST'})).status,503);assert.equal(initialized,0)
  const frozen=await call(handler,'freeze',{method:'POST'});assert.equal(frozen.data.state.storageMigration.status,'frozen');assert.notEqual(source.version,'source')
  const imported=await call(handler,'initialize',{method:'POST'});assert.equal(imported.data.verified,true);assert.equal(destination.storageMigration.status,'completed');assert.deepEqual(destination.security,original.data.state.security)
  assert.equal((await call(handler,'verify')).data.verified,true)
  destination.projects[0].id='wrong'
  assert.equal((await call(handler,'verify')).status,409)
})
