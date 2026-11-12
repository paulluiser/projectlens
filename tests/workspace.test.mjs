import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHandlers } from '../server/workspace.mjs'
import { fixtureProjects } from './fixture-projects.mjs'

const report = JSON.parse(await readFile(new URL('../data/projects/simsdotnet/2026-09/report.json', import.meta.url)))
function reportFor(upcomingMonth) {
  return {...structuredClone(report),next:{...structuredClone(report.next),items:report.next.items.map(item=>{const day=String(Math.min(Number(item.day),28));return {...item,day,date:`${upcomingMonth}-${day.padStart(2,'0')}`}})}}
}
async function fixture(t, extra = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'lens-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  return createHandlers({ env: { LENS_DATA_FILE: join(dir, 'workspace.json'), ...extra }, projects: fixtureProjects })
}
async function call(handler, method = 'GET', body, headers = {}) {
  const req = { method, body, headers: { host: 'localhost:5173', origin: 'http://localhost:5173', ...headers } }
  let status = 200; const responseHeaders = {}
  const res = { setHeader(k,v) { responseHeaders[k.toLowerCase()] = v }, end(value) { this.body = JSON.parse(value) }, set statusCode(v) { status = v }, get statusCode() { return status } }
  await handler(req, res)
  return { status, body: res.body, headers: responseHeaders }
}
const mutate = (h, action, version, data, projectId = 'example', monthId) => call(h.workspace, 'POST', {action, expectedVersion: version, data, projectId, monthId})

test('workspace persists project and report CRUD and canonical month labels', async t => {
  const h = await fixture(t)
  const initial = await call(h.workspace)
  assert.equal(initial.body.canEdit, true)
  assert.equal(initial.body.projects[0].months[0].report.title, report.title)
  let result = await mutate(h, 'createProject', initial.body.version, { name: 'Example', description: 'A project' })
  assert.equal(result.status, 200)
  let version = result.body.version
  result = await mutate(h, 'createReport', version, reportFor('2027-02'), 'example', '2027-01')
  assert.equal(result.status, 200)
  let project = result.body.projects.find(p => p.id === 'example')
  assert.equal(project.months[0].draft.month, '2027-01')
  assert.equal(project.months[0].draft.label, 'January 2027')
  result = await mutate(h, 'updateReport', result.body.version, { ...reportFor('2027-02'), title: 'Revised' }, 'example', '2027-01')
  assert.equal(result.body.projects.find(p => p.id === 'example').months[0].draft.title, 'Revised')
  result = await mutate(h, 'updateProject', result.body.version, {name:'Renamed'})
  assert.equal(result.body.projects.find(p => p.id === 'example').name, 'Renamed')
  result = await mutate(h, 'deleteReport', result.body.version, undefined, 'example', '2027-01')
  assert.equal(result.body.projects.find(p => p.id === 'example').months.length, 0)
  result = await mutate(h, 'deleteProject', result.body.version)
  assert.equal(result.body.projects.some(p => p.id === 'example'), false)
  assert.deepEqual((await call(h.workspace)).body.projects, result.body.projects)
})

test('a report draft can record more completed tasks than planned', async t => {
  const h = await fixture(t)
  const { body } = await call(h.workspace)
  const data = reportFor('2026-11')
  data.progress = { ...data.progress, planned: 28, completed: 36 }

  const result = await mutate(h, 'createReport', body.version, data, 'simsdotnet', '2026-10')

  assert.equal(result.status, 200, JSON.stringify(result.body))
  const { progress } = (await call(h.workspace)).body.projects[0].months[1].draft
  assert.equal(progress.planned, 28)
  assert.equal(progress.completed, 36)
})

test('conflicts, pending report replacement, and missing records are safe', async t => {
  const h = await fixture(t); let {body: state} = await call(h.workspace)
  assert.equal((await mutate(h, 'createProject', state.version, {name:'SIMSDotNet'})).status, 409)
  assert.equal((await mutate(h, 'deleteProject', state.version, undefined, 'missing')).status, 404)
  const created = await mutate(h, 'createReport', state.version, reportFor('2026-11'), 'simsdotnet', '2026-10')
  assert.equal(created.status, 200)
  assert.equal((await mutate(h, 'createReport', created.body.version, reportFor('2026-11'), 'simsdotnet', '2026-10')).status, 409)
  assert.equal((await mutate(h, 'deleteProject', state.version, undefined, 'simsdotnet')).status, 409)
})

test('concurrent expected versions commit exactly one mutation', async t => {
  const h = await fixture(t); const {body} = await call(h.workspace)
  const results = await Promise.all(['One','Two'].map(name => mutate(h, 'createProject', body.version, {name})))
  assert.deepEqual(results.map(r=>r.status).sort(), [200,409])
  assert.equal((await call(h.workspace)).body.projects.length, 2)
})

