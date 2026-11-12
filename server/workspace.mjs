import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, rename, writeFile, unlink } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import * as vercelBlob from '@vercel/blob'
import { seedProjects } from './seed.mjs'

const MAX_BODY = 1024 * 1024
const BLOB_PATH = 'project-lens/workspace.json'
const COOKIE = 'lens_editor'
const queues = new Map()
const seed = { projects: seedProjects, version: createHash('sha256').update(JSON.stringify(seedProjects)).digest('hex') }
const failure = (status, message) => Object.assign(new Error(message), { status })
const validId = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 100
const validMonth = value => typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && Number(value.slice(0,4)) >= 1900
const clone = value => structuredClone(value)

function object(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw failure(400, `${field} must be an object.`)
  return value
}
function text(value, field, optional = false) {
  if (optional && value === undefined) return undefined
  if (typeof value !== 'string' || value.length > 10000 || (!optional && !value.trim())) throw failure(400, `${field} must be text.`)
  return value.trim()
}
function number(value, field, { integer = true, max = 1e9 } = {}) {
  if (!Number.isFinite(value) || value < 0 || value > max || (integer && !Number.isInteger(value))) throw failure(400, `${field} must be a valid nonnegative number.`)
  return value
}
function list(value, field, map) {
  if (!Array.isArray(value) || value.length > 200) throw failure(400, `${field} must be an array of at most 200 items.`)
  return value.map(map)
}
function strings(value, fields, optional = []) {
  object(value, 'Item')
  return Object.fromEntries([...fields, ...optional].flatMap(key => {
    const result = text(value[key], key, optional.includes(key))
    return result === undefined ? [] : [[key, result]]
  }))
}
function monthLabels(monthId) {
  const date = new Date(`${monthId}-01T00:00:00Z`)
  return { month: monthId, label: date.toLocaleDateString('en-US', { month:'long', year:'numeric', timeZone:'UTC' }), name: date.toLocaleDateString('en-US', {month:'long',timeZone:'UTC'}) }
}
function validateReport(data, monthId) {
  object(data, 'Report')
  const progress = object(data.progress, 'Progress')
  const numbers = Object.fromEntries(['completed','planned','carryOver','projectCompleted','total'].map(key => [key, number(progress[key],key)]))
  if (numbers.projectCompleted > numbers.total) throw failure(400,'Project completed count cannot exceed project total.')
  const upcomingDate = new Date(`${monthId}-01T00:00:00Z`)
  upcomingDate.setUTCMonth(upcomingDate.getUTCMonth()+1)
  const upcomingMonth = upcomingDate.toISOString().slice(0,7)
  const pairs = (value, field, { max, integer = true, allowMissingCount = false }) => list(value, field, pair => {
    if (!Array.isArray(pair) || pair.length !== 2) throw failure(400, `${field} entries must have a label and count.`)
    return [text(pair[0], field), allowMissingCount && pair[1] === null ? null : number(pair[1], field, { max, integer })]
  })
  const next = object(data.next, 'Next')
  return {
    ...monthLabels(monthId), ...strings(data,['title','coverLine'],['source']),
    presenterNotes:text(data.presenterNotes,'presenterNotes',true) ?? '',
    carryForward:list(data.carryForward === undefined ? [] : data.carryForward,'carryForward',item => {
      const result = strings(item,['sourceMonth','title','owner','date','status'],['context'])
      if (!validMonth(result.sourceMonth) || result.sourceMonth >= monthId) throw failure(400,'Carry forward source must be a prior reporting month.')
      if (!['completed','carried-over','changed','dropped'].includes(result.status)) throw failure(400,'Invalid carry forward status.')
      return {...result,sourceIndex:number(item.sourceIndex,'sourceIndex')}
    }),
    progress: {...numbers, hours:number(progress.hours,'hours',{integer:false}), ...(progress.runningHours == null ? {} : {runningHours:number(progress.runningHours,'runningHours',{integer:false})}), workstreams:pairs(progress.workstreams,'workstreams',{max:1e9,allowMissingCount:true}), reporting:pairs(progress.reporting,'reporting',{max:100,integer:false}), ...strings(progress,[],['hoursNote'])},
    wins:list(data.wins,'wins', item => strings(item,['value','title'],['detail'])),
    blockers:list(data.blockers,'blockers', item => strings(item,['title','impact'],['response'])),
    next:{...strings(next,[],['support']),month:monthLabels(upcomingMonth).label,items:list(next.items,'items', item => {
      const result = strings(item,['day','date','title','owner'],['detail'])
      if (!/^\d{4}-\d{2}-\d{2}$/.test(result.date) || !validMonth(result.date.slice(0,7)) || !Number.isFinite(Date.parse(`${result.date}T00:00:00Z`)) || new Date(`${result.date}T00:00:00Z`).toISOString().slice(0,10) !== result.date || !/^\d{1,2}$/.test(result.day) || Number(result.day) !== Number(result.date.slice(8))) throw failure(400,'Item date and day must be valid and agree.')
      if (result.date.slice(0,7) !== upcomingMonth) throw failure(400,'Action dates must fall in the upcoming month.')
      return result
    }),milestones:list(next.milestones,'milestones', item=>text(item,'milestone'))},
  }
}
function change(state, body, now) {
  object(body,'Request')
  if (typeof body.expectedVersion !== 'string' || !body.expectedVersion) throw failure(400,'expectedVersion is required.')
  if (body.expectedVersion !== state.version) throw failure(409,'The workspace changed. Reload and try again.')
  const { action, projectId, monthId, data } = body
  if (!['createProject','updateProject','deleteProject','createReport','updateReport','publishReport','deleteReport'].includes(action)) throw failure(400,'Unknown action.')
  if (action === 'createProject') {
    const fields = strings(data,['name'],['description'])
    if (fields.name.length > 120 || (fields.description?.length ?? 0) > 2000) throw failure(400,'Project text is too long.')
    const id = fields.name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
    if (!validId(id)) throw failure(400,'Project name must produce a valid ID.')
    if (state.projects.some(p=>p.id===id)) throw failure(409,'A project with that ID already exists.')
    state.projects.push({id,...fields,months:[]})
  } else {
    if (!validId(projectId)) throw failure(400,'Invalid project ID.')
    const index = state.projects.findIndex(project=>project.id===projectId)
    if (index < 0) throw failure(404,'Project not found.')
    const project = state.projects[index]
    if (action === 'deleteProject') state.projects.splice(index,1)
    else if (action === 'updateProject') {
      const fields = strings(data,['name'],['description'])
      if (fields.name.length > 120 || (fields.description?.length ?? 0) > 2000) throw failure(400,'Project text is too long.')
      project.name = fields.name
      if (fields.description !== undefined) project.description = fields.description
    } else {
      if (!validMonth(monthId)) throw failure(400,'Invalid month ID.')
      const monthIndex = project.months.findIndex(month=>month.id===monthId)
      const existing = project.months[monthIndex]
      if (action === 'createReport' && (existing?.report || existing?.draft)) throw failure(409,'That report already exists.')
      if (action === 'updateReport' && !existing?.report && !existing?.draft) throw failure(404,'Report not found.')
      if (action === 'deleteReport' && !existing) throw failure(404,'Reporting month not found.')
      if (action === 'publishReport' && !existing) throw failure(404,'Reporting month not found.')
      if (action === 'publishReport' && !existing.draft) throw failure(409,'There is no draft to publish.')
      if (action === 'deleteReport') project.months.splice(monthIndex,1)
      else if (action === 'publishReport') {
        existing.report = existing.draft
        delete existing.draft
        delete existing.draftOnly
        existing.publishedAt = new Date(now()).toISOString()
      } else {
        const report = validateReport(data,monthId)
        const month = {...existing,id:monthId,label:report.label,draft:report,...(!existing?.report ? {draftOnly:true} : {})}
        if (monthIndex < 0) project.months.push(month)
        else project.months[monthIndex] = month
        project.months.sort((a,b)=>a.id.localeCompare(b.id))
      }
    }
  }
  state.version = randomUUID()
  return state
}
async function serialize(key, operation) {
  const previous = queues.get(key) || Promise.resolve()
  const current = previous.catch(()=>{}).then(operation)
  queues.set(key,current)
  try { return await current } finally { if (queues.get(key) === current) queues.delete(key) }
}
function sameOrigin(req) {
  try {
    const origin = new URL(req.headers.origin)
    if (!['http:','https:'].includes(origin.protocol) || origin.host !== req.headers.host || origin.origin !== req.headers.origin) throw Error()
    if (req.headers['sec-fetch-site'] === 'cross-site') throw Error()
  } catch { throw failure(403,'A same-origin request is required.') }
}
async function bodyOf(req) {
  if (req.headers['content-length'] && Number(req.headers['content-length']) > MAX_BODY) throw failure(413,'Request is too large.')
  let body = req.body
  if (body === undefined) {
    const chunks = []; let length = 0
    for await (const chunk of req) {
      length += Buffer.byteLength(chunk)
      if (length > MAX_BODY) throw failure(413,'Request is too large.')
      chunks.push(Buffer.from(chunk))
    }
    body = Buffer.concat(chunks).toString('utf8')
  }
  if (Buffer.isBuffer(body)) body = body.toString('utf8')
  if (Buffer.byteLength(typeof body === 'string' ? body : JSON.stringify(body ?? null)) > MAX_BODY) throw failure(413,'Request is too large.')
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { throw failure(400,'Request must contain valid JSON.') }
  }
  return object(body,'Request')
}

