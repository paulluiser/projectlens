import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer as createHttpServer } from 'node:http'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { JSDOM } from 'jsdom'
import { createServer as createViteServer } from 'vite'
import { createHandlers } from '../server/workspace.mjs'
import { fixtureProjects } from './fixture-projects.mjs'
test('review cycle: recovery, carry-forward, private draft, publish, comparison, sharing and presentation', async () => {
const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(new URL('../package.json', import.meta.url))
require.extensions['.css'] = () => {}
const directory = await mkdtemp(join(tmpdir(), 'lens-component-data-'))
const handlers = createHandlers({ env: { LENS_DATA_FILE: join(directory, 'workspace.json') }, projects: fixtureProjects })
const server = createHttpServer((req,res) => {
  if (req.url === '/api/workspace') return handlers.workspace(req,res)
  if (req.url === '/api/session') return handlers.session(req,res)
  res.writeHead(404).end()
})
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: origin + '/landing/projects', pretendToBeVisual:true })
const window = dom.window
for (const name of ['window','document','HTMLElement','HTMLInputElement','HTMLSelectElement','HTMLTextAreaElement','HTMLButtonElement','HTMLFormElement','FormData','Element','Node','NodeFilter','MutationObserver','CustomEvent','DocumentFragment','Event','MouseEvent','KeyboardEvent']) globalThis[name] = name === 'window' ? window : window[name]
Object.defineProperty(globalThis,'navigator',{value:window.navigator,configurable:true})
let mobileMatches = false
const breakpointListeners = new Set()
window.matchMedia = query => ({ get matches() { return query.includes('reduced-motion') || (query.includes('max-width: 760px') && mobileMatches) }, addEventListener(type, listener) { if (query.includes('max-width: 760px')) breakpointListeners.add(listener) }, removeEventListener(type, listener) { breakpointListeners.delete(listener) } })
window.visualViewport = Object.assign(new window.EventTarget(), { height: 800, offsetTop: 0 })
globalThis.localStorage = window.localStorage
globalThis.sessionStorage = window.sessionStorage
globalThis.matchMedia = window.matchMedia
globalThis.getComputedStyle = window.getComputedStyle.bind(window)
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window)
globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window)
globalThis.ResizeObserver = class { observe(){} disconnect(){} }
globalThis.IntersectionObserver = class { observe(){} disconnect(){} }
window.scrollTo = () => {}
window.HTMLElement.prototype.scrollIntoView = () => {}
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const nativeFetch = globalThis.fetch
const captured = []
let releaseInitial
let holdInitial = true
const initialGate = new Promise(resolve => { releaseInitial = resolve })
let releaseWrite
let holdWrite = false
let writeGate
globalThis.fetch = async (path,options={}) => {
  if (holdInitial && path === '/api/workspace' && !options.method) await initialGate
  if (holdWrite && options.method === 'POST') await writeGate
  const response = await nativeFetch(new URL(path,origin), {...options, headers:{...options.headers, Origin:origin}})
  captured.push({path:String(path),status:response.status})
  return response
}
const React = require('react')
const { act } = React
const { createRoot } = require('react-dom/client')
const { BrowserRouter, MemoryRouter } = require('react-router-dom')
const vite = await createViteServer({root:projectRoot, server:{middlewareMode:true}})
let root
async function settled() { await act(async()=>{ await new Promise(resolve=>setTimeout(resolve,45)) }) }
async function until(predicate,label) { for(let i=0;i<60;i++){ if(predicate()) return; await settled() } throw new Error(`Timed out: ${label}\n${document.body.textContent}`) }
function byButton(label){const matches=[...(document.querySelector('[role="dialog"]')??document).querySelectorAll('button')].filter(node=>node.getAttribute('aria-label')===label||node.textContent.trim()===label);assert.equal(matches.length,1,`${label}: ${matches.length} matching buttons`);return matches[0]}
async function click(node){await act(async()=>{node.click()});await settled()}
async function fill(label,value){const labels=[...document.querySelectorAll('label')].filter(node=>node.querySelector('span')?.textContent.replace(' *','').replace(' (optional)','')===label);assert.equal(labels.length,1,label);const input=labels[0].querySelector('input,textarea');const setter=Object.getOwnPropertyDescriptor(input.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:window.HTMLInputElement.prototype,'value').set;await act(async()=>{setter.call(input,value);input.dispatchEvent(new window.Event('input',{bubbles:true}));input.dispatchEvent(new window.Event('change',{bubbles:true}))})}
async function submit(label){await act(async()=>{const button=byButton(label);button.form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}))});await settled()}
try {
  const {App}=await vite.ssrLoadModule('/src/App.jsx')
  root=createRoot(document.getElementById('root'))
  await act(async()=>{root.render(React.createElement(BrowserRouter,null,React.createElement(App)))})
  await until(()=>document.querySelector('[data-loading-layout="directory"]'),'directory skeleton')
  assert.ok(document.querySelector('.loading-caption[role="status"]'))
  assert.equal(document.querySelector('.loading-shape').getAttribute('aria-hidden'),'true')
  assert.equal(document.querySelector('.loading-shape button'),null,'skeleton does not present fake interactive controls')
  holdInitial = false
  await act(async()=>releaseInitial())
  await until(()=>document.body.textContent.includes('Local editor'),'load projects')
  assert.equal(document.querySelector('.loading-screen'),null,'skeleton clears when data arrives')
  await click(document.querySelector('a[aria-label="Project Lens home"]'))
  await until(()=>document.querySelector('.public-landing'), 'public landing')
  assert.equal(document.querySelector('.site-sidebar'), null)
  assert.equal(document.body.textContent.includes('SIMSDotNet'), false)
  await click(document.querySelector('.public-landing a'))
  await until(()=>document.querySelector('.workspace-overview'), 'workspace overview')
  assert.ok(document.querySelector('.workspace-overview a[href$="/progress"]'))
  assert.equal(document.querySelector('.site-sidebar a[aria-current="page"]').textContent.trim(), 'Overview')
  await click(document.querySelector('.workspace-overview a[href="/landing/projects"]'))
  await until(()=>document.querySelector('.project-dashboard'), 'return to projects')
  await click(byButton('Create project'))
  await fill('Project name','Component QA')
  await fill('Description','Created through the form')
  await click(byButton('Compact dialog'))
  assert.equal(byButton('Compact dialog').getAttribute('aria-pressed'), 'true')
  await click(byButton('Expand dialog'))
  assert.equal(byButton('Compact dialog').getAttribute('aria-pressed'), 'false')
  assert.equal(byButton('Expand dialog').getAttribute('aria-pressed'), 'true')
  await click(byButton('Expand dialog'))
  assert.equal(byButton('Expand dialog').getAttribute('aria-pressed'), 'false')
  assert.equal(document.querySelector('.editor-form input').value, 'Component QA')
  const projectForm = document.querySelector('.editor-form')
  assert.ok(document.querySelector('.dialog-header [role]') || document.querySelector('.dialog-header h2'))
  assert.equal(projectForm.querySelector('.editor-scroll').contains(projectForm.querySelector('.editor-footer')),false,'actions remain outside the scrolling fields')
  assert.ok(projectForm.querySelector('.field-optional'))
  const nameInput=[...document.querySelectorAll('label')].find(label=>label.textContent.includes('Project name')).querySelector('input')
  await fill('Project name','')
  await act(async()=>assert.equal(nameInput.checkValidity(),false))
  assert.equal(nameInput.getAttribute('aria-invalid'),'true')
  await fill('Project name','Component QA')
  assert.equal(nameInput.getAttribute('aria-invalid'),'false','editing clears the invalid state')
  holdWrite = true
  writeGate = new Promise(resolve => { releaseWrite = resolve })
  await submit('Create project')
  assert.equal(byButton('Saving…').getAttribute('aria-busy'),'true')
  assert.equal(byButton('Saving…').disabled,true)
  assert.ok(byButton('Saving…').querySelector('.busy-indicator'))
  holdWrite = false
  await act(async()=>releaseWrite())
  await until(()=>window.location.pathname.endsWith('/component-qa')&&!document.querySelector('[role="dialog"]'),'create project')
  assert.ok(document.body.textContent.includes('No reports yet'))
  assert.equal([...document.querySelectorAll('button')].some(button=>button.textContent.trim()==='Create project'),false,'project creation belongs on the dashboard')
  sessionStorage.setItem('lens-library-location','/landing/projects/component-qa?month=2026-10')
  await click([...document.querySelectorAll('.site-sidebar a')].find(link=>link.textContent.trim()==='Projects'))
  await until(()=>window.location.pathname==='/landing/projects'&&document.querySelector('.project-dashboard'),'all-project dashboard')
  assert.equal(window.location.search,'','sidebar Projects clears project-specific context')
  assert.ok(byButton('Create project'))
  assert.equal(document.querySelectorAll('.project-dashboard tbody tr').length,2,'each project appears once')
  await click(document.querySelector('.project-dashboard a[aria-label="Open Component QA"]'))
  await until(()=>window.location.pathname.endsWith('/component-qa')&&!document.querySelector('.project-dashboard'),'open project from dashboard')
  await click(byButton('Edit project'))
  await fill('Project name','Renamed QA')
  await submit('Save project')
  await until(()=>document.querySelector('h1')?.textContent==='Renamed QA','rename project')
  let priorWorkspace = await nativeFetch(origin+'/api/workspace').then(response=>response.json())
  const priorData = structuredClone(priorWorkspace.projects.find(project=>project.id==='simsdotnet').months.find(month=>month.id==='2026-09').report)
  async function operation(action, data, monthId='2026-09') {
    priorWorkspace = await nativeFetch(origin+'/api/workspace',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({action,projectId:'component-qa',monthId,data,expectedVersion:priorWorkspace.version})}).then(response=>response.json())
    assert.ok(priorWorkspace.version,JSON.stringify(priorWorkspace))
  }
  await operation('createReport',priorData)
  await operation('publishReport')
  await act(async()=>window.dispatchEvent(new window.Event('focus')))
  await settled()
  await act(async()=>{window.history.replaceState({},'', '/landing/projects/component-qa?month=2026-10&q=QA');window.dispatchEvent(new window.PopStateEvent('popstate'))})
  await settled()
  const creates=[...document.querySelectorAll('button')].filter(node=>node.textContent.trim()==='Create report')
  await click(creates[0])
  await fill('Report title','Temporary value')
  await fill('Report title','')
  assert.equal(localStorage.getItem('lens-recovery:report:component-qa:new'),null,'undo clears obsolete recovery')
  await fill('Report title','Recovery works')
  const leaving=new window.Event('beforeunload',{cancelable:true})
  window.dispatchEvent(leaving)
  assert.equal(leaving.defaultPrevented,true,'unsaved work warns before leaving')
  await click(byButton('Close editor'))
  assert.ok(document.querySelector('[role="dialog"]').textContent.includes('unsaved changes'))
  await click(byButton('Close and keep recovery'))
  await click([...document.querySelectorAll('button')].find(node=>node.textContent.trim()==='Create report'))
  await click(byButton('Restore recovery copy'))
  assert.equal([...document.querySelectorAll('label')].find(node=>node.textContent.includes('Report title')).querySelector('input').value,'Recovery works')
  await fill('Report month','')
  assert.ok(document.querySelector('[role="dialog"]'), 'clearing month keeps the editor mounted')
  await fill('Report month','2026-10')
  await fill('Report title','October QA review')
  await click(byButton('Bring in previous plan'))
  assert.ok(document.querySelector('.carry-entry'))
  const outcome=document.querySelector('.carry-entry select')
  await act(async()=>{outcome.value='completed';outcome.dispatchEvent(new window.Event('change',{bubbles:true}))})
  await click(byButton('Progress'))
  assert.equal(document.querySelectorAll('.form-page:not([hidden])').length, 1)
  await fill('Total running hours','123.75')
  await click(byButton('Add workstream'))
  await fill('Workstream 1','Documentation')
  await click(byButton('Add workstream'))
  await fill('Workstream 2','Frontend')
  await fill('Tasks 2','0')
  await fill('Progress headline','QA headline')
  await fill('Planned tasks','2')
  await fill('Completed tasks','1')
  await fill('Total project tasks','4')
  await fill('Project tasks completed','1')
  await click(byButton('Add accomplishment'))
  await fill('Title 1','Initial milestone')
  await fill('Result 1','Done')
  await click(byButton('Add blocker'))
  const blockedTitle=[...document.querySelectorAll('label')].filter(node=>node.querySelector('span')?.textContent.replace(' *','').replace(' (optional)','')==='Title 1').at(-1)
  const blockedInput=blockedTitle.querySelector('input')
  await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(blockedInput,'Waiting for approval');blockedInput.dispatchEvent(new window.Event('input',{bubbles:true}));blockedInput.dispatchEvent(new window.Event('change',{bubbles:true}))})
  await fill('Impact 1','A planned task is blocked')
  await fill('Response 1','Schedule a review')
  await click(byButton('Add action'))
  await fill('Action 1','Approve next phase')
  await fill('Due date 1','2026-12-15')
  const dueField=[...document.querySelectorAll('label')].find(node=>node.querySelector('span')?.textContent.replace(' *','')==='Due date 1').querySelector('input')
  assert.equal(dueField.validity.rangeOverflow,true,'later month rejected by inline date constraint')
  await fill('Due date 1','2026-11-15')
  await fill('Owner 1','QA owner')
  await fill('Target or scope 1','Approval recorded')
  await click(byButton('Add action'))
  await fill('Action 2','Remaining deadline action')
  await fill('Due date 2','2026-11-26')
  await fill('Owner 2','QA owner')
  await click(byButton('Add milestone'))
  await fill('Milestone 1','Start next phase')
  await fill('Support needed next month','Reviewer time')
  await submit('Save draft')
  await until(()=>window.location.pathname.includes('/2026-10/progress')&&document.body.textContent.includes('QA headline'),'create report')
  const stored=await nativeFetch(origin+'/api/workspace').then(response=>response.json())
  const saved=stored.projects.find(project=>project.id==='component-qa').months.find(month=>month.id==='2026-10').draft
  assert.equal(saved.wins[0].title,'Initial milestone')
  assert.equal(saved.blockers[0].title,'Waiting for approval')
  assert.equal(saved.next.items[0].owner,'QA owner')
  assert.equal(saved.next.milestones[0],'Start next phase')
  assert.equal(saved.progress.runningHours, 123.75)
  assert.deepEqual(saved.progress.workstreams, [['Documentation', null], ['Frontend', 0]])
  assert.deepEqual([...document.querySelectorAll('.workstream-counts li')].map(row => row.textContent), ['Documentation', 'Frontend0'])
  assert.match(document.querySelector('.summary-metrics').textContent, /123.75/)
  assert.equal(document.querySelector('.report-crumb a').getAttribute('href'),'/landing/projects/component-qa?month=2026-10&q=QA','return keeps library filters')
  assert.equal(document.body.textContent.includes('Presentation shortcuts'),false)
  assert.equal(document.body.textContent.includes('Source details'),false)
  assert.ok(document.body.textContent.includes('Compared with September 2026'))
  assert.ok(document.body.textContent.includes('Follow-through from last month'))
  assert.equal(saved.carryForward[0].status,'completed')
  await click(byButton('Publish report'))
  await click(byButton('Publish now'))
  await until(()=>!document.querySelector('[role="dialog"]')&&!window.location.search.includes('preview'),'publish')
  assert.ok(document.body.textContent.includes('Published review'))
  await click(document.querySelector('.report-crumb a'))
  await until(() => document.querySelector('.report-table'), 'return to report list')
  await click(document.querySelector('.report-table tbody td[data-label="Status"]'))
  await until(() => document.querySelector('.progress-bento .comparison'), 'open report by clicking its row')
  let copied=''
  Object.defineProperty(window.navigator,'clipboard',{value:{writeText:async value=>{copied=value}},configurable:true})
  await click(byButton('Share report'))
  await click(byButton('Copy chapter link'))
  await act(async () => window.document.activeElement?.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
  assert.ok(copied.endsWith('/2026-10/progress'))
  assert.equal(document.querySelector('.presenter-notes'), null)
  await click(byButton('Edit report'))
  await fill('Progress headline','Edited headline')
  await submit('Save draft')
  await until(()=>!document.querySelector('[role="dialog"]')&&document.body.textContent.includes('Edited headline'),'update report')
  const publication=await nativeFetch(origin+'/api/workspace').then(response=>response.json())
  assert.equal(publication.projects.find(project=>project.id==='component-qa').months.find(month=>month.id==='2026-10').report.coverLine,'QA headline')
  await click([...document.querySelectorAll('.chapter-nav a')].find(node=>node.textContent.trim()==='Next month'))
  await until(()=>document.body.textContent.includes('November 2026 plan'),'open next month')
  await click(byButton('Collapse calendar'))
  assert.equal(byButton('Expand calendar').getAttribute('aria-expanded'), 'false')
  assert.ok(document.querySelector('.calendar-body').hasAttribute('inert'))
  assert.ok(document.querySelector('.plan-actions').textContent.includes('Remaining deadline action'))
  await click(byButton('Expand calendar'))
  assert.equal(byButton('Collapse calendar').getAttribute('aria-expanded'), 'true')
  await click(document.querySelector('.plan-calendar time[datetime="2026-11-15"]').closest('button'))
  await until(()=>!document.querySelector('.plan-actions').textContent.includes('Remaining deadline action'),'filter date')
  await click(byButton('Edit report'))
  await click(byButton('Remove next-month actions entry 1'))
  await submit('Save draft')
  await until(()=>!document.querySelector('[role="dialog"]')&&document.querySelector('.plan-actions')?.textContent.includes('Remaining deadline action'),'recover removed date filter')
  assert.equal(document.querySelector('.plan-calendar time[datetime="2026-11-15"]').closest('button'),null)
  const monthSelect=document.querySelector('.report-period select')
  await act(async()=>{monthSelect.value='2026-09';monthSelect.dispatchEvent(new window.Event('change',{bubbles:true}))})
  await until(()=>window.location.pathname.endsWith('/2026-09/next-month'),'month preserves chapter')
  const octoberSelect=document.querySelector('.report-period select')
  await act(async()=>{octoberSelect.value='2026-10';octoberSelect.dispatchEvent(new window.Event('change',{bubbles:true}))})
  await until(()=>window.location.pathname.endsWith('/2026-10/next-month'),'switch back month')
  await click(byButton('Present'))
  await until(() => document.querySelector('.presentation-directory'), 'presentation overview')
  assert.match(document.querySelector('.presentation-hero').textContent, /October 2026/)
  await click(document.querySelector('.presentation-directory [data-chapter="next-month"]'))
  await click(byButton('Finish review'))
  assert.ok(document.body.textContent.includes('Review complete'))
  await click(byButton('Revisit the plan'))
  await click(byButton('Exit presentation'))
  await click(byButton('Delete October 2026 report'))
  assert.ok(document.querySelector('[role="dialog"]').textContent.includes('Delete October 2026 report?'))
  await click(byButton('Delete'))
  await until(()=>window.location.pathname.endsWith('/component-qa'),'delete report')
  await click(byButton('Delete project'))
  await click(byButton('Delete'))
  await until(()=>window.location.pathname==='/landing/projects'&&!document.querySelector('[role="dialog"]'),'delete project')
  assert.ok(!document.body.textContent.includes('Renamed QA'))
  assert.ok(captured.some(call=>call.path==='/api/workspace'&&call.status===200))

  await act(async()=>{ mobileMatches = true; breakpointListeners.forEach(listener => listener()) })
  assert.equal(byButton('Show sidebar').getAttribute('aria-expanded'),'false','mobile navigation starts collapsed')
  await click(byButton('Show sidebar'))
  assert.equal(document.querySelector('#workspace-sidebar').getAttribute('role'),'dialog')
  assert.equal(document.body.style.overflow,'hidden','drawer locks background scrolling')
  assert.equal(document.activeElement.getAttribute('aria-label'),'Close navigation')
  assert.ok(document.querySelector('.route-frame').hasAttribute('inert'),'drawer covers inert page content')
  const drawerLinks=[...document.querySelectorAll('#workspace-sidebar a')]
  drawerLinks.at(-1).focus()
  await act(async()=>document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true})))
  assert.equal(document.activeElement.getAttribute('aria-label'),'Close navigation','tab stays in drawer')
  await act(async()=>window.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})))
  assert.equal(document.body.style.overflow,'')
  assert.equal(document.activeElement.id,'sidebar-toggle','Escape restores navigation trigger focus')
  await click(byButton('Open search'))
  assert.equal(document.activeElement.getAttribute('name'),'q','opening search focuses query field')
  assert.equal(document.querySelector('.site-header').dataset.searchOpen,'true')
  await act(async()=>{document.querySelector('input[name=q]').value='SIMSDotNet'})
  await submit('Submit search')
  await until(()=>window.location.search.includes('SIMSDotNet'),'mobile search submission')
  assert.equal(document.querySelector('.site-header').dataset.searchOpen,'false')
  await act(async()=>{window.visualViewport.height=360;window.visualViewport.offsetTop=12;window.visualViewport.dispatchEvent(new window.Event('resize'))})
  assert.equal(document.documentElement.style.getPropertyValue('--visible-viewport-height'),'360px','editor uses available keyboard viewport')
  assert.equal(document.documentElement.style.getPropertyValue('--visible-viewport-top'),'12px')
  const { LoadingScreen } = await vite.ssrLoadModule('/src/components/LoadingScreen.jsx')
  const originalTimeout = globalThis.setTimeout
  let slowCallback
  let retries = 0
  globalThis.setTimeout = (callback, delay, ...args) => {
    if (delay === 10000) slowCallback = callback
    return originalTimeout(callback, delay, ...args)
  }
  try {
    await act(async()=>root.render(React.createElement(MemoryRouter, { initialEntries: ['/landing/projects/component-qa/2026-10/next-month'] }, React.createElement(LoadingScreen, { onRetry: () => { retries++ } }))))
    assert.equal(document.querySelector('.loading-screen').dataset.loadingLayout,'report')
    assert.ok(document.querySelector('.skeleton-report-body.with-aside'),'plan skeleton reserves actions and sidebar')
    assert.equal(document.querySelector('.skeleton-metrics'),null,'plan does not show progress placeholders')
    await act(async()=>slowCallback())
    assert.ok(document.body.textContent.includes('taking longer than usual'))
    await click(byButton('Retry loading'))
    assert.equal(retries,1)
    assert.equal(document.querySelector('.loading-slow'),null)
    await act(async()=>slowCallback())
    assert.ok(document.querySelector('.loading-slow'),'slow retry message can return on another long request')
  } finally { globalThis.setTimeout = originalTimeout }

} finally {
  if(root) await act(async()=>root.unmount())
  await vite.close()
  await new Promise(resolve=>server.close(resolve))
  await rm(directory,{recursive:true,force:true})
  window.close()
}
})
