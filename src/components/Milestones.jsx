import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Dialog, DropdownMenu } from 'radix-ui'
import AddGlyph from '@atlaskit/icon/core/add'
import EditGlyph from '@atlaskit/icon/core/edit'
import DeleteGlyph from '@atlaskit/icon/core/delete'
import { CalendarIcon, FlagIcon, PersonIcon, SuccessIcon, SearchIcon, PlanIcon, ChecklistIcon, ChevronDownIcon, CheckIcon, ArrowLeftIcon, ArrowRightIcon } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { ModalHeader } from '@/components/ui/modal-header'
import { useWorkspace, WorkspaceNotice } from '@/lib/workspace'
import { projectsPath } from '@/lib/routes.mjs'
import { ProjectTabs } from './ProjectTabs'
import { milestoneStatuses as statuses, milestoneDate as dateFormat, shortMilestoneDate, milestoneTime, milestoneTimeline, milestoneCalendarDays, shiftMilestoneMonth } from '@/lib/milestones.mjs'
import { RoadmapIllustration, SearchIllustration } from './Illustrations'

const stampMonth = new Intl.DateTimeFormat(undefined, { month: 'short', timeZone: 'UTC' })

const AddIcon = AddGlyph.default ?? AddGlyph
const EditIcon = EditGlyph.default ?? EditGlyph
const DeleteIcon = DeleteGlyph.default ?? DeleteGlyph

function MilestoneDialog({ project, item, intent = 'create' }) {
  const { workspace, mutate, setEditing } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(null)
  const [form, setForm] = useState({})
  const deleting = intent === 'delete'
  const editing = intent === 'edit'
  const title = deleting ? 'Delete milestone?' : editing ? 'Edit milestone' : 'Create milestone'
  useEffect(() => {
    if (!open) return
    setEditing(true)
    return () => setEditing(false)
  }, [open, setEditing])

  function toggle(value) {
    if (busy) return
    if (value) {
      setVersion(workspace.version)
      setForm(item ? { ...item } : { title: '', owner: '', dueDate: '', status: 'planned', description: '', startDate: '', sample: false, forecast: false })
      setError('')
    }
    setOpen(value)
  }

  async function save(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await mutate({
        action: deleting ? 'deleteMilestone' : editing ? 'updateMilestone' : 'createMilestone',
        projectId: project.id,
        milestoneId: item?.id,
        ...(deleting ? {} : { data: form }),
      }, version)
      setOpen(false)
    } catch (failure) {
      setError(failure.status === 409 ? 'This project changed while you were editing. Close this dialog and reopen it to use the latest version.' : failure.message)
    } finally { setBusy(false) }
  }

  const update = event => setForm(previous => ({ ...previous, [event.target.name]: event.target.value }))
  if (!workspace.canEdit) return null
  return <Dialog.Root open={open} onOpenChange={toggle}>
    <Dialog.Trigger asChild>
      <Button variant={intent === 'create' ? 'default' : 'outline'} className={intent === 'create' ? 'action action-primary' : 'action milestone-icon-action'}
        aria-label={intent === 'create' ? undefined : `${editing ? 'Edit' : 'Delete'} ${item.title}`}>
        {deleting ? <DeleteIcon label="" /> : editing ? <EditIcon label="" /> : <AddIcon label="" />}
        {intent === 'create' && 'Create milestone'}
      </Button>
    </Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="editor-overlay" />
      <Dialog.Content className="editor-dialog milestone-dialog" onPointerDownOutside={event => event.preventDefault()}
        onEscapeKeyDown={event => { if (busy) event.preventDefault() }}>
        <ModalHeader title={title} icon={FlagIcon} busy={busy}
          description={deleting ? 'Delete this milestone from the project.' : 'Set the outcome, owner, and target date.'} />
        <form className="editor-form" onSubmit={save}>
          <div className="editor-scroll">
            {error && <p className="editor-error" role="alert">{error}</p>}
            {deleting ? <p>Delete <strong>{item.title}</strong>?</p> : <fieldset className="editor-form-fields" disabled={busy}>
              <label className="editor-field"><span>Milestone title</span><input name="title" autoComplete="off" required maxLength={160} value={form.title ?? ''} onChange={update} /></label>
              <div className="editor-grid">
                <label className="editor-field"><span>Owner</span><input name="owner" autoComplete="off" required maxLength={120} value={form.owner ?? ''} onChange={update} /></label>
                <label className="editor-field"><span>Target date <span className="field-optional">(optional)</span></span><input aria-label="Target date" name="dueDate" type="date" min="1900-01-01" max="9999-12-31" value={form.dueDate ?? ''} onChange={update} /></label>
              </div>
              <div className="editor-grid">
                <label className="editor-field"><span>Start date <span className="field-optional">(optional)</span></span><input aria-label="Start date" name="startDate" type="date" min="1900-01-01" max={form.dueDate || '9999-12-31'} value={form.startDate ?? ''} onChange={update} /></label>
                <label className="milestone-sample-field"><input type="checkbox" checked={form.forecast ?? false} onChange={event => setForm(previous => ({ ...previous, forecast: event.target.checked }))} /> Forecast dates</label>
              </div>
              <label className="editor-field"><span>Status</span><select aria-label="Status" name="status" value={form.status ?? 'planned'} onChange={update}>
                {Object.entries(statuses).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select></label>
              <label className="editor-field"><span>Notes <span className="field-optional">(optional)</span></span><textarea name="description" maxLength={2000} value={form.description ?? ''} onChange={update} /></label>
              {item?.sample && <label className="milestone-sample-field"><input type="checkbox" checked={form.sample} onChange={event => setForm(previous => ({ ...previous, sample: event.target.checked }))} /> Sample milestone</label>}
            </fieldset>}
          </div>
          <div className="editor-footer">
            <Button type="button" className="action" variant="outline" onClick={() => toggle(false)} disabled={busy}>Cancel</Button>
            <Button className={deleting ? 'action delete-confirm' : 'action action-primary'} loading={busy}>{deleting ? 'Delete milestone' : 'Save milestone'}</Button>
          </div>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}

