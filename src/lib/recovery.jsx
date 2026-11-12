import { useEffect, useRef, useState } from 'react'

export function recoveryKey(kind, projectId, monthId) {
  return `lens-recovery:${kind}:${projectId ?? 'new'}:${monthId ?? 'new'}`
}

export function useRecovery(initial, key, onDirty) {
  const baseline = useRef(JSON.stringify(initial))
  const [value, setValue] = useState(initial)
  const [candidate, setCandidate] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
  })
  const [storageError, setStorageError] = useState('')
  const wasDirty = useRef(false)
  const dirty = JSON.stringify(value) !== baseline.current
  useEffect(() => {
    onDirty?.(dirty)
    if (!dirty) {
      if (wasDirty.current) { try { localStorage.removeItem(key) } catch {} }
      wasDirty.current = false
      return
    }
    wasDirty.current = true
    setCandidate(null)
    try { localStorage.setItem(key, JSON.stringify({ savedAt: new Date().toISOString(), value })); setStorageError('') }
    catch { setStorageError('This browser cannot keep a recovery copy. Save your work before leaving.') }
  }, [value, dirty, key, onDirty])
  useEffect(() => {
    if (!dirty) return
    const warn = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  function discard() { try { localStorage.removeItem(key) } catch { /* Storage may be unavailable. */ } setCandidate(null) }
  const recovery = <>{candidate && <div className="recovery-notice"><p>A recovery copy from {new Date(candidate.savedAt).toLocaleString()} is available on this device.</p><button type="button" className="text-link" onClick={() => { setValue(candidate.value); setCandidate(null) }}>Restore recovery copy</button><button type="button" className="text-link" onClick={discard}>Discard recovery copy</button></div>}{storageError && <p role="alert">{storageError}</p>}</>
  return { value, setValue, recovery }
}
