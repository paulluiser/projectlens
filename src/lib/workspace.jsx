import { AnimatePresence, motion } from 'framer-motion'
import { LoadingScreen } from '@/components/LoadingScreen'
import { useReducedMotion } from '@/lib/motion'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const WorkspaceContext = createContext(null)

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  let body
  try {
    body = await response.json()
  } catch {
    throw new Error('The server returned an unreadable response. Please try again.')
  }
  if (!response.ok) {
    const error = new Error(body.error || 'The request could not be completed.')
    error.status = response.status
    throw error
  }
  return body
}

export function WorkspaceProvider({ active, children }) {
  const reduced = useReducedMotion()
  const [refreshing, setRefreshing] = useState(false)
  const [workspace, setWorkspace] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  // A notice is a message, or { text, action: { label, run } } for an undoable change (kept on screen longer).
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), typeof notice === 'object' ? 10000 : 6000)
    return () => clearTimeout(timer)
  }, [notice])
  const latest = useRef(null)
  latest.current = workspace
  const latestVersion = useCallback(() => latest.current?.version, [])
  const sequence = useRef(0)
  const writing = useRef(false)
  const editing = useRef(false)
  const setEditing = useCallback((value) => {
    editing.current = value
    if (value) { sequence.current++; setRefreshing(false) }
  }, [])

  const refresh = useCallback(async (force = false) => {
    if (writing.current || (editing.current && force !== true)) return
    const requestId = ++sequence.current
    setRefreshing(true)
    setError('')
    try {
      const result = await request('/api/workspace')
      if (requestId === sequence.current) {
        setWorkspace(result)
        setError('')
      }
      return result
    } catch (failure) {
      if (requestId === sequence.current) setError(failure.message)
    } finally { if (requestId === sequence.current) setRefreshing(false) }
  }, [])

  useEffect(() => {
    if (!active) return
    refresh()
    const onVisible = () => {
      if (!document.hidden) refresh()
    }
    const interval = setInterval(onVisible, 15000)
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      sequence.current++
      clearInterval(interval)
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [active, refresh])

  async function mutate(operation, expectedVersion, options = {}) {
    if (writing.current) throw new Error('Another change is saving. Please wait a moment.')
    writing.current = true
    setRefreshing(false)
    sequence.current++
    try {
      const result = await request('/api/workspace', {
        method: 'POST',
        body: JSON.stringify({ ...operation, expectedVersion }),
      })
      setWorkspace(result)
      setError('')
      const entity = operation.action.endsWith('Project') ? 'Project' : operation.action.endsWith('Milestone') ? 'Milestone' : operation.action.endsWith('Week') ? 'Week' : operation.action.endsWith('Task') ? 'Task' : 'Report'
      const verb = operation.action === 'publishReport' ? 'published' : operation.action.startsWith('delete') ? 'deleted' : operation.action.startsWith('create') ? 'created' : 'saved'
      if (options.notice !== undefined) setNotice(options.notice || '')
      else setNotice(`${entity} ${verb}.${operation.action.endsWith('Report') && ['createReport', 'updateReport'].includes(operation.action) ? ' Preview the draft, then publish when ready.' : ''}`)
      return result
    } catch (failure) {
      if ([401,403,409].includes(failure.status)) {
        try {
          const latest = await request('/api/workspace')
          setWorkspace(latest)
          setError('')
        } catch (refreshFailure) {
          setError(refreshFailure.message)
        }
      }
      throw failure
    } finally {
      writing.current = false
    }
  }

  const beginGoogleLogin = useCallback(() => request('/api/session'), [])
  const loginGoogle = useCallback(async (credential) => {
    await request('/api/session', { method: 'POST', body: JSON.stringify({ credential }) })
    const result = await refresh(true)
    if (!result) throw new Error('Signed in, but workspace data could not be loaded. Refresh data and try again.')
    return result
  }, [refresh])

  async function login(password) {
    await request('/api/session', { method: 'POST', body: JSON.stringify({ password }) })
    return refresh(true)
  }

  async function logout() {
    await request('/api/session', { method: 'DELETE' })
    setWorkspace(null)
    return refresh(true)
  }

  return <WorkspaceContext.Provider value={{ workspace, error, refreshing, refresh, mutate, login, loginGoogle, beginGoogleLogin, logout, setEditing, notify: setNotice, latestVersion }}>
    {active && workspace && refreshing && <div className="workspace-refresh" aria-hidden="true"><span className="busy-indicator" aria-hidden="true" /> Checking for updates…</div>}
    {children}
    <div className="save-announcement" role="status" aria-live="polite" aria-atomic="true"><AnimatePresence initial={false}>{notice && <motion.div className="save-message" key={typeof notice === 'object' ? notice.text : notice} initial={{ opacity: 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : 4 }} transition={{ duration: reduced ? 0 : 0.18 }}><span>{typeof notice === 'object' ? notice.text : notice}</span>{typeof notice === 'object' && notice.action && <button type="button" className="save-message-action" onClick={() => { const { run } = notice.action; setNotice(''); run() }}>{notice.action.label}</button>}<button type="button" aria-label="Dismiss notification" onClick={() => setNotice('')}>Dismiss</button></motion.div>}</AnimatePresence></div>
  </WorkspaceContext.Provider>
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error('WorkspaceProvider is required for project data.')
  return context
}

export function WorkspaceNotice({ children }) {
  const { workspace, error, refresh } = useWorkspace()
  if (!workspace) {
    if (!error) return <LoadingScreen onRetry={refresh} />
    return <main id="main-content" className="site-width" tabIndex={-1}><div className="loading-error" role="alert"><h1>Projects could not be loaded</h1><p>{error}</p><button type="button" className="text-link" onClick={refresh}>Try again</button></div></main>
  }
  return <>{error && <div role="status" className="refresh-notice">Refresh failed. Showing the last loaded records. <button type="button" onClick={refresh}>Retry</button></div>}{children}</>
}
