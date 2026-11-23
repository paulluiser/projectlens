import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Dialog, DropdownMenu } from 'radix-ui'
import AddGlyph from '@atlaskit/icon/core/add'
import EditGlyph from '@atlaskit/icon/core/edit'
import DeleteGlyph from '@atlaskit/icon/core/delete'
import { ArrowLeftIcon, ArrowRightIcon, CalendarIcon, CheckIcon, ChecklistIcon, ChevronDownIcon, PersonIcon, PlanIcon, SearchIcon } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { ModalHeader } from '@/components/ui/modal-header'
import { useWorkspace, WorkspaceNotice } from '@/lib/workspace'
import { projectsPath } from '@/lib/routes.mjs'
import { defaultWeek, formatDay, formatRange, formatWeekday, bracketDays, suggestedBracket, summarize, taskFlags, taskStatuses, taskStatusOrder, todayIso, weekPhase, weekTitle } from '@/lib/weekly.mjs'
import { projectInitials } from './ProjectMark'
import { BoardIllustration, SearchIllustration, WeekIllustration } from './Illustrations'

const AddIcon = AddGlyph.default ?? AddGlyph
const EditIcon = EditGlyph.default ?? EditGlyph
const DeleteIcon = DeleteGlyph.default ?? DeleteGlyph
const conflictMessage = 'This project changed while you were editing. Close this dialog and reopen it to use the latest version.'

function useNarrow() {
  const query = '(max-width: 760px)'
  const [narrow, setNarrow] = useState(() => typeof matchMedia === 'function' && matchMedia(query).matches)
  useEffect(() => {
    const list = matchMedia(query)
    const update = () => setNarrow(list.matches)
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
  }, [])
  return narrow
}

export function Weekly() {
  return <WorkspaceNotice><WeeklyPage /></WorkspaceNotice>
}

// Shared dialog shell for weeks and tasks: create, edit and delete with version checks.
function useRecordDialog(initial) {
  const { workspace, setEditing } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(null)
  const [form, setForm] = useState({})
  useEffect(() => {
    if (!open) return
    setEditing(true)
    return () => setEditing(false)
  }, [open, setEditing])
  function toggle(value) {
    if (busy) return
    if (value) { setVersion(workspace.version); setForm(initial()); setError('') }
    setOpen(value)
  }
  return { open, busy, setBusy, error, setError, version, form, setForm, toggle }
}

function WeekDialog({ project, week, intent = 'create', onSaved, trigger }) {
  const { workspace, mutate } = useWorkspace()
  const today = todayIso()
  const dialog = useRecordDialog(() => week ? { start: week.start, end: week.end, label: week.label ?? '' } : suggestedBracket(project.weeks ?? [], today))
  const deleting = intent === 'delete'
  const { form, setForm } = dialog
  const span = form.start && form.end && form.end >= form.start ? bracketDays(form) : null
  async function save(event) {
    event.preventDefault()
    if (!deleting && form.end < form.start) { dialog.setError('The week must end on or after its start date.'); return }
    dialog.setBusy(true); dialog.setError('')
    try {
      const result = await mutate({ action: deleting ? 'deleteWeek' : week ? 'updateWeek' : 'createWeek', projectId: project.id, weekId: week?.id, ...(deleting ? {} : { data: form }) }, dialog.version)
      dialog.toggle(false)
      const weeks = result.projects.find(item => item.id === project.id)?.weeks ?? []
      onSaved?.(deleting ? null : week ? week.id : weeks.find(item => item.start === form.start && item.end === form.end)?.id)
    } catch (failure) { dialog.setError(failure.status === 409 ? conflictMessage : failure.message) }
    finally { dialog.setBusy(false) }
  }
  const update = event => setForm(previous => ({ ...previous, [event.target.name]: event.target.value }))
  if (!workspace.canEdit) return null
  const count = week?.tasks?.length ?? 0
  return <Dialog.Root open={dialog.open} onOpenChange={dialog.toggle}>
    <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="editor-overlay" />
      <Dialog.Content className="editor-dialog weekly-dialog" onPointerDownOutside={event => event.preventDefault()} onEscapeKeyDown={event => { if (dialog.busy) event.preventDefault() }}>
        <ModalHeader icon={CalendarIcon} busy={dialog.busy} title={deleting ? 'Delete week?' : week ? 'Edit week' : 'New week'}
          description={deleting ? 'This removes the week and every task in it.' : 'Set the dates this week covers. It can be any span up to 31 days.'} />
        <form className="editor-form" onSubmit={save}>
          <div className="editor-scroll">
            {dialog.error && <p className="editor-error" role="alert">{dialog.error}</p>}
            {deleting ? <p>Delete <strong>{weekTitle(week)}</strong>{count ? ` and its ${count} ${count === 1 ? 'task' : 'tasks'}` : ''}? This can’t be undone.</p> : <fieldset className="editor-form-fields" disabled={dialog.busy}>
              <div className="editor-grid">
                <label className="editor-field"><span>Starts</span><input name="start" type="date" required min="1900-01-01" max="9999-12-31" value={form.start ?? ''} onChange={update} /></label>
                <label className="editor-field"><span>Ends</span><input name="end" type="date" required min={form.start || '1900-01-01'} max="9999-12-31" value={form.end ?? ''} onChange={update} /></label>
              </div>
              <p className="field-hint" aria-live="polite">{span ? `${span} ${span === 1 ? 'day' : 'days'}${span > 31 ? ' — shorten this to 31 days or fewer' : ''}` : 'Choose an end date on or after the start.'}</p>
              <label className="editor-field"><span>Label <span className="field-optional">(optional)</span></span><input name="label" maxLength={80} autoComplete="off" placeholder="Sprint 14…" value={form.label ?? ''} onChange={update} /></label>
            </fieldset>}
          </div>
          <div className="editor-footer">
            <Button type="button" variant="outline" className="action" disabled={dialog.busy} onClick={() => dialog.toggle(false)}>Cancel</Button>
            <Button className={deleting ? 'action delete-confirm' : 'action action-primary'} loading={dialog.busy}>{deleting ? 'Delete week' : week ? 'Save week' : 'Create week'}</Button>
          </div>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}

