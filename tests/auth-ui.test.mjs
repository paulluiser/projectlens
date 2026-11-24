import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

test('public entry, identity onboarding, account changes during saves and session revocation', async () => {
  const require = createRequire(new URL('../package.json', import.meta.url))
  require.extensions['.css'] = () => {}
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/landing', pretendToBeVisual: true })
  const { window } = dom
  for (const name of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'HTMLButtonElement', 'HTMLFormElement', 'FormData', 'Element', 'Node', 'NodeFilter', 'MutationObserver', 'CustomEvent', 'DocumentFragment', 'Event', 'MouseEvent', 'KeyboardEvent']) globalThis[name] = name === 'window' ? window : window[name]
  Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true })
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} })
  window.scrollTo = () => {}
  globalThis.matchMedia = window.matchMedia
  globalThis.localStorage = window.localStorage
  globalThis.getComputedStyle = window.getComputedStyle.bind(window)
  globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window)
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window)
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  window.google = { accounts: { id: { initialize() {}, renderButton(holder) { holder.textContent = 'Continue with Google' } } } }
  const originalFetch = globalThis.fetch
  let session = { signedIn: false }
  const calls = []
  let holdMutation = null
  let holdRecovery = null
  let conflictMutation = false
  globalThis.fetch = async (path, options = {}) => {
    const body = options.body ? JSON.parse(options.body) : undefined
    calls.push({ path, method: options.method || 'GET', body })
    let result = session, status = 200
    if (path === '/api/session?challenge=google') result = { nonce: 'nonce', googleClientId: 'test-client' }
    else if (path === '/api/session' && options.method === 'POST') {
      if (!body.firstName) { result = { error: 'Please provide your name.', code: 'GUEST_NAME_REQUIRED' }; status = 400 }
      else result = session = { signedIn: true, needsName: false, role: 'guest', user: { id: 'guest', firstName: body.firstName, lastName: body.lastName } }
    } else if (path === '/api/session' && options.method === 'DELETE') result = session = { signedIn: false }
    else if (path === '/api/security') result = session = { ...session, needsName: false, user: { ...session.user, ...body.data } }
    else if (path === '/api/workspace') {
      result = { version: 1, canEdit: !!session.canEdit, projects: session.canEdit ? [{ id: 'private-editor-draft' }] : [] }
      if (options.method === 'POST') {
        if (holdMutation) await holdMutation
        if (conflictMutation) { result = { error: 'The workspace changed.' }; status = 409 }
      } else if (holdRecovery && session.canEdit) await holdRecovery
    }
    return { ok: status === 200, status, json: async () => result }
  }
  const vite = await createServer({ configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)), server: { middlewareMode: true }, appType: 'custom' })
  const React = require('react')
  const { act } = React
  const { createRoot } = require('react-dom/client')
  const { MemoryRouter } = require('react-router-dom')
  let root, context
  const settle = async () => act(async () => { await new Promise(resolve => setTimeout(resolve, 25)) })
  try {
    const { WorkspaceProvider, useWorkspace } = await vite.ssrLoadModule('/src/lib/workspace.jsx')
    const { AuthExperience, WorkspaceLink } = await vite.ssrLoadModule('/src/components/SignInDialog.jsx')
    function Probe() { context = useWorkspace(); return React.createElement(WorkspaceLink, null, 'Open workspace') }
    root = createRoot(document.getElementById('root'))
    await act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(WorkspaceProvider, { active: false }, React.createElement(Probe), React.createElement(AuthExperience)))))
    await settle()
    assert.equal(context.signedIn, false)
    assert.equal(calls.some(call => call.path === '/api/workspace'), false)
    assert.equal(calls.some(call => call.path.includes('challenge')), false)
    await act(async () => document.querySelector('a').click())
    await settle()
    assert.ok(document.querySelector('[role="dialog"]'))
    assert.ok(calls.some(call => call.path === '/api/session?challenge=google'))
    document.querySelector('[name="code"]').value = 'ABC1234'
    await act(async () => document.querySelector('.auth-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    await settle()
    assert.ok(document.querySelector('[name="firstName"]'), 'guest code asks for a name before creating a session')
    document.querySelector('[name="firstName"]').value = 'Jane'
    document.querySelector('[name="lastName"]').value = 'Doe'
    await act(async () => document.querySelector('.auth-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    await settle()
    assert.equal(context.signedIn, true)
    assert.equal(document.querySelector('[role="dialog"]'), null)
    assert.ok(calls.some(call => call.path === '/api/workspace'))
    session = { signedIn: true, needsName: true, role: 'viewer', user: { id: 'legacy' } }
    await act(async () => context.refresh(true))
    await settle()
    assert.match(document.querySelector('[role="dialog"]').textContent, /What should we call you/)
    document.querySelector('[name="firstName"]').value = 'Sam'
    document.querySelector('[name="lastName"]').value = 'Lee'
    await act(async () => document.querySelector('.auth-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    await settle()
    assert.equal(context.session.needsName, false)
    assert.deepEqual(calls.find(call => call.path === '/api/security').body, { action: 'completeProfile', data: { firstName: 'Sam', lastName: 'Lee' } })
    await act(async () => context.logout())
    assert.equal(context.signedIn, false)
    assert.equal(context.workspace, null)
    assert.equal(context.error, '')

    const editor = { signedIn: true, needsName: false, role: 'editor', canEdit: true, user: { id: 'editor', firstName: 'Editor', lastName: 'User' } }
    session = editor
    await act(async () => context.refresh(true))
    assert.equal(context.workspace.canEdit, true)
    let releaseMutation
    holdMutation = new Promise(resolve => { releaseMutation = resolve })
    let pendingMutation
    await act(async () => { pendingMutation = context.mutate({ action: 'updateProject', data: { id: 'private-editor-draft' } }, 1).catch(failure => failure) })
    await act(async () => context.logout())
    await act(async () => context.loginCode('ABC1234', 'Guest', 'Viewer'))
    assert.equal(context.session.role, 'guest')
    assert.equal(context.workspace.canEdit, false)
    await act(async () => { releaseMutation(); await pendingMutation })
    holdMutation = null
    assert.match((await pendingMutation).message, /account changed/)
    assert.equal(context.workspace.canEdit, false, 'a delayed editor save cannot restore edit permission after a guest signs in')
    assert.deepEqual(context.workspace.projects, [], 'a delayed editor save cannot restore private editor records')

    session = editor
    await act(async () => context.refresh(true))
    let releaseRecovery
    holdRecovery = new Promise(resolve => { releaseRecovery = resolve })
    conflictMutation = true
    const callsBeforeRecovery = calls.length
    await act(async () => { pendingMutation = context.mutate({ action: 'updateProject', data: { id: 'private-editor-draft' } }, 1).catch(failure => failure) })
    assert.ok(calls.slice(callsBeforeRecovery).some(call => call.path === '/api/workspace' && call.method === 'GET'), 'a conflicting save starts a recovery fetch')
    await act(async () => context.logout())
    await act(async () => context.loginCode('ABC1234', 'Guest', 'Viewer'))
    await act(async () => { releaseRecovery(); await pendingMutation })
    holdRecovery = null
    conflictMutation = false
    assert.equal(context.session.role, 'guest')
    assert.equal(context.workspace.canEdit, false, 'a recovery response from a previous account cannot restore its permission')
    assert.deepEqual(context.workspace.projects, [], 'a recovery response from a previous account cannot expose its private records')

    session = editor
    await act(async () => context.refresh(true))
    await act(async () => context.setEditing(true))
    const workspaceReadsBeforeRevocation = calls.filter(call => call.path === '/api/workspace' && call.method === 'GET').length
    session = { signedIn: false }
    await act(async () => context.refresh())
    assert.equal(context.signedIn, false, 'session revocation is checked while an editor is open')
    assert.equal(context.workspace, null, 'session revocation clears private records while an editor is open')
    assert.equal(calls.filter(call => call.path === '/api/workspace' && call.method === 'GET').length, workspaceReadsBeforeRevocation, 'revoked sessions do not request workspace data')
    await act(async () => context.setEditing(false))
    session = { ...editor, role: 'guest', canEdit: false, isAdmin: false, sessionExpiresAt: new Date(Date.now() + 80).toISOString() }
    await act(async () => context.refresh(true))
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 100)) })
    assert.equal(context.signedIn, false, 'guest access expires even without another navigation or refresh')
    assert.equal(context.workspace, null, 'guest expiry removes loaded workspace content')
    assert.ok(calls.some(call => call.path === '/api/session' && call.method === 'DELETE'), 'guest expiry clears the session cookie')
    await act(async () => root.unmount())
    root = createRoot(document.getElementById('root'))
    const { App } = await vite.ssrLoadModule('/src/App.jsx')
    await act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: ['/landing/projects/private?month=2026-11'] }, React.createElement(App))))
    await settle()
    assert.ok(document.querySelector('.public-landing'), 'anonymous deep links render the public landing')
    assert.ok(document.querySelector('[role="dialog"]'), 'anonymous deep links offer sign-in without exposing workspace content')
    assert.equal(document.querySelector('.site-sidebar'), null)
  } finally {
    if (root) await act(async () => root.unmount())
    await vite.close()
    dom.window.close()
    globalThis.fetch = originalFetch
  }
})
