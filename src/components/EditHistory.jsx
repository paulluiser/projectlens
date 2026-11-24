import { useEffect, useState } from 'react'
import { Dialog } from 'radix-ui'
import { Button } from '@/components/ui/button'
import { ModalHeader } from '@/components/ui/modal-header'
import { ClockIcon } from '@/components/ui/icons'
import { useWorkspace } from '@/lib/workspace'
import '../styles/security.css'

export async function securityRequest(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...options, headers: { 'Content-Type': 'application/json', ...options.headers } })
  let data
  try { data = await response.json() } catch { throw new Error('The server returned an unreadable response. Please try again.') }
  if (!response.ok) throw new Error(data.error || 'This information could not be loaded. Please try again.')
  return data
}

function readable(value) {
  if (value == null || value === '') return 'Empty'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
function fieldLabel(value = '') {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_.]/g, ' ').replace(/^./, letter => letter.toUpperCase())
}

export function ActivityEvents({ events, empty = 'No activity recorded yet.', changes = false }) {
  return events.length ? <ol className="security-events">{events.map((event, index) => {
    const actor = event.actor
    const name = typeof actor === 'string' ? actor : actor?.name || [actor?.firstName, actor?.lastName].filter(Boolean).join(' ') || actor?.email || 'Unknown user'
    const timestamp = event.createdAt || event.at || event.timestamp
    const date = new Date(timestamp)
    return <li key={event.id || index}>
      <div className="security-event-heading"><strong>{event.summary || fieldLabel(event.action || event.type || 'Workspace activity')}</strong>{timestamp && !Number.isNaN(date.getTime()) && <time dateTime={timestamp}>{date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time>}</div>
      <p className="security-event-actor">{name}{actor?.role ? ` · ${fieldLabel(actor.role)}` : ''}</p>
      {changes && Array.isArray(event.changes) && event.changes.length > 0 && <dl className="history-changes">{event.changes.map((change, changeIndex) => <div key={changeIndex}><dt>{fieldLabel(change.field || change.path || 'Change')}</dt><dd><span className="history-before">{readable(change.before)}</span><span className="history-change-arrow">to</span><span>{readable(change.after)}</span></dd></div>)}</dl>}
    </li>
  })}</ol> : <p className="settings-account-note">{empty}</p>
}

export function EditHistory({ projectId, module, entityId, label = 'Edit history' }) {
  const { workspace } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!open || !workspace?.canEdit) return
    const controller = new AbortController()
    const params = new URLSearchParams({ projectId, module })
    if (entityId) params.set('entityId', entityId)
    setLoading(true); setError(''); setEvents([])
    securityRequest(`/api/history?${params}`, { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setEvents(data.events || []) }).catch(failure => { if (!controller.signal.aborted) setError(failure.message) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [open, projectId, module, entityId, attempt, workspace?.canEdit])
  if (!workspace?.canEdit) return null
  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger asChild><Button variant="outline" className="action"><ClockIcon label="" size="small" />{label}</Button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="editor-overlay" /><Dialog.Content className="editor-dialog history-dialog">
      <ModalHeader title={label} description="Who changed this information and what changed." icon={ClockIcon} closeLabel="Close edit history" />
      <div className="history-content">{loading ? <p className="settings-account-note" role="status">Loading edit history…</p> : error ? <div><p className="editor-error" role="alert">{error}</p><Button className="action" variant="outline" onClick={() => setAttempt(value => value + 1)}>Retry</Button></div> : <ActivityEvents events={events} changes empty="No edits have been recorded for this view yet." />}</div>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>
}