function TaskDialog({ project, week, task, intent = 'create', status = 'todo', trigger }) {
  const { workspace, mutate } = useWorkspace()
  const dialog = useRecordDialog(() => task ? { ...task } : { title: '', owner: '', dueDate: week.end, status, notes: '' })
  const deleting = intent === 'delete'
  const { form, setForm } = dialog
  const owners = [...new Set((project.weeks ?? []).flatMap(item => item.tasks ?? []).map(item => item.owner))].sort()
  async function save(event) {
    event.preventDefault()
    dialog.setBusy(true); dialog.setError('')
    try {
      await mutate({ action: deleting ? 'deleteTask' : task ? 'updateTask' : 'createTask', projectId: project.id, weekId: week.id, taskId: task?.id, ...(deleting ? {} : { data: form }) }, dialog.version)
      dialog.toggle(false)
    } catch (failure) { dialog.setError(failure.status === 409 ? conflictMessage : failure.message) }
    finally { dialog.setBusy(false) }
  }
  const update = event => setForm(previous => ({ ...previous, [event.target.name]: event.target.value }))
  if (!workspace.canEdit) return null
  const outside = form.dueDate && (form.dueDate < week.start || form.dueDate > week.end)
  return <Dialog.Root open={dialog.open} onOpenChange={dialog.toggle}>
    <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="editor-overlay" />
      <Dialog.Content className="editor-dialog weekly-dialog" onPointerDownOutside={event => event.preventDefault()} onEscapeKeyDown={event => { if (dialog.busy) event.preventDefault() }}>
        <ModalHeader icon={ChecklistIcon} busy={dialog.busy} title={deleting ? 'Delete task?' : task ? 'Edit task' : 'New task'}
          description={deleting ? 'Remove this task from the week.' : `Delegate work for ${weekTitle(week)}.`} />
        <form className="editor-form" onSubmit={save}>
          <div className="editor-scroll">
            {dialog.error && <p className="editor-error" role="alert">{dialog.error}</p>}
            {deleting ? <p>Delete <strong>{task.title}</strong>? This can’t be undone.</p> : <fieldset className="editor-form-fields" disabled={dialog.busy}>
              <label className="editor-field"><span>Task</span><input name="title" required maxLength={160} autoComplete="off" placeholder="Regression test the AP module…" value={form.title ?? ''} onChange={update} /></label>
              <div className="editor-grid">
                <label className="editor-field"><span>Owner</span><input name="owner" required maxLength={120} autoComplete="off" list={`owners-${project.id}`} placeholder="Name or team…" value={form.owner ?? ''} onChange={update} />
                  <datalist id={`owners-${project.id}`}>{owners.map(owner => <option key={owner} value={owner} />)}</datalist></label>
                <label className="editor-field"><span>Target date</span><input name="dueDate" type="date" required min="1900-01-01" max="9999-12-31" value={form.dueDate ?? ''} onChange={update} /></label>
              </div>
              {outside && <p className="field-hint field-warning" role="status">This date falls outside {formatRange(week.start, week.end)}. You can keep it, or move the task to another week.</p>}
              <label className="editor-field"><span>Status</span><select name="status" value={form.status ?? 'todo'} onChange={update}>
                {taskStatusOrder.map(value => <option key={value} value={value}>{taskStatuses[value]}</option>)}
              </select></label>
              <label className="editor-field"><span>Notes <span className="field-optional">(optional)</span></span><textarea name="notes" maxLength={2000} value={form.notes ?? ''} onChange={update} /></label>
            </fieldset>}
          </div>
          <div className="editor-footer">
            <Button type="button" variant="outline" className="action" disabled={dialog.busy} onClick={() => dialog.toggle(false)}>Cancel</Button>
            <Button className={deleting ? 'action delete-confirm' : 'action action-primary'} loading={dialog.busy}>{deleting ? 'Delete task' : task ? 'Save task' : 'Add task'}</Button>
          </div>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}

