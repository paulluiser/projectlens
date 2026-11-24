import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile, unlink } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import * as vercelBlob from '@vercel/blob'
import { seedProjects } from './seed.mjs'
import { importTimelineMilestones } from './milestone-import.mjs'
import { importWeeklyPlans } from './weekly-import.mjs'
import { createGoogleAuth, validateEditorEmails } from './google-auth.mjs'
import { createSecurity } from './security.mjs'

const MAX_BODY = 1024 * 1024
const BLOB_PATH = 'project-lens/workspace.json'
const queues = new Map()
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
function validateMilestone(data) {
  const fields = strings(data, ['title', 'owner', 'status'], ['description', 'dueDate', 'startDate'])
  fields.dueDate ??= ''
  fields.startDate ??= ''
  if (fields.title.length > 160 || fields.owner.length > 120 || (fields.description?.length ?? 0) > 2000) throw failure(400, 'Milestone text is too long.')
  for (const date of [fields.dueDate, fields.startDate]) {
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !validMonth(date.slice(0, 7)) ||
        !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) {
      throw failure(400, 'Milestone dates must be valid calendar dates.')
    }
  }
  if (fields.startDate && (!fields.dueDate || fields.startDate > fields.dueDate)) throw failure(400, 'Start date must be on or before the target date.')
  if (!['planned', 'in-progress', 'blocked', 'completed'].includes(fields.status)) throw failure(400, 'Invalid milestone status.')
  if (data.sample !== undefined && typeof data.sample !== 'boolean') throw failure(400, 'Sample flag must be a boolean.')
  if (data.forecast !== undefined && typeof data.forecast !== 'boolean') throw failure(400, 'Forecast flag must be a boolean.')
  return { ...fields, sample: data.sample ?? false, forecast: data.forecast ?? false }
}
const validDate = date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && validMonth(date.slice(0, 7)) &&
  Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date