test('validation rejects invalid data without changing state', async t => {
  const h = await fixture(t); const {body} = await call(h.workspace)
  for (const data of [{...report, progress:{...report.progress, completed:-1}}, {...report,next:{...report.next,items:[{day:'30',date:'2026-02-30',title:'Invalid',owner:'Me'}]}}, {...report,wins:'bad'}]) {
    assert.equal((await mutate(h, 'createReport', body.version, data, 'simsdotnet', '2026-10')).status, 400)
  }
  assert.equal((await mutate(h, 'createProject', body.version, {name:{}})).status,400)
  assert.equal((await call(h.workspace,'POST',{action:'createProject',expectedVersion:body.version,data:{name:'Cross'}},{origin:'https://evil.test'})).status,403)
  assert.equal((await call(h.workspace)).body.version, body.version)
})

test('password sessions reject bad passwords, tampering, expiry, and missing origin', async t => {
  let now = Date.now(); const h0 = await fixture(t, {LENS_EDITOR_PASSWORD:'secret'})
  const h = createHandlers({env:h0.env,now:()=>now,projects:fixtureProjects})
  const {body} = await call(h.workspace)
  assert.equal(body.canEdit,false)
  assert.equal((await mutate(h,'createProject',body.version,{name:'Locked'})).status,401)
  assert.equal((await call(h.session,'POST',{password:'wrong'})).status,401)
  const login = await call(h.session,'POST',{password:'secret'})
  assert.equal(login.status,200)
  const cookie = login.headers['set-cookie'].split(';')[0]
  assert.equal((await call(h.workspace,'GET',undefined,{cookie})).body.canEdit,true)
  assert.equal((await call(h.workspace,'GET',undefined,{cookie:cookie+'x'})).body.canEdit,false)
  now += 9 * 60 * 60 * 1000
  assert.equal((await call(h.workspace,'GET',undefined,{cookie})).body.canEdit,false)
  assert.equal((await call(h.session,'POST',{password:'secret'},{origin:undefined})).status,403)
  assert.match((await call(h.session,'DELETE')).headers['set-cookie'],/Max-Age=0/)
})

test('production without blob stays read-only even with password', async t => {
  const h = await fixture(t,{VERCEL:'1',LENS_EDITOR_PASSWORD:'secret'})
  const {body} = await call(h.workspace)
  assert.equal(body.storageReady,false); assert.equal(body.canEdit,false)
  assert.equal((await mutate(h,'createProject',body.version,{name:'No'})).status,503)
})

test('malformed and oversized bodies and invalid date strings fail as input errors', async t => {
  const h = await fixture(t); const {body} = await call(h.workspace)
  assert.equal((await call(h.workspace,'POST','{broken')).status,400)
  assert.equal((await call(h.workspace,'POST','x'.repeat(1024*1024+1))).status,413)
  const invalid = {...report,next:{...report.next,items:[{day:'99',date:'2026-01-99',title:'Bad',owner:'Me'}]}}
  assert.equal((await mutate(h,'createReport',body.version,invalid,'simsdotnet','2026-10')).status,400)
})

test('private blob initialization and updates use conditional writes to preserve concurrent edits', async () => {
  let stored = null; let revision = 0
  const blob = {
    async get(path,options) {
      assert.equal(path,'project-lens/workspace.json'); assert.equal(options.useCache,false); assert.equal(options.access,'private')
      return stored && {statusCode:200, stream:new Response(stored).body, headers:new Headers(), blob:{etag:String(revision)}}
    },
    async put(path,contents,options) {
      assert.equal(path,'project-lens/workspace.json'); assert.equal(options.access,'private'); assert.equal(options.addRandomSuffix,false)
      if ((stored && options.allowOverwrite === false) || (options.ifMatch && options.ifMatch !== String(revision))) throw Object.assign(new Error('Precondition failed'),{status:412})
      assert.equal(stored ? options.ifMatch : options.allowOverwrite, stored ? String(revision) : false)
      stored = contents; revision += 1
      return {etag:String(revision)}
    },
  }
  const h = createHandlers({env:{VERCEL:'1', BLOB_READ_WRITE_TOKEN:'fake-token',LENS_EDITOR_PASSWORD:'secret'},blob,projects:fixtureProjects})
  const login = await call(h.session,'POST',{password:'secret'})
  assert.match(login.headers['set-cookie'],/Secure/)
  const cookie = login.headers['set-cookie'].split(';')[0]
  const {body} = await call(h.workspace)
  const post = (version,name) => call(h.workspace,'POST',{action:'createProject',expectedVersion:version,data:{name}},{cookie})
  let results = await Promise.all([post(body.version,'First'),post(body.version,'Second')])
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409])
  const {body: updated} = await call(h.workspace)
  results = await Promise.all([post(updated.version,'Third'),post(updated.version,'Fourth')])
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409])
  assert.equal((await call(h.workspace)).body.projects.length,3)
})