export function Milestones() {
  return <WorkspaceNotice><MilestonePage /></WorkspaceNotice>
}

function MilestoneStatus({ project, item }) {
  const { workspace, mutate, refresh, setEditing } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [snapshot, setSnapshot] = useState(null)
  useEffect(() => {
    if (!open) return
    setEditing(true)
    return () => setEditing(false)
  }, [open, setEditing])

  function toggle(value) {
    if (busy) return
    if (value) {
      setSnapshot({ version: workspace.version, item: { ...item } })
      setError('')
    }
    setOpen(value)
  }

  async function choose(status) {
    if (busy) return
    if (status === item.status) { setOpen(false); return }
    setBusy(true)
    setError('')
    try {
      await mutate({ action: 'updateMilestone', projectId: project.id, milestoneId: item.id, data: { ...snapshot.item, status } }, snapshot.version)
      setOpen(false)
    } catch (failure) {
      setError(failure.status === 409 ? 'This milestone changed. Close and reopen this menu to use the latest version.' : failure.message)
      if (failure.status === 409) await refresh(true)
    } finally { setBusy(false) }
  }

  const label = <><i aria-hidden="true" />{statuses[item.status]}</>
  if (!workspace.canEdit) return <span className="milestone-status" data-status={item.status}>{label}</span>
  return <DropdownMenu.Root open={open} onOpenChange={toggle} modal={false}>
    <DropdownMenu.Trigger asChild>
      <button type="button" className="milestone-status milestone-status-trigger" data-status={item.status}
        aria-label={`Change status for ${item.title}: ${statuses[item.status]}`} aria-busy={busy} disabled={busy}>
        {busy ? <><span className="busy-indicator" aria-hidden="true" />Saving…</> : <>{label}<ChevronDownIcon label="" size="small" /></>}
      </button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content className="milestone-status-menu" align="end" sideOffset={6} collisionPadding={12}
        aria-label={`Status for ${item.title}`} onEscapeKeyDown={event => { if (busy) event.preventDefault() }}>
        <DropdownMenu.Label className="milestone-status-menu-label">Change status</DropdownMenu.Label>
        <DropdownMenu.RadioGroup value={item.status}>
          {Object.entries(statuses).map(([value, text]) => <DropdownMenu.RadioItem className="milestone-status-option" data-status={value} value={value} key={value} disabled={busy}
            onSelect={event => { event.preventDefault(); choose(value) }}>
            <i aria-hidden="true" />{text}<DropdownMenu.ItemIndicator className="milestone-status-selected"><CheckIcon label="" size="small" /></DropdownMenu.ItemIndicator>
          </DropdownMenu.RadioItem>)}
        </DropdownMenu.RadioGroup>
        {busy && <p className="milestone-status-feedback" role="status">Saving status…</p>}
        {error && <p className="milestone-status-feedback milestone-status-error" role="alert">{error}</p>}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
}

