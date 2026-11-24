import { lazy, Suspense, useState } from 'react'
import { Dialog, Switch } from 'radix-ui'
import SettingsGlyph from '@atlaskit/icon/core/settings'
import RefreshGlyph from '@atlaskit/icon/core/refresh'
import { Button } from '@/components/ui/button'
import { ModalHeader } from '@/components/ui/modal-header'
import { useAnimationPreference } from '@/lib/motion'
import { useWorkspace } from '@/lib/workspace'

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
  return <Dialog.Root open={open} onOpenChange={value => {
    if (authBusy) return
    setOpen(value)
    if (value) { onOpen(); setRefreshed(false) }
  }}>
    <Dialog.Trigger asChild><button type="button" className="icon-button workspace-settings-trigger" aria-label="Settings" title="Settings"><SettingsIcon label="" /></button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="editor-overlay" /><Dialog.Content className="editor-dialog workspace-settings" onEscapeKeyDown={event => { if (authBusy) event.preventDefault() }} onPointerDownOutside={event => { if (authBusy) event.preventDefault() }}>
      <ModalHeader title="Settings" description="Workspace access and device preferences." icon={SettingsIcon} closeLabel="Close settings" busy={authBusy} />
      <div className="settings-content">
        <section className="settings-access" aria-labelledby="settings-access"><h3 id="settings-access">Account</h3><Suspense fallback={<p className="settings-account-note" role="status">Loading editor access…</p>}><EditorAccess onBusyChange={setAuthBusy} /></Suspense></section>
        <section aria-labelledby="settings-display"><h3 id="settings-display">Preferences</h3>
          <div className="settings-preference"><div><label htmlFor="settings-reduce-motion">Reduce animations</label><p id="settings-motion-note">Keep transitions minimal. System preferences are always respected.</p></div><Switch.Root id="settings-reduce-motion" className="settings-switch" aria-label="Reduce animations" aria-describedby="settings-motion-note" checked={reduced} onCheckedChange={setReduced}><Switch.Thumb className="settings-switch-thumb" /></Switch.Root></div>
        </section>
        <section aria-labelledby="settings-workspace"><div className="settings-section-heading"><h3 id="settings-workspace">Workspace</h3><span className="settings-storage-status" data-ready={workspace?.storageReady || undefined}><i aria-hidden="true" />{!workspace ? 'Loading' : workspace.storageReady ? workspace.authRequired ? 'Shared' : 'Local' : 'Not configured'}</span></div>
          <dl className="settings-details"><div><dt>Access</dt><dd>{workspace ? workspace.isAdmin ? 'Administrator' : workspace.canEdit ? 'Editor' : 'Read only' : 'Loading…'}</dd></div>{workspace?.updatedAt && <div><dt>Last saved</dt><dd><time dateTime={workspace.updatedAt}>{builtDate.format(new Date(workspace.updatedAt))} PHT</time></dd></div>}</dl>
          <div className="settings-refresh"><div><strong>Workspace data</strong><span role="status">{error || (refreshed ? 'Data is up to date.' : 'Syncs automatically while you work.')}</span></div><Button variant="outline" className="action" loading={refreshing} disabled={authBusy} onClick={async () => { setRefreshed(false); const result = await refresh(true); setRefreshed(Boolean(result)) }}>{!refreshing && <RefreshIcon label="" size="small" />}{refreshing ? 'Refreshing…' : 'Refresh data'}</Button></div>
        </section>
      </div>
      <footer className="settings-about" aria-label="About Project Lens"><div><strong>Project Lens</strong><span>Version <span className="settings-build-version">{__LENS_BUILD__.version}</span></span></div><div><span>Build time · PHT</span><time dateTime={__LENS_BUILD__.builtAt}>{builtDate.format(new Date(__LENS_BUILD__.builtAt))}</time></div></footer>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>
}