test('blank optional report text is accepted for a newly authored report', async t => {
  const h = await fixture(t); const {body} = await call(h.workspace)
  const blocker = {title:'Learning curve', impact:'The team is adopting a new workflow.'}
  const blank = {...report,source:'',wins:[{title:'Delivered',value:'1',detail:''}],blockers:[blocker],next:{...report.next,support:'',items:[],milestones:[]}}
  const response = await mutate(h,'createReport',body.version,blank,'simsdotnet','2026-10')
  assert.equal(response.status,200)
  assert.equal(response.body.projects[0].months[1].draft.source,'')
  assert.deepEqual(response.body.projects[0].months[1].draft.blockers,[blocker])
})

test('unconfigured production editing offers no password login', async t => {
  const h=await fixture(t,{VERCEL:'1'})
  assert.equal((await call(h.session)).body.authRequired,false)
})


test('deleting a pending reporting month removes its catalog entry', async t => {
  const h=await fixture(t); const {body}=await call(h.workspace)
  const deleted=await mutate(h,'deleteReport',body.version,undefined,'simsdotnet','2026-10')
  assert.equal(deleted.status,200)
  assert.equal(deleted.body.projects[0].months.some(month=>month.id==='2026-10'),false)
  assert.equal((await mutate(h,'deleteReport',deleted.body.version,undefined,'simsdotnet','2026-10')).status,404)
})

test('cumulative project completions cannot exceed total project tasks', async t => {
  const h=await fixture(t); const {body}=await call(h.workspace)
  const data={...reportFor('2026-11'),progress:{...report.progress,projectCompleted:189}}
  const response=await mutate(h,'createReport',body.version,data,'simsdotnet','2026-10')
  assert.equal(response.status,400)
  assert.match(response.body.error,/exceed/i)
  assert.equal((await call(h.workspace)).body.version,body.version)
})

test('reporting percentages support decimals and upcoming month labels are canonical across year end', async t => {
  const h=await fixture(t); const {body}=await call(h.workspace)
  const data=reportFor('2027-01')
  data.next.month='Untrusted label'
  data.progress.reporting=[['Timelogs',96.25]]
  const response=await mutate(h,'createReport',body.version,data,'simsdotnet','2026-12')
  assert.equal(response.status,200)
  const saved=response.body.projects[0].months.find(month=>month.id==='2026-12').draft
  assert.equal(saved.next.month,'January 2027')
  assert.equal(saved.progress.reporting[0][1],96.25)
})

test('action dates must fall in the next calendar month', async t => {
  const h=await fixture(t); const {body}=await call(h.workspace)
  const response=await mutate(h,'createReport',body.version,report,'simsdotnet','2026-10')
  assert.equal(response.status,400)
  assert.match(response.body.error,/upcoming month/i)
})


test('drafts remain private until publishing and later edits preserve the published snapshot', async t => {
  const base = await fixture(t, {LENS_EDITOR_PASSWORD:'secret'})
  const h = createHandlers({env:base.env,now:()=>Date.parse('2026-11-11T08:00:00Z'),projects:fixtureProjects})
  const login = await call(h.session,'POST',{password:'secret'})
  const headers = {cookie:login.headers['set-cookie'].split(';')[0]}
  const post = (action,state,data,monthId='2026-12') => call(h.workspace,'POST',{action,expectedVersion:state.version,data,projectId:'simsdotnet',monthId},headers)
  let state = (await call(h.workspace,'GET',undefined,headers)).body
  let response = await post('createReport',state,{...reportFor('2027-01'),title:'Private draft',presenterNotes:'Secret speaking notes'})
  assert.equal(response.status,200)
  state = response.body
  let month = state.projects[0].months.find(month=>month.id==='2026-12')
  assert.equal(month.draft.title,'Private draft')
  assert.equal(month.report,undefined)
  assert.deepEqual(month.draft.carryForward,[])
  let publicState = (await call(h.workspace)).body
  assert.equal(publicState.projects[0].months.some(month=>month.id==='2026-12'),false)
  assert.equal(publicState.projects[0].months.some(month=>month.id==='2026-10'),true)
  assert.equal(JSON.stringify(publicState).includes('Secret speaking notes'),false)
  response = await post('publishReport',state)
  assert.equal(response.status,200)
  state = response.body
  month = state.projects[0].months.find(month=>month.id==='2026-12')
  assert.equal(month.draft,undefined)
  assert.equal(month.report.title,'Private draft')
  assert.equal(month.publishedAt,'2026-11-11T08:00:00.000Z')
  assert.equal(month.report.presenterNotes,'Secret speaking notes')
  publicState = (await call(h.workspace)).body
  assert.equal(publicState.projects[0].months.find(month=>month.id==='2026-12').report.presenterNotes,undefined)
  assert.equal((await post('publishReport',state)).status,409)
  const published = structuredClone(month.report)
  response = await post('updateReport',state,{...reportFor('2027-01'),title:'Private revision',presenterNotes:'New notes'})
  assert.equal(response.status,200)
  const revisedState = response.body
  month = revisedState.projects[0].months.find(month=>month.id==='2026-12')
  assert.deepEqual(month.report,published)
  assert.equal(month.draft.title,'Private revision')
  assert.equal((await post('publishReport',state)).status,409)
  publicState = (await call(h.workspace)).body
  month = publicState.projects[0].months.find(month=>month.id==='2026-12')
  assert.equal(month.report.title,'Private draft')
  assert.equal(month.draft,undefined)
  assert.equal(JSON.stringify(publicState).includes('New notes'),false)
  response = await post('updateProject',revisedState,{name:'Updated name'},undefined)
  assert.equal(response.status,200)
  assert.equal(response.body.projects[0].months.find(month=>month.id==='2026-12').draft.title,'Private revision')
  assert.equal((await call(h.workspace,'POST',{action:'publishReport',expectedVersion:response.body.version,projectId:'simsdotnet',monthId:'2026-12'})).status,401)
})