function MilestoneRow({ project, item, timeline, today }) {
  const [expanded, setExpanded] = useState(false)
  const dueTime = item.dueDate ? milestoneTime(item.dueDate) : null
  const dateLabel = dueTime === null ? 'Not scheduled' : dateFormat.format(dueTime)
  const overdue = Boolean(item.dueDate) && item.status !== 'completed' && item.dueDate < today
  const point = dueTime === null ? null : timeline.position(dueTime)
  return <li className="milestone-item" data-status={item.status}>
    <div className="milestone-record">
      <span className="milestone-node" aria-hidden="true">{item.status === 'completed' ? <SuccessIcon label="" /> : <FlagIcon label="" />}</span>
      <div className="milestone-content">
        <h3><button type="button" className="milestone-detail-toggle" aria-expanded={expanded} aria-controls={`milestone-detail-${item.id}`} onClick={() => setExpanded(value => !value)}>
          {item.title}<ChevronDownIcon label="" size="small" />
        </button></h3>
        <span className="sr-only">Target date: {dateLabel}.</span>
        <div className="milestone-meta"><span><PersonIcon label="" size="small" />{item.owner}</span>{item.sample && <span className="milestone-sample-label">Sample</span>}{item.forecast && <span className="milestone-forecast-label">Forecast</span>}</div>
      </div>
    </div>
    <div className="milestone-rail" aria-hidden="true">
      {timeline?.ticks.map((tick, index) => <span className="milestone-grid-line" key={index} style={{ left: `${index * 25}%` }} />)}
      {timeline?.today != null && <span className="milestone-today-line" style={{ left: `${timeline.today}%` }} />}
      {point !== null ? <>
        {item.startDate && item.startDate !== item.dueDate && <span className="milestone-duration" style={{ left: `${timeline.position(milestoneTime(item.startDate))}%`, width: `${point - timeline.position(milestoneTime(item.startDate))}%` }} />}
        <span className="milestone-checkpoint" data-side={point > 70 ? 'left' : 'right'} style={{ left: `${point}%` }}>
          <i className="milestone-diamond" /><span>{shortMilestoneDate.format(dueTime)}</span>
        </span>
      </> : <span className="milestone-unscheduled">Not scheduled</span>}
    </div>
    <div className="milestone-deadline"><time dateTime={item.dueDate || undefined}>{dateLabel}</time>{overdue && <span className="milestone-overdue">{item.forecast ? 'Forecast elapsed' : 'Past due'}</span>}</div>
    <MilestoneStatus project={project} item={item} />
    <div className="row-actions"><MilestoneDialog project={project} item={item} intent="edit" /><MilestoneDialog project={project} item={item} intent="delete" /></div>
    <div className="milestone-details" id={`milestone-detail-${item.id}`} hidden={!expanded}>
      <div><h3>Milestone notes</h3><p>{item.description || 'No notes yet.'}</p></div>
      <div><h3>{item.startDate ? 'Scheduled window' : 'Target date'}</h3>{item.startDate && <time dateTime={item.startDate}>{dateFormat.format(milestoneTime(item.startDate))} –</time>}<time dateTime={item.dueDate || undefined}>{dateLabel}</time>{overdue && <span className="milestone-overdue">{item.forecast ? 'Forecast elapsed' : 'Past due'}</span>}</div>
    </div>
  </li>
}