// Status menu: the keyboard and tap alternative to dragging a card between columns.
function TaskStatus({ project, week, task }) {
  const { workspace, mutate, refresh, setEditing } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { if (!open) return; setEditing(true); return () => setEditing(false) }, [open, setEditing])
  async function choose(status) {
    if (status === task.status) { setOpen(false); return }
    setBusy(true); setError('')
    try { await mutate({ action: 'updateTask', projectId: project.id, weekId: week.id, taskId: task.id, data: { ...task, status } }, workspace.version); setOpen(false) }
    catch (failure) { setError(failure.status === 409 ? 'This task changed. Reopen the menu to use the latest version.' : failure.message); if (failure.status === 409) await refresh(true) }
    finally { setBusy(false) }
  }
  const label = <><i aria-hidden="true" />{taskStatuses[task.status]}</>
  if (!workspace.canEdit) return <span className="task-status" data-status={task.status}>{label}</span>
  return <DropdownMenu.Root open={open} onOpenChange={value => !busy && setOpen(value)} modal={false}>
    <DropdownMenu.Trigger asChild>
      <button type="button" className="task-status task-status-trigger" data-status={task.status} aria-label={`Status for ${task.title}: ${taskStatuses[task.status]}. Change status`} aria-busy={busy} disabled={busy}>
        {busy ? <><span className="busy-indicator" aria-hidden="true" />Saving…</> : <>{label}<ChevronDownIcon label="" size="small" /></>}
      </button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content className="milestone-status-menu" align="start" sideOffset={6} collisionPadding={12}>
        <DropdownMenu.Label className="milestone-status-menu-label">Move to</DropdownMenu.Label>
        <DropdownMenu.RadioGroup value={task.status}>
          {taskStatusOrder.map(value => <DropdownMenu.RadioItem key={value} value={value} className="milestone-status-option task-status-option" data-status={value} disabled={busy} onSelect={event => { event.preventDefault(); choose(value) }}>
            <i aria-hidden="true" />{taskStatuses[value]}<DropdownMenu.ItemIndicator className="milestone-status-selected"><CheckIcon label="" size="small" /></DropdownMenu.ItemIndicator>
          </DropdownMenu.RadioItem>)}
        </DropdownMenu.RadioGroup>
        {error && <p className="milestone-status-feedback milestone-status-error" role="alert">{error}</p>}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
}

function TaskActions({ project, week, task }) {
  return <div className="row-actions">
    <TaskDialog project={project} week={week} task={task} intent="edit" trigger={<Button variant="outline" className="action milestone-icon-action" aria-label={`Edit ${task.title}`}><EditIcon label="" /></Button>} />
    <TaskDialog project={project} week={week} task={task} intent="delete" trigger={<Button variant="outline" className="action milestone-icon-action" aria-label={`Delete ${task.title}`}><DeleteIcon label="" /></Button>} />
  </div>
}

function DueDate({ task, week, today }) {
  const { overdue, outside } = taskFlags(task, week, today)
  return <span className="task-due" data-overdue={overdue || undefined}>
    <time dateTime={task.dueDate}>{formatWeekday(task.dueDate)} {formatDay(task.dueDate)}</time>
    {overdue && <span className="task-flag">Overdue</span>}
    {!overdue && outside && <span className="task-flag task-flag-quiet">Outside week</span>}
  </span>
}