test('carry forward entries and presenter notes are validated and persisted', async t => {
  const h = await fixture(t)
  const {body} = await call(h.workspace)
  const entry = {sourceMonth:'2026-09',sourceIndex:0,title:'Revisit rollout',owner:'Paul',date:'2026-10-01',status:'carried-over',context:'Waiting on review'}
  const data = {...reportFor('2026-11'),presenterNotes:'Speaker notes',carryForward:[entry]}
  for (const invalid of [
    {...data,presenterNotes:2}, {...data,carryForward:{}}, {...data,carryForward:null},
    ...[{sourceMonth:'2026-10'},{sourceMonth:'2026-11'},{sourceMonth:'2026-00'},{sourceIndex:-1},{sourceIndex:0.5},{status:'unknown'},{context:5},{title:''}].map(change=>({...data,carryForward:[{...entry,...change}]})),
  ]) {
    assert.equal((await mutate(h,'createReport',body.version,invalid,'simsdotnet','2026-10')).status,400)
  }
  assert.equal((await call(h.workspace)).body.version,body.version)
  const response = await mutate(h,'createReport',body.version,data,'simsdotnet','2026-10')
  assert.equal(response.status,200)
  const saved = response.body.projects[0].months.find(month=>month.id==='2026-10').draft
  assert.equal(saved.presenterNotes,'Speaker notes')
  assert.deepEqual(saved.carryForward,[entry])
  for (const status of ['completed','changed','dropped']) {
    const state = (await call(h.workspace)).body
    assert.equal((await mutate(h,'updateReport',state.version,{...data,carryForward:[{...entry,status,context:undefined}]},'simsdotnet','2026-10')).status,200)
  }
})


test('editing a seeded publication creates a draft and preserves the published report', async t => {
  const h = await fixture(t)
  const {body} = await call(h.workspace)
  assert.equal((await mutate(h,'createReport',body.version,report,'simsdotnet','2026-09')).status,409)
  assert.equal((await mutate(h,'updateReport',body.version,report,'simsdotnet','2026-12')).status,404)
  assert.equal((await mutate(h,'publishReport',body.version,undefined,'simsdotnet','2026-12')).status,404)
  const response = await mutate(h,'updateReport',body.version,{...report,title:'Unpublished revision'},'simsdotnet','2026-09')
  assert.equal(response.status,200)
  const month = response.body.projects[0].months.find(month=>month.id==='2026-09')
  assert.equal(month.report.title,report.title)
  assert.equal(month.draft.title,'Unpublished revision')
  assert.equal(month.draft.presenterNotes,'')
  assert.deepEqual(month.draft.carryForward,[])
})

test('the shipped seed publishes every project and report in the catalog', async () => {
  const { seedProjects } = await import('../server/seed.mjs')
  const catalog = JSON.parse(await readFile(new URL('../data/projects/catalog.json', import.meta.url)))
  assert.deepEqual(seedProjects.map(project => project.id), catalog.map(project => project.id))
  for (const project of seedProjects) for (const month of project.months) {
    assert.ok(month.report, `${project.id} ${month.id} has a report`)
    assert.equal(month.report.month, month.id)
  }
})
