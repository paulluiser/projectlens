import { useEffect, useState } from 'react'
import { Dialog, Popover } from 'radix-ui'
import { ChecklistIcon, ShareIcon } from '@/components/ui/icons'
import { ModalHeader } from '@/components/ui/modal-header'
import { Button } from '@/components/ui/button'
import { useWorkspace } from '@/lib/workspace'
import { reportPath } from '@/lib/routes.mjs'
import { compareReports, previousMonthId, reportCompleteness } from '@/lib/review.mjs'
import { AnimatedMetric } from './AnimatedMetric'

const formatMetric = new Intl.NumberFormat('en', { maximumFractionDigits: 1 })

export function MonthComparison({ report, project, elapsed }) {
  const previousId = previousMonthId(report.month)
  const prior = project.months.find(month => month.id === previousId)?.report
  const previousLabel = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${previousId}-01T00:00:00Z`))
  const comparisons = compareReports(report, prior)
  return <section className="workspace-panel comparison">
    <h2>Compared with {previousLabel}</h2>
    {comparisons.length ? <dl>{comparisons.map(item => (
      <div key={item.key}>
        <dt>{item.label}</dt>
        <dd>
          <AnimatedMetric value={formatMetric.format(item.current) + (item.unit === '%' ? '%' : '')} elapsed={elapsed} delay={260} />
          <span className="comparison-delta">{item.delta > 0 ? '+' : ''}{formatMetric.format(item.delta)} {item.unit === '%' ? 'percentage points' : item.unit} · previously {formatMetric.format(item.previous)}</span>
        </dd>
      </div>
    ))}</dl> : <p>No published report for the previous calendar month. Comparisons will appear when both months are available.</p>}
  </section>
}

export function CommitmentOutcomes({ report }) {
  if (!report.carryForward?.length) return null
  return <section className="workspace-panel commitment-outcomes"><h2>Follow-through from last month</h2><ul>{report.carryForward.map(item => <li key={`${item.sourceMonth}:${item.sourceIndex}`}><div><strong>{item.title}</strong><p>{item.owner} · originally due {item.date}</p>{item.context && <p>{item.context}</p>}</div><span className="lozenge neutral">{item.status.replace('-', ' ')}</span></li>)}</ul></section>
}

export function PublishReport({ project, month, onPublished }) {
  const { workspace, mutate, setEditing } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(null)
  const [missing, setMissing] = useState([])
  useEffect(() => { if (!open) return; setEditing(true); return () => setEditing(false) }, [open, setEditing])
  if (!workspace.canEdit || !month.draft) return null
  function toggle(value) { if (!busy) { setOpen(value); if (value) { setVersion(workspace.version); setMissing(reportCompleteness(month.draft)); setError('') } } }
  return <Dialog.Root open={open} onOpenChange={toggle}><Dialog.Trigger asChild><Button className="action action-primary">Publish report</Button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="editor-overlay" /><Dialog.Content className="editor-dialog" onEscapeKeyDown={event => { if (busy) event.preventDefault() }} onPointerDownOutside={event => event.preventDefault()}><ModalHeader title="Ready to publish?" icon={ChecklistIcon} busy={busy} description="Readers will see this saved draft. Later edits stay private until you publish again." /><div className="dialog-body">{missing.length ? <><h3>Consider adding</h3><ul className="completeness-list">{missing.map(label => <li key={label}>{label}</li>)}</ul><p>These sections are optional. Publish when the review tells the right story.</p></> : <p>All review sections have content.</p>}{error && <p role="alert" className="editor-error">{error}</p>}</div><div className="editor-footer"><Button variant="outline" className="action" disabled={busy} onClick={() => toggle(false)}>Keep as draft</Button><Button className="action action-primary" loading={busy} onClick={async () => { setBusy(true); try { await mutate({ action: 'publishReport', projectId: project.id, monthId: month.id }, version); setOpen(false); setEditing(false); onPublished() } catch (failure) { setError(`${failure.message} Close this dialog and reload the draft before publishing again.`) } finally { setBusy(false) } }}>{busy ? 'Publishing…' : 'Publish now'}</Button></div></Dialog.Content></Dialog.Portal></Dialog.Root>
}

export function ShareReport({ projectId, monthId, chapterId, published }) {
  const [message, setMessage] = useState('')
  const [fallback, setFallback] = useState('')
  async function copy(chapter) {
    const url = new URL(reportPath(projectId, monthId, chapter), window.location.origin).href
    try { await navigator.clipboard.writeText(url); setFallback(''); setMessage('Published link copied.') }
    catch { setFallback(url); setMessage('Select and copy this link.') }
  }
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="outline" className="action record-icon-action" aria-label="Share report" title="Share report">
          <ShareIcon label="" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="share-popover" align="end" sideOffset={8} collisionPadding={12} aria-label="Share report">
          <strong>Share report</strong>
          <p>{published ? 'Links open the published report.' : 'Publish this draft before sharing.'}</p>
          <Button variant="outline" className="action" disabled={!published} onClick={() => copy('progress')}>Copy report link</Button>
          <Button variant="outline" className="action" disabled={!published} onClick={() => copy(chapterId)}>Copy chapter link</Button>
          <p role="status">{message}</p>
          {fallback && <label>Share link<input readOnly value={fallback} onFocus={event => event.target.select()} /></label>}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
