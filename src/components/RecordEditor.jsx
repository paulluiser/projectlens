import { useEffect, useId, useRef, useState } from 'react'
import { Dialog } from 'radix-ui'
import AddGlyph from '@atlaskit/icon/core/add'
import EditGlyph from '@atlaskit/icon/core/edit'
import DeleteGlyph from '@atlaskit/icon/core/delete'
import CrossGlyph from '@atlaskit/icon/core/cross'
import { PersonIcon } from '@/components/ui/icons'
import { ModalHeader } from '@/components/ui/modal-header'
import { Button } from '@/components/ui/button'
import { useWorkspace } from '@/lib/workspace'
import { recoveryKey, useRecovery } from '@/lib/recovery'
import { previousMonthId, carryForwardItems } from '@/lib/review.mjs'

const unwrap = (glyph) => glyph.default ?? glyph
const AddIcon = unwrap(AddGlyph)
const EditIcon = unwrap(EditGlyph)
const DeleteIcon = unwrap(DeleteGlyph)
const CrossIcon = unwrap(CrossGlyph)

const monthFormat = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' })

function monthLabel(month) {
  return monthFormat.format(new Date(`${month}-01T00:00:00Z`))
}

function nextMonth(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return ''
  const date = new Date(`${month}-01T00:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() + 1)
  return date.toISOString().slice(0, 7)
}

function blankReport(month) {
  return {
    month,
    title: '',
    coverLine: '',
    source: '',
    progress: { completed: 0, planned: 0, carryOver: 0, projectCompleted: 0, total: 0, hours: 0, hoursNote: '', workstreams: [], reporting: [] },
    wins: [], blockers: [],
    next: { month: monthLabel(nextMonth(month)), items: [], milestones: [], support: '' },
  }
}

function usePauseRefresh(open) {
  const { setEditing } = useWorkspace()
  useEffect(() => {
    if (!open) return
    setEditing(true)
    return () => setEditing(false)
  }, [open, setEditing])
}

function Field({ label, multiline, hint, ...props }) {
  const Component = multiline ? 'textarea' : 'input'
  const id = useId()
  const [error, setError] = useState('')
  return <label className="editor-field"><span className="field-label">{label}{props.required ? <span className="field-required" aria-hidden="true"> *</span> : <span className="field-optional"> (optional)</span>}</span><Component {...props} aria-invalid={Boolean(error)} aria-describedby={hint || error ? id : undefined} onInvalid={(event) => setError(event.currentTarget.validationMessage)} onChange={(event) => { setError(''); props.onChange?.(event) }} />{(error || hint) && <small id={id} className={error ? 'field-error' : 'field-hint'}>{error || hint}</small>}</label>
}

function Rows({ title, value, onChange, fields, addLabel }) {
  return (
    <section className="editor-rows">
      <div className="editor-section-heading"><h3>{title}</h3><Button type="button" variant="outline" className="action" onClick={() => onChange([...value, Object.fromEntries(fields.map((field) => [field.key, field.defaultValue ?? '']))])}><AddIcon label="" /> {addLabel}</Button></div>
      {value.length === 0 && <p className="editor-empty">No entries yet.</p>}
      {value.map((row, index) => (
        <div className="editor-list-row" role="group" aria-label={`${title} entry ${index + 1}`} key={index}>
          <div className="editor-row-fields">
            {fields.map(({ key, label, defaultValue: ignored, ...props }) => <Field key={key} label={`${label} ${index + 1}`} {...props} value={row[key] ?? ''}
              onChange={(event) => onChange(value.map((entry, position) => position === index ? { ...entry, [key]: event.target.value } : entry))} />)}
          </div>
          <button type="button" className="icon-button remove-row" aria-label={`Remove ${title.toLowerCase()} entry ${index + 1}`} onClick={() => onChange(value.filter((_, position) => position !== index))}><CrossIcon label="" /></button>
        </div>
      ))}
    </section>
  )
}

function ProjectFields({ project, onSubmit, busy, close, recoveryId, onDirty }) {
  const { value, setValue, recovery } = useRecovery({ name: project?.name ?? '', description: project?.description ?? '' }, recoveryId, onDirty)
  return <form className="editor-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ name: value.name.trim(), description: value.description.trim() }) }}>
    <div className="editor-scroll">{recovery}<fieldset disabled={busy} className="editor-form-fields"><Field label="Project name" required maxLength={120} value={value.name} onChange={(event) => setValue({ ...value, name: event.target.value })} />
    <Field label="Description" multiline maxLength={2000} value={value.description} onChange={(event) => setValue({ ...value, description: event.target.value })} />
    </fieldset></div><EditorFooter busy={busy} close={close} label={project ? 'Save project' : 'Create project'} />
  </form>
}

function EditorFooter({ busy, close, label }) {
  return <div className="editor-footer"><Button type="button" variant="outline" className="action" disabled={busy} onClick={close}>Cancel</Button><Button className="action action-primary" loading={busy}>{busy ? label === 'Sign in' ? 'Signing in…' : 'Saving…' : label}</Button></div>
}

function ReportFields({ report, monthId, onSubmit, busy, close, project, recoveryId, onDirty }) {
  const formId = useId()
  const scroller = useRef(null)
  const sections = ['Details', 'Progress', 'Accomplishments', 'Blockers', 'Next month']
  const [currentSection, setCurrentSection] = useState(0)
  function showInvalidSection(event) {
    const firstInvalid = event.currentTarget.querySelector('input:invalid, textarea:invalid, select:invalid')
    if (firstInvalid !== event.target) return
    const panel = firstInvalid.closest('[data-form-section]')
    if (!panel) return
    setCurrentSection(Number(panel.dataset.formSection))
    requestAnimationFrame(() => firstInvalid.focus())
  }
  const now = new Date()
  const initialMonth = monthId ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const { value: bundle, setValue: setBundle, recovery } = useRecovery({
    form: structuredClone(report ?? blankReport(initialMonth)),
    workstreams: (report?.progress.workstreams ?? []).map(([label, value]) => ({ label, value })),
    reporting: (report?.progress.reporting ?? []).map(([label, value]) => ({ label, value })),
    milestones: (report?.next.milestones ?? []).map(title => ({ title })),
  }, recoveryId, onDirty)
  const { form, workstreams, reporting, milestones } = bundle
  const setForm = change => setBundle(previous => ({ ...previous, form: typeof change === 'function' ? change(previous.form) : change }))
  const setWorkstreams = workstreams => setBundle(previous => ({ ...previous, workstreams }))
  const setReporting = reporting => setBundle(previous => ({ ...previous, reporting }))
  const setMilestones = milestones => setBundle(previous => ({ ...previous, milestones }))
  const dueMonth = nextMonth(form.month)
  const dueMonthEnd = dueMonth ? new Date(Date.UTC(Number(dueMonth.slice(0, 4)), Number(dueMonth.slice(5)), 0)).toISOString().slice(0, 10) : undefined
  const previousId = previousMonthId(form.month)
  const previousReport = project?.months.find(item => item.id === previousId)?.report
  const update = (key, value) => setForm(previous => ({ ...previous, [key]: value }))
  const progress = (key, value) => setForm(previous => ({ ...previous, progress: { ...previous.progress, [key]: value } }))
  const upcoming = (key, value) => setForm(previous => ({ ...previous, next: { ...previous.next, [key]: value } }))
  const carry = form.carryForward ?? []
  const importPlan = () => update('carryForward', [...carry, ...carryForwardItems(previousReport, previousId).filter(item => !carry.some(existing => existing.sourceMonth === item.sourceMonth && existing.sourceIndex === item.sourceIndex))])
  const counts = [ ['planned', 'Planned tasks'], ['completed', 'Completed tasks'], ['carryOver', 'Carried-over tasks'], ['total', 'Total project tasks'], ['projectCompleted', 'Project tasks completed'], ['hours', 'Hours this month'] ]

  function save(event) {
    event.preventDefault()
    const month = form.month
    const date = new Date(`${month}-01T00:00:00Z`)
    const content = {
      ...form,
      label: monthLabel(month),
      name: date.toLocaleString('en', { month: 'long', timeZone: 'UTC' }),
      title: form.title.trim() || `${monthLabel(month)} review`,
      coverLine: form.coverLine.trim() || 'Monthly progress',
      progress: {
        ...form.progress,
        runningHours: form.progress.runningHours === '' || form.progress.runningHours == null ? null : Number(form.progress.runningHours),
        ...Object.fromEntries(counts.map(([key]) => [key, Number(form.progress[key])])),
        workstreams: workstreams.map(({ label, value }) => [label.trim(), value === '' || value == null ? null : Number(value)]),
        reporting: reporting.map(({ label, value }) => [label.trim(), Number(value)]),
      },
      next: {
        ...form.next,
        month: monthLabel(nextMonth(month)),
        items: form.next.items.map((item) => ({ ...item, day: item.date.slice(-2) })),
        milestones: milestones.map(({ title }) => title.trim()),
      },
    }
    onSubmit(content, month)
  }

  return <form className="editor-form report-editor" onSubmit={save} onInvalidCapture={showInvalidSection}>
    <nav className="editor-section-nav" aria-label="Report form sections">{sections.map((label, index) => <button type="button" key={label} aria-current={currentSection === index ? 'location' : undefined} aria-controls={`${formId}-${index}`} onClick={() => { setCurrentSection(index); if (scroller.current) scroller.current.scrollTop = 0 }}>{label}</button>)}</nav>
    <div className="editor-scroll" ref={scroller}>{recovery}
    <fieldset disabled={busy} className="editor-form-fields">
    <div className="form-page" id={`${formId}-0`} data-form-section="0" hidden={currentSection !== 0}><div className="editor-grid">
      <Field label="Report month" type="month" required min="2000-01" max="2100-12" readOnly={Boolean(report || monthId)} value={form.month} onChange={(event) => update('month', event.target.value)} />
      <Field label="Report title" maxLength={200} value={form.title} onChange={(event) => update('title', event.target.value)} />
    </div>
    <Field label="Progress headline" hint="A short summary of this month’s delivery." maxLength={300} value={form.coverLine} onChange={(event) => update('coverLine', event.target.value)} />
    <Field label="Source" maxLength={1000} value={form.source ?? ''} onChange={(event) => update('source', event.target.value)} />
    </div><div className="form-page" id={`${formId}-1`} data-form-section="1" hidden={currentSection !== 1}><section><h3>Progress</h3><div className="editor-grid editor-metrics">
      {counts.map(([key, label]) => <Field key={key} label={label} type="number" min="0" step={key === 'hours' ? '0.01' : '1'} max={key === 'projectCompleted' ? form.progress.total : undefined} hint={key === 'carryOver' ? 'Unfinished work moving beyond this month.' : key === 'total' ? 'All tracked tasks across the project.' : undefined} required value={form.progress[key]} onChange={(event) => progress(key, event.target.value)} />)}
    </div></section>
    <Field label="Total running hours" type="number" min="0" step="0.01" value={form.progress.runningHours ?? ''} onChange={event => progress('runningHours', event.target.value)} />
    <Field label="Notes on reported hours" multiline maxLength={4000} value={form.progress.hoursNote ?? ''} onChange={event => progress('hoursNote', event.target.value)} />
    <Rows title="Workstreams" value={workstreams} onChange={setWorkstreams} addLabel="Add workstream" fields={[{ key: 'label', label: 'Workstream', required: true, maxLength: 120 }, { key: 'value', label: 'Tasks', type: 'number', min: 0, step: 1 }]} />
    <Rows title="Reporting compliance" value={reporting} onChange={setReporting} addLabel="Add measure" fields={[{ key: 'label', label: 'Measure', required: true, maxLength: 120 }, { key: 'value', label: 'Percentage', type: 'number', min: 0, max: 100, step: '0.01', required: true, defaultValue: 0 }]} />
    <section className="carry-editor"><div className="editor-section-heading"><h3>Last month’s commitments</h3>{previousReport?.next.items.length > 0 && <Button type="button" variant="outline" className="action" onClick={importPlan}>Bring in previous plan</Button>}</div>
      <p className="field-hint">Review the plan published in {previousId || 'the previous month'}. Outcomes stay separate from next month’s new actions.</p>
      {!previousReport && <p>No published report is available for the previous calendar month.</p>}
      {carry.map((item, index) => <div className="carry-entry" key={`${item.sourceMonth}:${item.sourceIndex}`}><strong>{item.title}</strong><p>{item.owner} · originally due {item.date}</p><label className="editor-field"><span>Outcome for {item.title}</span><select value={item.status} onChange={event => update('carryForward', carry.map((row, i) => i === index ? { ...row, status: event.target.value } : row))}>{['completed', 'carried-over', 'changed', 'dropped'].map(status => <option key={status} value={status}>{status.replace('-', ' ')}</option>)}</select></label><Field label={`Context for ${item.title}`} multiline value={item.context} onChange={event => update('carryForward', carry.map((row, i) => i === index ? { ...row, context: event.target.value } : row))} />
      {['carried-over', 'changed'].includes(item.status) && <Button type="button" variant="outline" className="action" disabled={!dueMonth || form.next.items.some(action => action.title === item.title)} onClick={() => upcoming('items', [...form.next.items, { title: item.title, owner: item.owner, date: `${dueMonth}-01`, day: '01', detail: item.context || '' }])}>Add to next month’s plan</Button>}
      <button type="button" className="text-link" onClick={() => update('carryForward', carry.filter((_, i) => i !== index))}>Remove commitment</button></div>)}
    </section>
    </div><div className="form-page" id={`${formId}-2`} data-form-section="2" hidden={currentSection !== 2}><Rows title="Accomplishments" value={form.wins} onChange={(rows) => update('wins', rows)} addLabel="Add accomplishment" fields={[{ key: 'title', label: 'Title', required: true, maxLength: 300 }, { key: 'value', label: 'Result', required: true, maxLength: 120 }, { key: 'detail', label: 'Details', multiline: true, maxLength: 4000 }]} />
    </div><div className="form-page" id={`${formId}-3`} data-form-section="3" hidden={currentSection !== 3}><Rows title="Blockers" value={form.blockers} onChange={(rows) => update('blockers', rows)} addLabel="Add blocker" fields={[{ key: 'title', label: 'Title', required: true, maxLength: 300 }, { key: 'impact', label: 'Impact', multiline: true, required: true, maxLength: 4000 }, { key: 'response', label: 'Response', multiline: true, maxLength: 4000 }]} />
    </div><div className="form-page" id={`${formId}-4`} data-form-section="4" hidden={currentSection !== 4}><Rows title="Next-month actions" value={form.next.items} onChange={(rows) => upcoming('items', rows)} addLabel="Add action" fields={[{ key: 'title', label: 'Action', required: true, maxLength: 300 }, { key: 'date', label: 'Due date', type: 'date', required: true, min: dueMonth ? `${dueMonth}-01` : undefined, max: dueMonthEnd }, { key: 'owner', label: 'Owner', required: true, maxLength: 200 }, { key: 'detail', label: 'Target or scope', multiline: true, maxLength: 4000 }]} />
    <Rows title="Next-month milestones" value={milestones} onChange={setMilestones} addLabel="Add milestone" fields={[{ key: 'title', label: 'Milestone', required: true, maxLength: 1000 }]} />
    <Field label="Support needed next month" multiline maxLength={4000} value={form.next.support ?? ''} onChange={(event) => upcoming('support', event.target.value)} />
    </div>
    </fieldset></div><EditorFooter busy={busy} close={close} label="Save draft" />
  </form>
}

export function RecordEditor({ kind, project, month, onSaved, triggerLabel, compact = false }) {
  const { workspace, mutate, refresh } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const recoveryId = recoveryKey(kind, project?.id, month?.id)
  const clearRecovery = () => { try { localStorage.removeItem(recoveryId) } catch {} }
  const [version, setVersion] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [snapshot, setSnapshot] = useState(null)
  const [formKey, setFormKey] = useState(0)
  const errorBox = useRef(null)
  useEffect(() => {
    if (error) {
      errorBox.current?.scrollIntoView({ block: 'center', behavior: 'instant' })
      errorBox.current?.focus({ preventScroll: true })
    }
  }, [error])
  usePauseRefresh(open)
  if (!workspace?.canEdit) return null
  const isProject = kind === 'project'
  const editingProject = snapshot?.project ?? project
  const editingMonth = snapshot?.month ?? month
  const existing = isProject ? editingProject : editingMonth?.draft ?? editingMonth?.report
  const label = triggerLabel ?? `${existing ? 'Edit' : 'Create'} ${isProject ? 'project' : 'report'}`
  const Icon = existing ? EditIcon : AddIcon

  function changeOpen(value) {
    if (busy) return
    if (!value && dirty) { setConfirmClose(true); return }
    setConfirmClose(false)
    if (value) { setVersion(workspace.version); setSnapshot({ project, month }); setError(''); setConflict(false); setFormKey((key) => key + 1) }
    setOpen(value)
  }

  async function save(data, monthId) {
    setBusy(true)
    setError('')
    try {
      const result = await mutate({ action: `${existing ? 'update' : 'create'}${isProject ? 'Project' : 'Report'}`, projectId: project?.id, monthId, data }, version)
      clearRecovery()
      setDirty(false)
      setOpen(false)
      onSaved?.(result, data, monthId)
    } catch (failure) {
      setError(failure.message)
      setConflict(failure.status === 409)
    } finally { setBusy(false) }
  }

  async function reloadVersion() {
    const latest = await refresh(true)
    if (latest) {
      const latestProject = latest.projects.find((entry) => entry.id === project?.id)
      setVersion(latest.version)
      setSnapshot({ project: latestProject ?? project, month: latestProject?.months.find((entry) => entry.id === month?.id) ?? month })
      clearRecovery()
      setDirty(false)
      setFormKey((key) => key + 1)
      setError('Loaded the latest saved version. Review the fields before saving.')
      setConflict(false)
    }
  }

  return <Dialog.Root open={open} onOpenChange={changeOpen}>
    <Dialog.Trigger asChild><Button variant={compact || existing ? 'outline' : 'default'} data-record-kind={kind} data-record-intent={existing ? 'edit' : 'create'} className={compact ? 'action record-icon-action' : existing ? 'action' : 'action action-primary'} aria-label={compact ? label : undefined} title={compact ? label : undefined}><Icon label="" />{!compact && label}</Button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="editor-overlay" /><Dialog.Content className={`editor-dialog ${isProject ? '' : 'wide'}`} onEscapeKeyDown={(event) => { if (busy) event.preventDefault() }} onPointerDownOutside={(event) => event.preventDefault()}>
      <ModalHeader title={label} icon={Icon} closeLabel="Close editor" busy={busy} description={isProject ? 'Projects organize monthly reviews. Fields marked * are required.' : 'Work through the sections, then save your review. Fields marked * are required.'} />
      {confirmClose && <div className="recovery-notice" role="alert"><p>You have unsaved changes. A recovery copy is kept on this device when browser storage is available.</p><Button type="button" className="action" onClick={() => setConfirmClose(false)}>Keep editing</Button><Button type="button" variant="outline" className="action" onClick={() => { setOpen(false); setConfirmClose(false) }}>Close and keep recovery</Button><button type="button" className="text-link" onClick={() => { clearRecovery(); setDirty(false); setOpen(false); setConfirmClose(false) }}>Discard changes</button></div>}
      {error && <div ref={errorBox} tabIndex={-1} className="editor-error" role="alert">{error}{conflict && <button type="button" className="text-link" onClick={reloadVersion}>Load latest and discard my changes</button>}</div>}
      {isProject ? <ProjectFields key={formKey} recoveryId={recoveryId} onDirty={setDirty} project={editingProject} onSubmit={save} busy={busy} close={() => changeOpen(false)} /> : <ReportFields key={formKey} recoveryId={recoveryId} onDirty={setDirty} project={editingProject} report={editingMonth?.draft ?? editingMonth?.report} monthId={editingMonth?.id} onSubmit={save} busy={busy} close={() => changeOpen(false)} />}
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>
}

export function DeleteRecord({ project, month, onDeleted }) {
  const { workspace, mutate } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [version, setVersion] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  usePauseRefresh(open)
  if (!workspace?.canEdit) return null
  const label = month ? `${month.label} report` : project.name
  async function remove() {
    setBusy(true)
    try {
      await mutate({ action: month ? 'deleteReport' : 'deleteProject', projectId: project.id, monthId: month?.id }, version)
      setOpen(false)
      onDeleted?.()
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  return <Dialog.Root open={open} onOpenChange={(value) => { if (!busy) { setOpen(value); setVersion(workspace.version); setError('') } }}>
    <Dialog.Trigger asChild><Button variant="outline" className="action record-icon-action" data-record-delete={month ? 'report' : 'project'} aria-label={`Delete ${month ? month.label + ' report' : 'project'}`} title={`Delete ${month ? 'report' : 'project'}`}><DeleteIcon label="" /></Button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="editor-overlay" /><Dialog.Content className="editor-dialog dialog-destructive" onPointerDownOutside={(event) => event.preventDefault()} onEscapeKeyDown={(event) => { if (busy) event.preventDefault() }}>
      <ModalHeader title={`Delete ${label}?`} icon={DeleteIcon} busy={busy} description={month ? 'This removes the report and all of its contents. This cannot be undone.' : `This removes the project and its ${project.months.length} reporting months. This cannot be undone.`} />
      {error && <p className="editor-error" role="alert">{error}</p>}
      <div className="editor-footer"><Button variant="outline" className="action" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button><Button className="action delete-confirm" loading={busy} onClick={remove}>{busy ? 'Deleting…' : 'Delete'}</Button></div>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>
}

export function EditorAccess() {
  const { workspace, login, logout } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  usePauseRefresh(open)
  if (!workspace?.storageReady) return <span className="storage-note">Shared storage needs configuration.</span>
  if (workspace.canEdit) return workspace.authRequired ? <div className="editor-session">{error && <span role="alert">{error}</span>}<Button variant="outline" className="action" onClick={async () => { try { await logout() } catch (failure) { setError(failure.message) } }}>Sign out</Button></div> : <span className="local-editor-label">Local editor</span>
  if (!workspace.authRequired) return <span className="storage-note">Editor access needs configuration.</span>
  return <Dialog.Root open={open} onOpenChange={(value) => { if (!busy) { setOpen(value); setError(''); setPassword('') } }}>
    <Dialog.Trigger asChild><Button variant="outline" className="action">Editor sign-in</Button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="editor-overlay" /><Dialog.Content className="editor-dialog" onEscapeKeyDown={event => { if (busy) event.preventDefault() }} onPointerDownOutside={event => event.preventDefault()}>
      <ModalHeader title="Editor sign-in" icon={PersonIcon} busy={busy} description="Enter the shared editor password to manage projects and reports." />
      <form className="editor-form" onSubmit={async (event) => { event.preventDefault(); setBusy(true); setError(''); try { await login(password); setOpen(false); setPassword('') } catch (failure) { setError(failure.message) } finally { setBusy(false) } }}>
        <div className="editor-scroll"><fieldset className="editor-form-fields" disabled={busy}><Field label="Editor password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        {error && <p className="editor-error" role="alert">{error}</p>}
        </fieldset></div><EditorFooter busy={busy} close={() => setOpen(false)} label="Sign in" />
      </form>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>
}
