import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

test('active viewer avatars vary and reveal only first names when clicked', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost', pretendToBeVisual: true })
  const { window } = dom
  for (const name of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'NodeFilter', 'MutationObserver', 'CustomEvent', 'DocumentFragment', 'Event', 'KeyboardEvent']) globalThis[name] = name === 'window' ? window : window[name]
  Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true })
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} })
  globalThis.localStorage = window.localStorage
  globalThis.getComputedStyle = window.getComputedStyle.bind(window)
  globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window)
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window)
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const require = createRequire(import.meta.url)
  require.extensions['.css'] = () => {}
  const React = require('react')
  const { createRoot } = require('react-dom/client')
  const vite = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), server: { middlewareMode: true } })
  const root = createRoot(document.getElementById('root'))
  try {
    const { ViewerIcons, ActiveViewers } = await vite.ssrLoadModule('/src/components/ActiveViewers.jsx')
    const viewers = ['Paul', 'Rica', 'Miguel', 'Rose', 'KC'].map((firstName, index) => ({ id: `person-${index}`, firstName }))
    await React.act(async () => { root.render(React.createElement(ViewerIcons, { viewers })) })
    assert.equal(document.body.textContent.includes('Paul'), false, 'names are hidden before an avatar is opened')
    assert.equal(document.querySelectorAll('.viewer-trigger').length, 3)
    assert.equal(document.querySelector('.viewer-overflow').textContent, '+3')
    assert.equal(document.querySelectorAll('.active-viewers .viewer-avatar').length, 2)
    assert.ok(new Set([...document.querySelectorAll('.viewer-avatar')].map(node => node.getAttribute('style'))).size > 1, 'avatars use different colors')
    await React.act(async () => { document.querySelector('.viewer-trigger').click() })
    assert.equal(document.querySelector('.viewer-popover strong')?.textContent, 'Paul')
    assert.equal(document.querySelector('.viewer-popover').textContent, 'Paul', 'popover exposes only the first name')
    await React.act(async () => { document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) })
    await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
    await React.act(async () => { document.querySelector('.viewer-overflow').click() })
    for (let attempt = 0; attempt < 20 && !document.querySelector('.viewer-list strong'); attempt++) {
      await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 10)) })
    }
    assert.deepEqual([...document.querySelectorAll('.viewer-list strong')].map(node => node.textContent), ['Miguel', 'Rose', 'KC'])
    const originalFetch = globalThis.fetch
    const originalSetInterval = globalThis.setInterval
    const originalNow = Date.now
    const intervals = []
    let heartbeats = 0
    const account = { signedIn: true, needsName: false, user: { id: 'viewer', firstName: 'Paul', lastName: 'User' } }
    globalThis.fetch = async path => {
      if (path === '/api/presence') heartbeats++
      return { ok: true, json: async () => path === '/api/presence' ? { viewers } : { ...account, projects: [], version: 1 } }
    }
    globalThis.setInterval = (callback, delay, ...args) => { intervals.push({ callback, delay }); return originalSetInterval(callback, delay, ...args) }
    try {
      const { WorkspaceProvider } = await vite.ssrLoadModule('/src/lib/workspace.jsx')
      await React.act(async () => { root.render(React.createElement(WorkspaceProvider, { active: false }, React.createElement(ActiveViewers))) })
      assert.equal(heartbeats, 1, 'named viewers send an initial presence heartbeat')
      assert.equal(intervals.filter(interval => interval.delay === 60000).length, 1, 'presence sends one heartbeat per minute')
      assert.equal(intervals.some(interval => interval.delay === 20000), false, 'the previous 20-second heartbeat is removed')
      await React.act(async () => { document.dispatchEvent(new Event('visibilitychange')); document.dispatchEvent(new Event('visibilitychange')) })
      assert.equal(heartbeats, 1, 'rapid visibility events do not send duplicate presence requests')
      Date.now = () => originalNow() + 61000
      await React.act(async () => { await intervals.find(interval => interval.delay === 60000).callback() })
      assert.equal(heartbeats, 2, 'the next minute renews presence')
    } finally {
      Date.now = originalNow
      globalThis.fetch = originalFetch
      globalThis.setInterval = originalSetInterval
    }

  } finally {
    await React.act(async () => root.unmount())
    await vite.close()
    dom.window.close()
  }
})