export const taskStatuses = ['todo', 'in-progress', 'blocked', 'done']
// A weekly bracket is set by hand: any start and end up to 31 days apart.
function validateWeek(data) {
  const fields = strings(data, ['start', 'end'], ['label'])
  if (!validDate(fields.start) || !validDate(fields.end)) throw failure(400, 'Week dates must be valid calendar dates.')
  if (fields.start > fields.end) throw failure(400, 'The week must start on or before it ends.')
  if ((Date.parse(fields.end) - Date.parse(fields.start)) / 86400000 > 30) throw failure(400, 'A week can span at most 31 days.')
  if ((fields.label?.length ?? 0) > 80) throw failure(400, 'Week label is too long.')
  return { start: fields.start, end: fields.end, label: fields.label ?? '' }
}
// Owners are a list (a task can be shared). Older records stored one string such as "KC/Franco";
// those are split on "/", "&", "+" and commas when read or saved.
export const splitOwners = value => [...new Set(String(value ?? '').split(/\s*(?:\/|&|\+|,)\s*/).map(name => name.trim()).filter(Boolean))]
function validateOwners(data) {
  const raw = Array.isArray(data.owners) ? data.owners : data.owner !== undefined ? splitOwners(data.owner) : null
  if (!raw || !raw.every(name => typeof name === 'string')) throw failure(400, 'Owners must be a list of names.')
  const owners = [...new Set(raw.map(name => name.trim()).filter(Boolean))]
  if (!owners.length) throw failure(400, 'Add at least one owner.')
  if (owners.length > 8) throw failure(400, 'A task can have up to 8 owners.')
  if (owners.some(name => name.length > 60)) throw failure(400, 'Owner names can be up to 60 characters.')
  return owners
}
function validateTask(data) {
  object(data, 'Task')
  const fields = strings(data, ['title', 'dueDate', 'status'], ['notes'])
  if (fields.title.length > 160 || (fields.notes?.length ?? 0) > 2000) throw failure(400, 'Task text is too long.')
  if (!validDate(fields.dueDate)) throw failure(400, 'Task target date must be a valid calendar date.')
  if (!taskStatuses.includes(fields.status)) throw failure(400, 'Invalid task status.')
  return { title: fields.title, owners: validateOwners(data), dueDate: fields.dueDate, status: fields.status, notes: fields.notes ?? '' }
}
// Read-time upgrade for tasks saved before owners became a list. Returns the same state when nothing changes.
export function normalizeTaskOwners(state) {
  let changed = false
  const projects = state.projects.map(project => {
    if (!project.weeks?.some(week => week.tasks?.some(task => !Array.isArray(task.owners)))) return project
    changed = true
    return { ...project, weeks: project.weeks.map(week => ({ ...week, tasks: (week.tasks ?? []).map(task => {
      if (Array.isArray(task.owners)) return task
      const { owner, ...rest } = task
      return { ...rest, owners: splitOwners(owner) }
    }) })) }
  })
  return changed ? { ...state, projects } : state
}
function taskIdList(data) {
  object(data, 'Selection')
  if (!Array.isArray(data.taskIds) || !data.taskIds.length || data.taskIds.length > 200 || !data.taskIds.every(validId)) throw failure(400, 'Choose between 1 and 200 tasks.')
  return new Set(data.taskIds)
}
function changeWeekly(project, action, weekId, taskId, data) {
  const weeks = project.weeks ?? []
  if (action === 'createWeek') {
    if (weeks.length >= 200) throw failure(400, 'A project can have up to 200 weeks.')
    project.weeks = [...weeks, { id: randomUUID(), ...validateWeek(data), tasks: [] }].sort((a, b) => a.start.localeCompare(b.start))
    return
  }
  if (!validId(weekId)) throw failure(400, 'Invalid week ID.')
  const week = weeks.find(item => item.id === weekId)
  if (!week) throw failure(404, 'Week not found.')
  if (action === 'deleteWeek') { project.weeks = weeks.filter(item => item.id !== weekId); return }
  if (action === 'updateWeek') { Object.assign(week, validateWeek(data)); project.weeks = [...weeks].sort((a, b) => a.start.localeCompare(b.start)); return }
  const tasks = week.tasks ?? []
  if (action === 'createTask') {
    if (tasks.length >= 200) throw failure(400, 'A week can have up to 200 tasks.')
    week.tasks = [...tasks, { id: randomUUID(), ...validateTask(data) }]
    return
  }
  if (action === 'setTaskStatus' || action === 'deleteTasks') {
    const ids = taskIdList(data)
    if ([...ids].some(id => !tasks.some(item => item.id === id))) throw failure(404, 'One or more tasks were not found.')
    if (action === 'deleteTasks') { week.tasks = tasks.filter(item => !ids.has(item.id)); return }
    if (!taskStatuses.includes(data.status)) throw failure(400, 'Invalid task status.')
    week.tasks = tasks.map(item => ids.has(item.id) ? { ...item, status: data.status } : item)
    return
  }
  if (action === 'restoreTasks') {
    // Undo for deletes: put the same tasks (same IDs) back. Tasks already present are left as they are.
    object(data, 'Restore')
    if (!Array.isArray(data.tasks) || !data.tasks.length || data.tasks.length > 200) throw failure(400, 'Choose between 1 and 200 tasks to restore.')
    const restored = data.tasks.filter(item => !tasks.some(existing => existing.id === item?.id)).map(item => {
      if (!validId(item?.id)) throw failure(400, 'Invalid task ID.')
      return { id: item.id, ...validateTask(item) }
    })
    if (tasks.length + restored.length > 200) throw failure(400, 'A week can have up to 200 tasks.')
    week.tasks = [...tasks, ...restored]
    return
  }
  if (!validId(taskId)) throw failure(400, 'Invalid task ID.')
  if (!tasks.some(item => item.id === taskId)) throw failure(404, 'Task not found.')
  week.tasks = action === 'deleteTask' ? tasks.filter(item => item.id !== taskId) : tasks.map(item => item.id === taskId ? { id: item.id, ...validateTask(data) } : item)
}
const weeklyActions = ['createWeek', 'updateWeek', 'deleteWeek', 'createTask', 'updateTask', 'deleteTask', 'setTaskStatus', 'deleteTasks', 'restoreTasks']
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
  const { action, projectId, monthId, milestoneId, weekId, taskId, data } = body
  if (!['updateEditors','createProject','updateProject','deleteProject','createReport','updateReport','publishReport','deleteReport','createMilestone','updateMilestone','deleteMilestone',...weeklyActions].includes(action)) throw failure(400,'Unknown action.')
  if (action === 'updateEditors') {
    object(data,'Editor access')
    state.access = { editorEmails: validateEditorEmails(data.emails) }
  } else if (action === 'createProject') {
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
    } else if (weeklyActions.includes(action)) {
      changeWeekly(project, action, weekId, taskId, data)
    } else if (['createMilestone', 'updateMilestone', 'deleteMilestone'].includes(action)) {
      const milestones = project.milestones ?? []
      if (action === 'createMilestone') {
        if (milestones.length >= 200) throw failure(400, 'A project can have up to 200 milestones.')
        project.milestones = [...milestones, { id: randomUUID(), ...validateMilestone(data) }]
      } else {
        if (!validId(milestoneId)) throw failure(400, 'Invalid milestone ID.')
        const milestoneIndex = milestones.findIndex(item => item.id === milestoneId)
        if (milestoneIndex < 0) throw failure(404, 'Milestone not found.')
        if (action === 'deleteMilestone') project.milestones = milestones.filter(item => item.id !== milestoneId)
        else project.milestones = milestones.map((item, index) => index === milestoneIndex ? { ...validateMilestone(data), id: item.id } : item)
      }
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
  state.updatedAt = new Date(now()).toISOString()
  const updatedProject = action === 'createProject' ? state.projects.at(-1) : state.projects.find(project => project.id === projectId)
  if (updatedProject) updatedProject.updatedAt = state.updatedAt
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

export function createHandlers({
  env = process.env,
  blob = vercelBlob,
  now = Date.now,
  projects = seedProjects,
  verifyGoogleToken,
} = {}) {
  const seed = {
    projects,
    version: createHash('sha256')
      .update(JSON.stringify(projects))
      .digest('hex'),
  }
  const production = env.VERCEL === '1' || env.NODE_ENV === 'production'
  const storageReady = !production || Boolean(env.BLOB_READ_WRITE_TOKEN)
  const google = createGoogleAuth({ env, now, verifyGoogleToken })
  const bypass =
    !production && env.LENS_DEV_AUTH_BYPASS === '1' && !google.requested
  const file = resolve(env.LENS_DATA_FILE || '.local/workspace.json')
  const security = createSecurity({
    env,
    now,
    google,
    production,
    storageReady,
  })
  const flags = (req, state = {}) =>
    bypass
      ? {
          signedIn: true,
          needsName: false,
          user: {
            id: 'development',
            firstName: 'Development',
            lastName: 'User',
          },
          role: 'admin',
          isAdmin: true,
          canEdit: storageReady,
          authRequired: false,
          authMode: 'local',
          authReady: true,
          storageReady,
        }
      : security.flags(req, state)
  const requireUser = (req, state, options) =>
    bypass
      ? { id: 'development', firstName: 'Development', lastName: 'User' }
      : security.requireUser(req, state, options)
  function responseState(state, req) {
    const result = clone(state)
    delete result.access
    delete result.security
    delete result.history
    if (!flags(req, state).canEdit) {
      for (const project of result.projects)
        project.months = project.months
          .filter((m) => !m.draftOnly && !(m.draft && !m.report))
          .map((month) => {
            delete month.draft
            delete month.draftOnly
            if (month.report) delete month.report.presenterNotes
            return month
          })
    }
    return { ...result, ...flags(req, state) }
  }
  async function readStoredState() {
    if (env.BLOB_READ_WRITE_TOKEN) {
      // Compression weakens the response ETag; If-Match writes require the original strong validator.
      const result = await blob.get(BLOB_PATH, {
        access: 'private',
        token: env.BLOB_READ_WRITE_TOKEN,
        useCache: false,
        headers: { 'accept-encoding': 'identity' },
      })
      if (!result) return { state: clone(seed), etag: null }
      return {
        state: JSON.parse(await new Response(result.stream).text()),
        etag: result.blob.etag,
      }
    }
    if (production) return { state: clone(seed) }
    try {
      return { state: JSON.parse(await readFile(file, 'utf8')) }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      return { state: clone(seed) }
    }
  }
  async function readState() {
    const result = await readStoredState()
    return {
      ...result,
      state: normalizeTaskOwners(
        importWeeklyPlans(
          importTimelineMilestones(result.state, projects),
          projects,
        ),
      ),
    }
  }
  async function saveState(state, etag) {
    if (env.BLOB_READ_WRITE_TOKEN) {
      try {
        await blob.put(BLOB_PATH, JSON.stringify(state), {
          access: 'private',
          token: env.BLOB_READ_WRITE_TOKEN,
          addRandomSuffix: false,
          contentType: 'application/json',
          ...(etag ? { ifMatch: etag } : { allowOverwrite: false }),
        })
      } catch (error) {
        if (
          ['BlobPreconditionFailedError', 'BlobAlreadyExistsError'].includes(
            error.constructor?.name,
          ) ||
          error.status === 412 ||
          error.status === 409 ||
          /already exists/i.test(error.message)
        )
          throw failure(409, 'The workspace changed. Reload and try again.')
        throw error
      }
      return
    }
    await mkdir(dirname(file), { recursive: true })
    const temporary = `${file}.${randomUUID()}.tmp`
    try {
      await writeFile(temporary, JSON.stringify(state, null, 2), 'utf8')
      await rename(temporary, file)
    } finally {
      await unlink(temporary).catch(() => {})
    }
  }
  function wrap(handler) {
    return async (req, res) => {
      res.setHeader('Cache-Control', 'no-store')
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      try {
        res.end(JSON.stringify(await handler(req, res)))
      } catch (error) {
        res.statusCode = error.status || 503
        res.end(
          JSON.stringify({
            error: error.status
              ? error.message
              : 'Workspace service is temporarily unavailable.',
            ...(error.code ? { code: error.code } : {}),
          }),
        )
      }
    }
  }
  // All identity mutations use the same conditional write as business records. Retrying a
  // conflict rechecks permissions and single-use code state against the winning revision.
  async function transaction(work) {
    const update = async () => {
      for (let attempt = 0; attempt < 5; attempt++) {
        const { state, etag } = await readState()
        const result = await work(state)
        try {
          await saveState(state, etag)
          return result
        } catch (error) {
          if (error.status !== 409 || attempt === 4) throw error
        }
      }
    }
    return env.BLOB_READ_WRITE_TOKEN ? update() : serialize(file, update)
  }
  function historyEvent(state, body, actor, before) {
    const module = /Report/.test(body.action)
      ? 'report'
      : /Milestone/.test(body.action)
        ? 'milestone'
        : weeklyActions.includes(body.action)
          ? 'weekly'
          : 'project'
    const projectId =
      body.projectId ||
      (body.action === 'createProject' ? state.projects.at(-1)?.id : undefined)
    const event = {
      id: randomUUID(),
      action: body.action,
      at: new Date(now()).toISOString(),
      actor: {
        id: actor.id,
        firstName: actor.firstName,
        lastName: actor.lastName,
      },
      module,
      ...(projectId ? { projectId } : {}),
      ...(body.monthId || body.milestoneId || body.weekId || body.taskId
        ? {
            entityId:
              body.monthId || body.milestoneId || body.weekId || body.taskId,
          }
        : {}),
    }
    const project = state.projects.find((p) => p.id === projectId)
    const previousProject = before.projects.find((p) => p.id === projectId)
    if (body.action === 'createMilestone') {
      event.entityId = project?.milestones?.find((item) =>
        !previousProject?.milestones?.some((old) => old.id === item.id))?.id
    }
    if (body.action === 'createWeek') {
      event.entityId = project?.weeks?.find((item) =>
        !previousProject?.weeks?.some((old) => old.id === item.id))?.id
    }
    event.summary = body.action
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^./, (value) => value.toUpperCase())
    const record = (s) => {
      const p = s.projects.find((p) => p.id === projectId)
      if (module === 'project') return p
      if (module === 'report') {
        const m = p?.months?.find((m) => m.id === body.monthId)
        return m?.draft || m?.report
      }
      if (module === 'milestone')
        return (
          p?.milestones?.find((m) => m.id === body.milestoneId) ||
          p?.milestones?.at(-1)
        )
      const w = p?.weeks?.find((w) => w.id === event.entityId) || p?.weeks?.at(-1)
      if (body.action === 'createTask') {
        const previousWeek = previousProject?.weeks?.find((old) => old.id === w?.id)
        return w?.tasks?.find((task) => !previousWeek?.tasks?.some((old) => old.id === task.id))
      }
      return body.taskId ? w?.tasks?.find((t) => t.id === body.taskId) : w
    }
    const old = /^create/.test(body.action) ? undefined : record(before),
      next = ['deleteProject', 'deleteReport', 'deleteMilestone', 'deleteWeek', 'deleteTask'].includes(body.action) ? undefined : record(state)
    event.changes = [
      'name',
      'description',
      'title',
      'owner',
      'status',
      'dueDate',
      'startDate',
      'start',
      'end',
      'label',
      'notes',
      'progress',
      'wins',
      'blockers',
      'next',
      'carryForward',
      'presenterNotes',
      'owners',
      'tasks',
    ]
      .filter(
        (key) => JSON.stringify(old?.[key]) !== JSON.stringify(next?.[key]),
      )
      .map((field) => ({
        field,
        before: old?.[field] ?? null,
        after: next?.[field] ?? null,
      }))
    ;(state.history ??= []).push(event)
  }
  const url = (req) => new URL(req.url || '/', 'http://localhost')
  return {
    env,
    workspace: wrap(async (req) => {
      if (req.method === 'GET') {
        const { state } = await readState()
        requireUser(req, state)
        return responseState(state, req)
      }
      if (req.method !== 'POST') throw failure(405, 'Method not allowed.')
      sameOrigin(req)
      if (!storageReady) throw failure(503, 'Editing is not configured.')
      const body = await bodyOf(req)
      const update = async () => {
        const { state, etag } = await readState()
        const actor = requireUser(req, state, { edit: true })
        if (body.action === 'updateEditors' && !flags(req, state).isAdmin)
          throw failure(403, 'Only an administrator can change editor access.')
        const before = clone(state)
        const updated = change(state, body, now)
        historyEvent(updated, body, actor, before)
        security.audit(updated, body.action, actor)
        await saveState(updated, etag)
        return responseState(updated, req)
      }
      return env.BLOB_READ_WRITE_TOKEN ? update() : serialize(file, update)
    }),
    session: wrap(async (req, res) => {
      if (req.method === 'GET') {
        const { state } = await readState()
        return {
          ...flags(req, state),
          ...(url(req).searchParams.get('challenge') === 'google' &&
          storageReady
            ? google.challenge(res)
            : {}),
        }
      }
      if (!['POST', 'DELETE'].includes(req.method))
        throw failure(405, 'Method not allowed.')
      sameOrigin(req)
      if (req.method === 'DELETE') {
        const { state } = await readState()
        if (security.user(req, state) && storageReady)
          await transaction((state) => {
            const u = security.user(req, state)
            if (u) security.audit(state, 'signOut', u)
          })
        google.logout(res)
        return flags({ ...req, headers: { ...req.headers, cookie: '' } }, state)
      }
      if (!storageReady || !google.ready || !security.ready)
        throw failure(503, 'Sign-in is not configured.')
      const body = await bodyOf(req)
      if (body.credential !== undefined) {
        const { state } = await readState()
        const g = await google.login(req, res, body.credential, state)
        const result = await transaction((state) => {
          if (!google.allowed(g.email, state))
            throw failure(403, 'Editor access was revoked.')
          const u = security.googleUser(state, g)
          security.audit(state, 'googleSignIn', u)
          return { id: u.id, state }
        })
        result.cookie = security.setSession(res, result.id, undefined, true)
        return flags(
          { ...req, headers: { ...req.headers, cookie: result.cookie } },
          result.state,
        )
      }
      if (body.code === undefined)
        throw failure(400, 'A Google credential or remote code is required.')
      let rejected
      const result = await transaction((state) => {
        rejected = undefined
        try {
          const { user } = security.loginCode(state, body, req)
          return { user, state }
        } catch (error) {
          rejected = error
          return null
        }
      })
      if (rejected) throw rejected
      result.cookie = security.setSession(
        res,
        result.user.id,
        result.user.expires,
      )
      return flags(
        { ...req, headers: { ...req.headers, cookie: result.cookie } },
        result.state,
      )
    }),
    security: wrap(async (req, res) => {
      if (req.method === 'GET') {
        const { state } = await readState()
        return security.view(req, state)
      }
      if (req.method !== 'POST') throw failure(405, 'Method not allowed.')
      sameOrigin(req)
      if (!storageReady)
        throw failure(503, 'Security settings are not configured.')
      const body = await bodyOf(req)
      const result = await transaction((state) => {
        let u = requireUser(req, state, {
          named: body.action !== 'completeProfile',
          edit: body.action !== 'completeProfile',
        })
        if (u.role === 'guest')
          throw failure(403, 'Guests cannot change security settings.')
        if (!state.security?.users.some((user) => user.id === u.id))
          u = security.googleUser(state, { sub: u.googleSub, email: u.email })
        let code
        if (body.action === 'completeProfile') {
          Object.assign(u, security.names(body.data))
          if (!u.codeHash) security.remote(state, u)
        } else if (body.action === 'regenerateRemoteCode')
          code = security.remote(state, u)
        else if (body.action === 'createGuestCode') {
          if (!flags(req, state).isAdmin)
            throw failure(403, 'Only administrators can create guest codes.')
          code = security.generate(state)
          security
            .data(state)
            .guestCodes.push({
              id: randomUUID(),
              codeHash: security.hash(code),
              createdAt: new Date(now()).toISOString(),
              expiresAt: new Date(now() + 259200000).toISOString(),
              createdBy: u.id,
            })
        } else throw failure(400, 'Unknown security action.')
        security.audit(state, body.action, u)
        return { state, id: u.id, code }
      })
      result.cookie = security.setSession(res, result.id)
      return {
        ...security.view(
          { ...req, headers: { ...req.headers, cookie: result.cookie } },
          result.state,
        ),
        ...(result.code ? { code: result.code } : {}),
      }
    }),
    history: wrap(async (req) => {
      if (req.method !== 'GET') throw failure(405, 'Method not allowed.')
      const { state } = await readState()
      requireUser(req, state, { edit: true })
      const query = url(req).searchParams
      if (
        query.has('module') &&
        !['project', 'report', 'milestone', 'weekly'].includes(
          query.get('module'),
        )
      )
        throw failure(400, 'Invalid history module.')
      return {
        events: (state.history || [])
          .filter((event) =>
            ['projectId', 'module', 'entityId'].every(
              (key) => !query.has(key) || event[key] === query.get(key),
            ),
          )
          .slice()
          .reverse(),
      }
    }),
    presence: wrap(async (req) => {
      if (!['GET', 'POST'].includes(req.method))
        throw failure(405, 'Method not allowed.')
      const { state } = await readState()
      const u = requireUser(req, state)
      if (req.method === 'POST') sameOrigin(req)
      const path = 'project-lens/presence.json'
      const local = file + '.presence'
      async function read() {
        if (env.BLOB_READ_WRITE_TOKEN) {
          const r = await blob.get(path, {
            access: 'private',
            token: env.BLOB_READ_WRITE_TOKEN,
            useCache: false,
            headers: { 'accept-encoding': 'identity' },
          })
          return r
            ? {
                data: JSON.parse(await new Response(r.stream).text()),
                etag: r.blob.etag,
              }
            : { data: [] }
        }
        try {
          return { data: JSON.parse(await readFile(local, 'utf8')) }
        } catch (e) {
          if (e.code !== 'ENOENT') throw e
          return { data: [] }
        }
      }
      const work = async () => {
        for (let attempt = 0; attempt < 5; attempt++) {
          const { data, etag } = await read()
          let rows = data.filter((row) => row.seen > now() - 90000)
          if (req.method === 'POST') {
            rows = rows.filter((row) => row.id !== u.id)
            rows.push({ id: u.id, firstName: u.firstName, seen: now() })
            try {
              if (env.BLOB_READ_WRITE_TOKEN)
                await blob.put(path, JSON.stringify(rows), {
                  access: 'private',
                  token: env.BLOB_READ_WRITE_TOKEN,
                  addRandomSuffix: false,
                  contentType: 'application/json',
                  ...(etag ? { ifMatch: etag } : { allowOverwrite: false }),
                })
              else {
                await mkdir(dirname(local), { recursive: true })
                await writeFile(local, JSON.stringify(rows))
              }
            } catch (error) {
              if (
                attempt < 4 &&
                (error.status === 409 ||
                  error.status === 412 ||
                  [
                    'BlobPreconditionFailedError',
                    'BlobAlreadyExistsError',
                  ].includes(error.constructor?.name))
              )
                continue
              throw error
            }
          }
          return {
            viewers: rows.map(({ id, firstName }) => ({
              id,
              firstName,
              self: id === u.id,
            })),
          }
        }
      }
      return env.BLOB_READ_WRITE_TOKEN ? work() : serialize(local, work)
    }),
  }
}