function MilestoneCalendar({ project, items, timeline, today }) {
  const [month, setMonth] = useState(today.slice(0,7))
  const [selected, setSelected] = useState(null)
  const monthName = new Intl.DateTimeFormat('en', {month:'long',year:'numeric',timeZone:'UTC'}).format(milestoneTime(`${month}-01`))
  const days = milestoneCalendarDays(month)
  const dueThisMonth = items.filter(item => item.dueDate.startsWith(month))
  const visible = selected ? dueThisMonth.filter(item => item.dueDate === selected) : dueThisMonth
  const undated = items.filter(item => !item.dueDate)
  function navigateMonth(value) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value) || value < '1900-01' || value > '9999-12') return
    setMonth(value)
    setSelected(null)
  }
  function agenda(records, label) {
    return <section className="milestone-board milestone-calendar-agenda" data-view="list" aria-label={label}>
      <div className="milestone-board-heading"><h2>{label}<span>{records.length}</span></h2>
        {selected && label !== 'Unscheduled milestones' && <button type="button" className="text-link" onClick={() => setSelected(null)}>Show all this month</button>}
      </div>
      {records.length ? <ol className="milestone-list">{records.map(item => <MilestoneRow key={item.id} project={project} item={item} timeline={timeline} today={today} />)}</ol>
        : <p className="milestone-calendar-empty">{selected ? 'No milestones are due on this date.' : 'No milestones are due this month.'}</p>}
    </section>
  }
  return <section className="milestone-calendar" aria-label="Milestone calendar">
    <div className="milestone-calendar-toolbar">
      <div><h2 aria-live="polite">{monthName}</h2><p>{dueThisMonth.length} {dueThisMonth.length === 1 ? 'milestone' : 'milestones'} due this month</p></div>
      <div className="milestone-calendar-controls">
        <button type="button" className="action" onClick={() => navigateMonth(today.slice(0,7))}>Today</button>
        <label><span className="sr-only">Calendar month</span><input type="month" min="1900-01" max="9999-12" value={month} onChange={event => navigateMonth(event.target.value)} /></label>
        <button type="button" className="icon-button" aria-label="Previous month" disabled={month === '1900-01'} onClick={() => navigateMonth(shiftMilestoneMonth(month,-1))}><ArrowLeftIcon label="" /></button>
        <button type="button" className="icon-button" aria-label="Next month" disabled={month === '9999-12'} onClick={() => navigateMonth(shiftMilestoneMonth(month,1))}><ArrowRightIcon label="" /></button>
      </div>
    </div>
    <table className="milestone-calendar-grid" aria-label={`${monthName} milestone deadlines`}>
      <thead><tr>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => <th key={day} scope="col">{day}</th>)}</tr></thead>
      <tbody>{Array.from({length:days.length/7},(_,week) => <tr key={week}>
        {days.slice(week*7,week*7+7).map((date,index) => {
          if (!date) return <td className="milestone-calendar-outside" key={`empty-${index}`} />
          const events = dueThisMonth.filter(item => item.dueDate === date)
          return <td key={date} data-today={date === today || undefined} data-selected={selected === date || undefined}>
            <button type="button" className="milestone-calendar-day" aria-pressed={selected === date} aria-controls="milestone-calendar-selected"
              aria-label={`${dateFormat.format(milestoneTime(date))}, ${events.length} ${events.length === 1 ? 'milestone' : 'milestones'}`}
              onClick={() => setSelected(selected === date ? null : date)}>
              <span className="milestone-calendar-day-heading"><time dateTime={date} aria-current={date === today ? 'date' : undefined}>{Number(date.slice(-2))}</time>{events.length > 0 && <span className="milestone-calendar-count">{events.length}</span>}</span>
              <span className="milestone-calendar-stamps" aria-hidden="true">{events.slice(0,2).map(item => <span key={item.id} data-status={item.status}><i />{item.title}</span>)}{events.length > 2 && <span>+{events.length-2} more</span>}</span>
              <span className="milestone-calendar-dots" aria-hidden="true">{events.slice(0,4).map(item => <i key={item.id} data-status={item.status} />)}</span>
            </button>
          </td>
        })}
      </tr>)}</tbody>
    </table>
    <p className="milestone-calendar-hint">Select a date to view and manage its milestones.</p>
    <div id="milestone-calendar-selected" aria-live="polite">{agenda(visible,selected ? `Due ${dateFormat.format(milestoneTime(selected))}` : 'Milestones this month')}</div>
    {undated.length > 0 && agenda(undated,'Unscheduled milestones')}
  </section>
}

