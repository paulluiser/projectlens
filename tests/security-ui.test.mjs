import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const require = createRequire(import.meta.url)
require.extensions['.css'] = () => {}

test('security UI protects codes, confirms regeneration and scopes edit history', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/landing/projects', pretendToBeVisual: true })
  const window = dom.window
  for (const name of ['document', 'HTMLElement', 'HTMLInputElement', 'HTMLButtonElement', 'Element', 'Node', 'NodeFilter', 'MutationObserver', 'CustomEvent', 'DocumentFragment', 'Event', 'MouseEvent', 'KeyboardEvent']) globalThis[name] = window[name]
  globalThis.window = window
  Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true })
  globalThis.getComputedStyle = window.getComputedStyle.bind(window)
  globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window)
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window)
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} })
  globalThis.matchMedia = window.matchMedia
  let workspace = { signedIn: true, canEdit: true, isAdmin: true, projects: [], user: { id: 'a' } }
  const calls = []
  const nativeFetch = globalThis.fetch
  globalThis.fetch = async (path, options = {}) => {
    calls.push({ path, options })
    const data = (path === '/api/workspace' || path === '/api/session') ? workspace : path.startsWith('/api/history') ? { events: [{ id: 'event', action: 'updateReport', at: '2026-11-24T01:00:00Z', actor: { firstName: 'Ada', lastName: 'Lovelace' }, changes: [{ field: 'title', before: 'Before', after: 'After' }] }] } : { remoteCode: options.method ? 'NEW1234' : 'OLD1234', code: JSON.parse(options.body || '{}').action === 'createGuestCode' ? 'GUEST12' : 'NEW1234', guestCodes: [], auditEvents: [] }
    return { ok: true, json: async () => data }
  }
  const React = require('react')
  const { act } = React
  const { createRoot } = require('react-dom/client')
  const vite = await createServer({ server: { middlewareMode: true } })
  const root = createRoot(document.getElementById('root'))
  const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
  const button = label => [...document.querySelectorAll('button')].find(node => node.textContent.trim() === label || node.getAttribute('aria-label') === label)
  const click = async label => { assert.ok(button(label), label); await act(async () => button(label).click()); await settle() }
  try {
    const { WorkspaceProvider } = await vite.ssrLoadModule('/src/lib/workspace.jsx')
    const { SecuritySettings } = await vite.ssrLoadModule('/src/components/SecuritySettings.jsx')
    const { EditHistory } = await vite.ssrLoadModule('/src/components/EditHistory.jsx')
    const render = async () => { await act(async () => root.render(React.createElement(WorkspaceProvider, { active: true, key: workspace.canEdit }, React.createElement(React.Fragment, null, React.createElement(SecuritySettings, { onBusyChange() {} }), React.createElement(EditHistory, { projectId: 'alpha', module: 'report', entityId: '2026-11' }))))); await settle() }
    await render()
    assert.equal(document.body.textContent.includes('OLD1234'), false)
    await click('Reveal code')
    assert.ok(document.body.textContent.includes('OLD1234'))
    await click('Regenerate code')
    assert.equal(calls.filter(call => call.options.method === 'POST').length, 0)
    await click('Replace code')
    assert.equal(JSON.parse(calls.find(call => call.options.method === 'POST').options.body).action, 'regenerateRemoteCode')
    assert.equal(document.body.textContent.includes('NEW1234'), false)
    await click('Create guest code')
    assert.ok(document.body.textContent.includes('GUEST12'))
    await click('Done')
    assert.equal(document.body.textContent.includes('GUEST12'), false)
    await click('Edit history')
    assert.ok(calls.some(call => call.path === '/api/history?projectId=alpha&module=report&entityId=2026-11'))
    assert.ok(document.body.textContent.includes('Ada Lovelace'))
    assert.ok(document.body.textContent.includes('Before'))
    assert.ok(document.body.textContent.includes('After'))
    await click('Close edit history')
    workspace = { ...workspace, canEdit: false, isAdmin: false }
    await render()
    assert.equal(button('Edit history'), undefined)
    assert.equal(button('Create guest code'), undefined)
  } finally {
    await act(async () => root.unmount())
    await vite.close()
    globalThis.fetch = nativeFetch
    window.close()
  }
})