function Owner({ name }) {
  return <span className="task-owner"><span className="owner-avatar" aria-hidden="true">{projectInitials(name)}</span>{name}</span>
}

function TaskList({ project, week, tasks, today }) {
  return <div className="task-table-wrap">
    <table className="report-table task-table" aria-label={`Tasks for ${weekTitle(week)}`}>
      <thead><tr><th scope="col">Task</th><th scope="col">Owner</th><th scope="col">Target</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>{tasks.map(task => <tr key={task.id} data-status={task.status}>
        <td data-label="Task"><span className="task-title">{task.title}</span>{task.notes && <span className="task-notes">{task.notes}</span>}</td>
        <td data-label="Owner"><Owner name={task.owner} /></td>
        <td data-label="Target"><DueDate task={task} week={week} today={today} /></td>
        <td data-label="Status"><TaskStatus project={project} week={week} task={task} /></td>
        <td data-label="Manage"><TaskActions project={project} week={week} task={task} /></td>
      </tr>)}</tbody>
    </table>
  </div>
}

function TaskBoard({ project, week, tasks, today }) {
  const { workspace, mutate } = useWorkspace()
  const [dragging, setDragging] = useState(null)
  const [over, setOver] = useState(null)
  const [error, setError] = useState('')
  async function drop(status) {
    const task = tasks.find(item => item.id === dragging)
    setOver(null); setDragging(null)
    if (!task || task.status === status) return
    try { setError(''); await mutate({ action: 'updateTask', projectId: project.id, weekId: week.id, taskId: task.id, data: { ...task, status } }, workspace.version) }
    catch (failure) { setError(failure.status === 409 ? 'The board changed while you were dragging. It now shows the latest version.' : failure.message) }
  }
  return <>
    {error && <p className="editor-error board-error" role="alert">{error}</p>}
    <div className="task-board">
      {taskStatusOrder.map(status => {
        const column = tasks.filter(task => task.status === status)
        return <section key={status} className="task-column" data-status={status} data-over={over === status || undefined} aria-labelledby={`column-${status}`}
          onDragOver={event => { if (dragging) { event.preventDefault(); setOver(status) } }} onDragLeave={() => setOver(previous => previous === status ? null : previous)} onDrop={event => { event.preventDefault(); drop(status) }}>
          <header className="task-column-heading"><h3 id={`column-${status}`}><i aria-hidden="true" />{taskStatuses[status]}</h3><span>{column.length}</span></header>
          <ul>
            {column.map(task => <li key={task.id} className="task-card" draggable={workspace.canEdit} data-dragging={dragging === task.id || undefined}
              onDragStart={event => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', task.id); setDragging(task.id) }} onDragEnd={() => { setDragging(null); setOver(null) }}>
              <p className="task-title">{task.title}</p>
              {task.notes && <p className="task-notes">{task.notes}</p>}
              <div className="task-card-meta"><Owner name={task.owner} /><DueDate task={task} week={week} today={today} /></div>
              <div className="task-card-actions"><TaskStatus project={project} week={week} task={task} /><TaskActions project={project} week={week} task={task} /></div>
            </li>)}
          </ul>
          {column.length === 0 && <p className="task-column-empty">{workspace.canEdit ? 'Drop a task here' : 'No tasks'}</p>}
          {workspace.canEdit && <TaskDialog project={project} week={week} status={status} trigger={<button type="button" className="task-column-add"><AddIcon label="" size="small" />Add task</button>} />}
        </section>
      })}
    </div>
  </>
}

// Week summary: one headline figure, the status split and workload by owner (stacked done / open).
function WeekSummary({ week, tasks, today }) {
  const summary = summarize(tasks)
  const phase = weekPhase(week, today)
  const max = Math.max(1, ...summary.owners.map(owner => owner.total))
  const overdue = tasks.filter(task => taskFlags(task, week, today).overdue).length
  const dueToday = tasks.filter(task => task.status !== 'done' && task.dueDate === today).length
  const outside = tasks.filter(task => taskFlags(task, week, today).outside).length
  return <section className="week-summary" aria-label="This week at a glance">
    <div className="week-summary-progress">
      <p className="week-phase" data-tone={phase.tone}>{phase.text}</p>
      <p className="week-figure"><strong>{summary.done}</strong><span>/ {summary.total} tasks done</span></p>
      <div className="status-bar" role="img" aria-label={taskStatusOrder.map(status => `${summary.counts[status]} ${taskStatuses[status].toLowerCase()}`).join(', ')}>
        {summary.total ? ['done', 'in-progress', 'blocked', 'todo'].map(status => summary.counts[status] > 0 && <span key={status} data-status={status} style={{ flexGrow: summary.counts[status] }} data-tip={`${taskStatuses[status]}: ${summary.counts[status]}`} />) : <span data-status="empty" />}
      </div>
      <ul className="status-legend">{['done', 'in-progress', 'blocked', 'todo'].map(status => <li key={status} data-status={status}><i aria-hidden="true" />{taskStatuses[status]} <strong>{summary.counts[status]}</strong></li>)}</ul>
      <dl className="week-facts">
        <div data-alert={overdue > 0 || undefined}><dt>Overdue</dt><dd>{overdue}</dd></div>
        <div><dt>Due today</dt><dd>{dueToday}</dd></div>
        <div><dt>Outside the week</dt><dd>{outside}</dd></div>
      </dl>
    </div>
    <div className="week-summary-owners">
      <h3>Workload by owner</h3>
      {summary.owners.length ? <>
        <ul className="owner-bars">{summary.owners.slice(0, 6).map(owner => <li key={owner.owner}>
          <span className="owner-bar-name" title={owner.owner}>{owner.owner}</span>
          <span className="owner-bar-track" role="img" aria-label={`${owner.owner}: ${owner.done} of ${owner.total} done`}>
            <span className="owner-bar-done" style={{ width: `${owner.done / max * 100}%` }} data-tip={`${owner.done} done`} />
            <span className="owner-bar-open" style={{ width: `${(owner.total - owner.done) / max * 100}%` }} data-tip={`${owner.total - owner.done} open`} />
          </span>
          <span className="owner-bar-value">{owner.done}/{owner.total}</span>
        </li>)}</ul>
        <p className="owner-legend"><span><i data-series="done" aria-hidden="true" />Done</span><span><i data-series="open" aria-hidden="true" />Open</span>{summary.owners.length > 6 && <span>+{summary.owners.length - 6} more owners</span>}</p>
      </> : <p className="week-summary-empty">Owners appear here once tasks are delegated.</p>}
    </div>
  </section>
}

function WeeklyPage() {
  const { workspace } = useWorkspace()
  const { projectId } = useParams()
  const [params, setParams] = useSearchParams()
  const project = workspace.projects.find(item => item.id === projectId)
  const today = todayIso()
  const narrow = useNarrow()
  useEffect(() => { document.title = `Weekly · ${project?.name ?? 'Project unavailable'} · Lens` }, [project?.name])
  const weeks = useMemo(() => [...(project?.weeks ?? [])].sort((a, b) => a.start.localeCompare(b.start)), [project?.weeks])
  if (!project) return <main className="site-width missing-page" id="main-content" tabIndex={-1}><h1>Project unavailable</h1><p>This project may have been renamed or removed.</p><Link className="text-link" to={projectsPath}>Back to projects</Link></main>

  const setParam = (changes) => setParams(previous => {
    const next = new URLSearchParams(previous)
    for (const [key, value] of Object.entries(changes)) value ? next.set(key, value) : next.delete(key)
    return next
  }, { replace: true, preventScrollReset: true })
  const week = weeks.find(item => item.id === params.get('week')) ?? defaultWeek(weeks, today)
  // Board by default; phones open the list (four columns don't fit), and an explicit choice always wins
  const view = params.get('view') === 'list' || params.get('view') === 'board' ? params.get('view') : narrow ? 'list' : 'board'
  const search = params.get('search') ?? ''
  const owner = params.get('owner') ?? ''
  const index = week ? weeks.indexOf(week) : -1
  const tasks = (week?.tasks ?? [])
  const owners = [...new Set(tasks.map(task => task.owner))].sort()
  const visible = tasks
    .filter(task => (!owner || task.owner === owner) && `${task.title} ${task.owner} ${task.notes}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title))
  const newWeekButton = <Button className="action action-primary"><AddIcon label="" />New week</Button>

  return <main className="site-width weekly-page" id="main-content" tabIndex={-1}>
    <div className="page-heading directory-heading">
      <div><p className="page-eyebrow"><Link to={projectsPath}>Projects</Link><span aria-hidden="true"> / </span><span>Weekly</span></p><h1>{project.name}</h1><p>Weekly task delegation: who owns what, by when.</p></div>
      {weeks.length > 0 && <div className="record-toolbar"><WeekDialog project={project} onSaved={id => id && setParam({ week: id })} trigger={newWeekButton} /></div>}
    </div>

    {!week ? <section className="empty-panel">
      <WeekIllustration />
      <h2>Plan your first week</h2>
      <p>Set a date range, then delegate tasks with an owner, a target date and a status. Track them as a list or on a board.</p>
      {workspace.canEdit ? <WeekDialog project={project} onSaved={id => id && setParam({ week: id })} trigger={<Button className="action action-primary"><AddIcon label="" />New week</Button>} /> : <p className="field-hint">Editors can create weeks.</p>}
    </section> : <>
      <div className="weekly-strip">
      <div className="week-bar">
        <div className="week-nav" role="group" aria-label="Choose week">
          <button type="button" className="icon-button" aria-label="Previous week" disabled={index <= 0} onClick={() => setParam({ week: weeks[index - 1].id })}><ArrowLeftIcon label="" /></button>
          <label className="week-select"><span className="sr-only">Week</span><CalendarIcon label="" size="small" />
            <select value={week.id} onChange={event => setParam({ week: event.target.value })}>
              {weeks.map(item => <option key={item.id} value={item.id}>{item.label ? `${item.label} · ${formatRange(item.start, item.end)}` : formatRange(item.start, item.end)}</option>)}
            </select>
          </label>
          <button type="button" className="icon-button" aria-label="Next week" disabled={index >= weeks.length - 1} onClick={() => setParam({ week: weeks[index + 1].id })}><ArrowRightIcon label="" /></button>
        </div>
        <p className="week-bar-meta"><span>{bracketDays(week)} {bracketDays(week) === 1 ? 'day' : 'days'}</span><span aria-hidden="true">·</span><span>Week {index + 1} of {weeks.length}</span></p>
        <div className="record-toolbar">
          <WeekDialog project={project} week={week} intent="edit" trigger={<Button variant="outline" className="action"><EditIcon label="" />Edit</Button>} />
          <WeekDialog project={project} week={week} intent="delete" onSaved={() => setParam({ week: '' })} trigger={<Button variant="outline" className="action record-icon-action" aria-label={`Delete ${weekTitle(week)}`}><DeleteIcon label="" /></Button>} />
        </div>
      </div>
      </div>

      <WeekSummary week={week} tasks={tasks} today={today} />

      <div className="milestone-toolbar weekly-toolbar">
        <div className="milestone-filters">
          <label className="milestone-search"><SearchIcon label="" size="small" /><span className="sr-only">Search tasks</span><input type="search" name="task-search" autoComplete="off" spellCheck={false} placeholder="Search tasks…" value={search} onChange={event => setParam({ search: event.target.value })} /></label>
          <label className="milestone-status-filter"><span className="sr-only">Filter by owner</span><select name="task-owner" value={owner} onChange={event => setParam({ owner: event.target.value })}>
            <option value="">All owners · {tasks.length}</option>
            {owners.map(name => <option key={name} value={name}>{name} · {tasks.filter(task => task.owner === name).length}</option>)}
          </select></label>
        </div>
        <div className="weekly-toolbar-end">
          <div className="milestone-view-toggle" role="group" aria-label="Task view">
            <button type="button" aria-pressed={view === 'board'} onClick={() => setParam({ view: 'board' })}><PlanIcon label="" size="small" />Board</button>
            <button type="button" aria-pressed={view === 'list'} onClick={() => setParam({ view: 'list' })}><ChecklistIcon label="" size="small" />List</button>
          </div>
          <TaskDialog project={project} week={week} trigger={<Button className="action action-primary"><AddIcon label="" />Add task</Button>} />
        </div>
      </div>
      <p className="sr-only" role="status">{visible.length} of {tasks.length} tasks shown</p>

      {tasks.length === 0 ? <section className="empty-panel">
        <BoardIllustration />
        <h2>No tasks this week yet</h2>
        <p>Add the first task and assign an owner. Drag cards between columns, or use each card’s status menu, as the work moves.</p>
        <TaskDialog project={project} week={week} trigger={<Button className="action action-primary"><AddIcon label="" />Add task</Button>} />
      </section> : visible.length === 0 ? <section className="empty-panel">
        <SearchIllustration />
        <h2>No matching tasks</h2>
        <p>Nothing in {weekTitle(week)} matches these filters.</p>
        <Button variant="outline" className="action" onClick={() => setParam({ search: '', owner: '' })}>Clear filters</Button>
      </section> : view === 'list' ? <TaskList project={project} week={week} tasks={visible} today={today} /> : <TaskBoard project={project} week={week} tasks={visible} today={today} />}
    </>}
  </main>
}