export function createHandlers({ env = process.env, blob = vercelBlob, now = Date.now } = {}) {
  const production = env.VERCEL === '1'
  const storageReady = !production || Boolean(env.BLOB_READ_WRITE_TOKEN)
  const authRequired = Boolean(env.LENS_EDITOR_PASSWORD)
  const file = resolve(env.LENS_DATA_FILE || '.local/workspace.json')
  const secret = createHash('sha256').update(`project-lens-session:${env.LENS_EDITOR_PASSWORD || ''}:${env.BLOB_READ_WRITE_TOKEN || ''}`).digest()
  const sign = value => createHmac('sha256',secret).update(value).digest('base64url')
  function authenticated(req) {
    if (!env.LENS_EDITOR_PASSWORD) return !production
    const token = req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1)
    if (!token) return false
    const [expires,signature,...rest] = token.split('.')
    if (rest.length || !/^\d+$/.test(expires) || Number(expires) <= now()) return false
    const expected = Buffer.from(sign(expires)); const supplied = Buffer.from(signature || '')
    return expected.length === supplied.length && timingSafeEqual(expected,supplied)
  }
  const flags = req => ({ canEdit:storageReady && authenticated(req), authRequired, storageReady })
  function responseState(state, req) {
    const result = clone(state)
    if (!authenticated(req)) {
      for (const project of result.projects) {
        project.months = project.months.filter(month => !month.draftOnly && !(month.draft && !month.report)).map(month => {
          delete month.draft
          delete month.draftOnly
          if (month.report) delete month.report.presenterNotes
          return month
        })
      }
    }
    return {...result,...flags(req)}
  }
  async function readState() {
    if (env.BLOB_READ_WRITE_TOKEN) {
      const result = await blob.get(BLOB_PATH,{access:'private',token:env.BLOB_READ_WRITE_TOKEN,useCache:false})
      if (!result) return {state:clone(seed),etag:null}
      return {state:JSON.parse(await new Response(result.stream).text()),etag:result.blob.etag}
    }
    if (production) return {state:clone(seed)}
    try { return {state:JSON.parse(await readFile(file,'utf8'))} } catch(error) {
      if (error.code !== 'ENOENT') throw error
      return {state:clone(seed)}
    }
  }
  async function saveState(state,etag) {
    if (env.BLOB_READ_WRITE_TOKEN) {
      try {
        await blob.put(BLOB_PATH,JSON.stringify(state),{access:'private',token:env.BLOB_READ_WRITE_TOKEN,addRandomSuffix:false,contentType:'application/json',...(etag ? {ifMatch:etag} : {allowOverwrite:false})})
      } catch (error) {
        if (['BlobPreconditionFailedError','BlobAlreadyExistsError'].includes(error.constructor?.name) || error.status === 412 || error.status === 409 || /already exists/i.test(error.message)) throw failure(409,'The workspace changed. Reload and try again.')
        throw error
      }
      return
    }
    await mkdir(dirname(file),{recursive:true})
    const temporary = `${file}.${randomUUID()}.tmp`
    try { await writeFile(temporary,JSON.stringify(state,null,2),'utf8'); await rename(temporary,file) }
    finally { await unlink(temporary).catch(()=>{}) }
  }
  function wrap(handler) {
    return async (req,res) => {
      res.setHeader('Cache-Control','no-store')
      res.setHeader('Content-Type','application/json; charset=utf-8')
      res.setHeader('X-Content-Type-Options','nosniff')
      try { res.end(JSON.stringify(await handler(req,res))) }
      catch (error) {
        res.statusCode = error.status || 503
        res.end(JSON.stringify({error:error.status ? error.message : 'Workspace service is temporarily unavailable.'}))
      }
    }
  }
  return { env,
    workspace:wrap(async req => {
      if (req.method === 'GET') return responseState((await readState()).state,req)
      if (req.method !== 'POST') throw failure(405,'Method not allowed.')
      sameOrigin(req)
      if (!storageReady || (production && !env.LENS_EDITOR_PASSWORD)) throw failure(503,'Editing is not configured.')
      if (!authenticated(req)) throw failure(401,'Editor sign-in is required.')
      const body = await bodyOf(req)
      const update = async () => {
        const {state,etag} = await readState()
        const updated = change(state,body,now)
        await saveState(updated,etag)
        return responseState(updated,req)
      }
      return env.BLOB_READ_WRITE_TOKEN ? update() : serialize(file,update)
    }),
    session:wrap(async (req,res) => {
      if (req.method === 'GET') return flags(req)
      if (!['POST','DELETE'].includes(req.method)) throw failure(405,'Method not allowed.')
      sameOrigin(req)
      const attributes = `Path=/; HttpOnly; SameSite=Strict${production ? '; Secure' : ''}`
      if (req.method === 'DELETE') {
        res.setHeader('Set-Cookie',`${COOKIE}=; ${attributes}; Max-Age=0`)
        return {...flags(req),canEdit:!authRequired && storageReady && !production}
      }
      if (!storageReady || (production && !env.LENS_EDITOR_PASSWORD)) throw failure(503,'Editing is not configured.')
      const {password} = await bodyOf(req)
      if (typeof password !== 'string' || password.length > 1024) throw failure(400,'Password must be text.')
      const supplied = createHash('sha256').update(password).digest()
      const expected = createHash('sha256').update(env.LENS_EDITOR_PASSWORD || '').digest()
      if (!env.LENS_EDITOR_PASSWORD || !timingSafeEqual(supplied,expected)) throw failure(401,'Incorrect password.')
      const expires = String(now() + 8 * 60 * 60 * 1000)
      res.setHeader('Set-Cookie',`${COOKIE}=${expires}.${sign(expires)}; ${attributes}; Max-Age=28800`)
      return {...flags(req),canEdit:true}
    }),
  }
}