function MilestonePage() {
  const { projectId } = useParams()
  const { workspace } = useWorkspace()
  const project = workspace.projects.find(item => item.id === projectId)
  // Filter, search and view live in the URL so they survive reloads and can be shared
  const [params, setParams] = useSearchParams()
  const status = params.get('status') in statuses ? params.get('status') : 'all'
  const search = params.get('search') ?? ''
  const view = ['calendar', 'list'].includes(params.get('view')) ? params.get('view') : 'roadmap'
  const setParam = (key, value, fallback) => setParams(previous => {
    const next = new URLSearchParams(previous)
    if (!value || value === fallback) next.delete(key)
    else next.set(key, value)
    return next
  }, { replace: true, preventScrollReset: true })
  const setStatus = value => setParam('status', value, 'all')
  const setSearch = value => setParam('search', value, '')
  const setView = value => setParam('view', value, 'roadmap')
  useEffect(() => { document.title = `Milestones · ${project?.name ?? 'Project unavailable'} · Lens` }, [project?.name])
  if (!project) return <main className="site-width missing-page" id="main-content" tabIndex={-1}><h1>Project unavailable</h1><p>This project may have been renamed or removed.</p><Link className="text-link" to={projectsPath}>Back to projects</Link></main>
  const items = [...(project.milestones ?? [])].sort((a, b) => (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31'))
  const counts = Object.fromEntries(Object.keys(statuses).map(key => [key, items.filter(item => item.status === key).length]))
  const completed = counts.completed
  const next = items.find(item => item.status !== 'completed' && item.dueDate)
  const today = new Date().toLocaleDateString('en-CA')
  const timeline = milestoneTimeline(items, milestoneTime(today))
  const dated = items.filter(item => item.dueDate)
  const undated = items.length - dated.length
  const rangeStart = timeline ? dateFormat.format(Math.min(...dated.map(item => milestoneTime(item.startDate || item.dueDate)))) : null
  const rangeEnd = dated.length ? dateFormat.format(milestoneTime(dated.at(-1).dueDate)) : null
  const filtered = items.filter(item => (status === 'all' || item.status === status) && `${item.title} ${item.owner}`.toLowerCase().includes(search.trim().toLowerCase()))
  return <main className="site-width milestone-page" id="main-content" tabIndex={-1}>
    <div className="page-heading directory-heading">
      <div><p className="page-eyebrow"><Link to={projectsPath}>Projects</Link></p><h1>{project.name}</h1><p>Milestones, owners and dates for this project.</p></div>
      <div className="record-toolbar"><MilestoneDialog project={project} /></div>
    </div>
    <ProjectTabs projectId={project.id} />
    <section className="milestone-overview" aria-label="Milestone progress">
      <div className="milestone-delivery">
        <div className="milestone-section-heading"><h2>Delivery roadmap</h2>{items.some(item => item.sample) && <span className="milestone-demo-badge">Sample data</span>}</div>
        <p className="milestone-delivery-count"><strong>{completed} of {items.length}</strong> milestones completed</p>
        <div className="milestone-distribution" role="img" aria-label={Object.entries(statuses).map(([key, label]) => `${counts[key]} ${label.toLowerCase()}`).join(', ')}>
          {items.length ? ['completed', 'in-progress', 'blocked', 'planned'].map(key => counts[key] > 0 && <span key={key} data-status={key} style={{ flex: counts[key] }} />) : <span data-status="planned" />}
        </div>
        <div className="milestone-distribution-key">{['completed', 'in-progress', 'blocked', 'planned'].map(key => <span key={key} data-status={key}><i />{counts[key]} {statuses[key].toLowerCase()}</span>)}</div>
      </div>
      <div className="milestone-next">
        {next ? <>
          <div className="milestone-date-stamp" aria-hidden="true"><span>{stampMonth.format(milestoneTime(next.dueDate))}</span><strong>{next.dueDate.slice(-2)}</strong></div>
          <div><h2>Earliest open checkpoint</h2><p className="milestone-next-title">{next.title}</p><span className="milestone-next-owner"><PersonIcon label="" size="small" />{next.owner}<span aria-hidden="true">·</span><time dateTime={next.dueDate}>{dateFormat.format(milestoneTime(next.dueDate))}</time></span></div>
          <span className="sr-only">Due {dateFormat.format(milestoneTime(next.dueDate))}.</span>
        </> : <><span className="milestone-finished-symbol"><SuccessIcon label="" /></span><div><h2>{items.length && completed === items.length ? 'All milestones completed' : items.length ? 'Awaiting target dates' : 'Ready for your first milestone'}</h2><p>{items.length && completed === items.length ? 'Every checkpoint is complete.' : items.length ? `${undated} milestones are not scheduled yet.` : 'Add an outcome and a target date.'}</p></div></>}
      </div>
    </section>
    <div className="milestone-toolbar">
      <div className="milestone-filters">
        <label className="milestone-search"><SearchIcon label="" size="small" /><span className="sr-only">Search milestones</span><input type="search" name="milestone-search" autoComplete="off" spellCheck={false} placeholder="Search milestones…" value={search} onChange={event => setSearch(event.target.value)} /></label>
        <label className="milestone-status-filter">
          <span className="sr-only">Filter by status</span>
          <select name="milestone-status" value={status} onChange={event => setStatus(event.target.value)}>
            <option value="all">All statuses · {items.length}</option>
            {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label} · {counts[value]}</option>)}
          </select>
        </label>
      </div>
      <div className="milestone-view-toggle" role="group" aria-label="Milestone view">
        <button type="button" aria-pressed={view === 'roadmap'} onClick={() => setView('roadmap')}><PlanIcon label="" size="small" />Roadmap</button>
        <button type="button" aria-pressed={view === 'calendar'} onClick={() => setView('calendar')}><CalendarIcon label="" size="small" />Calendar</button>
        <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}><ChecklistIcon label="" size="small" />List</button>
      </div>
    </div>
    <p className="sr-only" role="status">{filtered.length} milestones shown</p>
    {view === 'calendar' ? <MilestoneCalendar key={project.id} project={project} items={filtered} timeline={timeline} today={today} /> : filtered.length > 0 ? <section className="milestone-board" data-view={view} aria-label={view === 'roadmap' ? 'Milestone roadmap' : 'Milestone list'}>
      <div className="milestone-board-heading"><h2>{view === 'roadmap' ? 'Project timeline' : 'Project milestones'}<span>{filtered.length}</span></h2>
        <span className="milestone-range"><CalendarIcon label="" size="small" />{timeline ? `${rangeStart} – ${rangeEnd}` : 'No dated milestones'}</span>
      </div>
      <div className="milestone-column-headings" aria-hidden="true">
        <span>Milestone & owner</span>
        <div className="milestone-date-axis">{timeline?.ticks.map((tick, index) => <span key={index} style={{ left: `${index * 25}%` }}>{shortMilestoneDate.format(tick)}</span>)}
          {timeline?.today != null && <span className="milestone-today-label" style={{ left: `clamp(28px, ${timeline.today}%, calc(100% - 28px))` }}>Today</span>}
        </div>
        <span className="milestone-date-column">Due date</span><span>Status</span><span className="milestone-actions-heading">Actions</span>
      </div>
      <ol className="milestone-list" aria-label="Project milestones">
        {filtered.map(item => <MilestoneRow project={project} item={item} timeline={timeline} today={today} key={item.id} />)}
      </ol>
      <div className="milestone-board-footer"><span>{items.some(item => item.sample) ? 'Sample milestones · edit or replace with real outcomes' : `${filtered.length} of ${items.length} milestones${undated ? ` · ${undated} not scheduled` : ''}`}</span><span><i className="milestone-diamond" />Target date</span></div>
    </section> : <div className="milestone-empty">{items.length ? <SearchIllustration /> : <RoadmapIllustration />}<h2>{items.length ? 'No matching milestones' : 'No milestones yet'}</h2><p>{items.length ? 'Try another status or search.' : 'Create a milestone to track an outcome, owner, and deadline.'}</p>
      {items.length > 0 && <Button variant="outline" className="action" onClick={() => { setStatus('all'); setSearch('') }}>Clear filters</Button>}
    </div>}
  </main>
}
