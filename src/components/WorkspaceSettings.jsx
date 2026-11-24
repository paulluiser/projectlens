import { lazy, Suspense, useState } from 'react'
import { Dialog, Switch, Tabs } from 'radix-ui'
import SettingsGlyph from '@atlaskit/icon/core/settings'
import RefreshGlyph from '@atlaskit/icon/core/refresh'
import { PersonIcon, PeopleIcon, ClockIcon } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { ModalHeader } from '@/components/ui/modal-header'
import { useAnimationPreference } from '@/lib/motion'
import { useWorkspace } from '@/lib/workspace'
import { SecuritySettings } from './SecuritySettings'
import { EditorAccessManager } from './GoogleEditorAccess'
import '../styles/settings-panel.css'

const SettingsIcon = SettingsGlyph.default ?? SettingsGlyph
const RefreshIcon = RefreshGlyph.default ?? RefreshGlyph
const EditorAccess = lazy(() => import('./RecordEditor').then(({ EditorAccess }) => ({ default: EditorAccess })))
const builtDate = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' })

export function WorkspaceSettings({ onOpen }) {
  const { workspace, refresh, refreshing, error } = useWorkspace()
  const [reduced, setReduced] = useAnimationPreference()
  const [refreshed, setRefreshed] = useState(false)
  const [open, setOpen] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)
  const [tab, setTab] = useState('account')
  const tabs = [{ id: 'account', label: 'Account', icon: PersonIcon }, ...(workspace?.isAdmin ? [{ id: 'access', label: 'Access', icon: PeopleIcon }] : []), ...(workspace?.canEdit ? [{ id: 'activity', label: 'Activity', icon: ClockIcon }] : []), { id: 'preferences', label: 'Preferences', icon: SettingsIcon }]
  return <Dialog.Root open={open} onOpenChange={value => {
    if (authBusy) return
    setOpen(value)
    if (value) { onOpen(); setRefreshed(false); setTab('account') }
  }}>
    <Dialog.Trigger asChild><button type="button" className="icon-button workspace-settings-trigger" aria-label="Settings" title="Settings"><SettingsIcon label="" /></button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="editor-overlay" /><Dialog.Content className="editor-dialog workspace-settings" onEscapeKeyDown={event => { if (authBusy) event.preventDefault() }} onPointerDownOutside={event => { if (authBusy) event.preventDefault() }}>
      <ModalHeader title="Settings" icon={SettingsIcon} closeLabel="Close settings" busy={authBusy} />
      <Tabs.Root className="settings-layout" value={tab} onValueChange={value => { if (!authBusy) setTab(value) }}>
        <Tabs.List className="settings-navigation" aria-label="Settings sections">{tabs.map(({ id, label, icon: Icon }) => <Tabs.Trigger key={id} value={id} disabled={authBusy}><Icon label="" size="small" />{label}</Tabs.Trigger>)}</Tabs.List>
        <Tabs.Content className="settings-pane settings-content" value={tab}>
          {tab === 'account' && <section className="settings-access"><h3>Your account</h3><Suspense fallback={<p role="status">Loading account…</p>}><EditorAccess showManagement={false} onBusyChange={setAuthBusy} /></Suspense></section>}
          {tab === 'access' && workspace?.isAdmin && <EditorAccessManager onBusyChange={setAuthBusy} />}
          <SecuritySettings onBusyChange={setAuthBusy} section={tab} />
          {tab === 'preferences' && <>
            <section><h3>Display</h3><div className="settings-preference"><label htmlFor="settings-reduce-motion">Reduce animations</label><Switch.Root id="settings-reduce-motion" className="settings-switch" aria-label="Reduce animations" checked={reduced} onCheckedChange={setReduced}><Switch.Thumb className="settings-switch-thumb" /></Switch.Root></div></section>
            <section><div className="settings-section-heading"><h3>Workspace</h3><span className="settings-storage-status" data-ready={workspace?.storageReady || undefined}><i aria-hidden="true" />{workspace?.storageReady ? 'Connected' : 'Unavailable'}</span></div>
              <dl className="settings-details">{workspace?.updatedAt && <div><dt>Last saved</dt><dd><time dateTime={workspace.updatedAt}>{builtDate.format(new Date(workspace.updatedAt))} PHT</time></dd></div>}</dl>
              <div className="settings-refresh"><span role="status">{error || (refreshed ? 'Data is up to date.' : '')}</span><Button variant="outline" className="action" loading={refreshing} disabled={authBusy} onClick={async () => { setRefreshed(false); const result = await refresh(true); setRefreshed(Boolean(result)) }}>{!refreshing && <RefreshIcon label="" size="small" />}{refreshing ? 'Refreshing…' : 'Refresh data'}</Button></div>
            </section>
          </>}
        </Tabs.Content>
      </Tabs.Root>
      <footer className="settings-about"><strong>Project Lens</strong><span title={`Built ${builtDate.format(new Date(__LENS_BUILD__.builtAt))} PHT`}>Version <span className="settings-build-version">{__LENS_BUILD__.version}</span></span></footer>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>
}
