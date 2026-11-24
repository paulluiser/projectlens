import { useState } from 'react'
import { Dialog } from 'radix-ui'
import SettingsGlyph from '@atlaskit/icon/core/settings'
import { Button } from '@/components/ui/button'
import { ModalHeader } from '@/components/ui/modal-header'
import { useAnimationPreference } from '@/lib/motion'
import { useWorkspace } from '@/lib/workspace'

const SettingsIcon = SettingsGlyph.default ?? SettingsGlyph
const builtDate = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' })

export function WorkspaceSettings({ onOpen }) {
  const { workspace, refresh, refreshing, error } = useWorkspace()
  const [reduced, setReduced] = useAnimationPreference()
  const [refreshed, setRefreshed] = useState(false)
  return <Dialog.Root onOpenChange={open => { if (open) { onOpen(); setRefreshed(false) } }}>
    <Dialog.Trigger asChild><button type="button" className="icon-button workspace-settings-trigger" aria-label="Settings" title="Settings"><SettingsIcon label="" /></button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="editor-overlay" /><Dialog.Content className="editor-dialog workspace-settings">
      <ModalHeader title="Settings" description="Preferences for this device and workspace information." icon={SettingsIcon} closeLabel="Close settings" />
      <div className="settings-content">
        <section aria-labelledby="settings-display"><h3 id="settings-display">Display</h3>
          <label className="settings-preference"><span><strong>Reduce animations</strong><small>Skip motion effects. Your system’s reduced-motion preference is always respected.</small></span><input type="checkbox" aria-label="Reduce animations" checked={reduced} onChange={event => setReduced(event.target.checked)} /></label>
        </section>
        <section aria-labelledby="settings-workspace"><h3 id="settings-workspace">Workspace</h3>
          <dl className="settings-details"><div><dt>Access</dt><dd>{workspace ? workspace.canEdit ? 'Editor' : 'Read only' : 'Loading…'}</dd></div><div><dt>Storage</dt><dd>{workspace ? !workspace.storageReady ? 'Not configured' : workspace.authRequired ? 'Shared workspace' : 'Local workspace' : 'Loading…'}</dd></div>{workspace?.updatedAt && <div><dt>Last saved</dt><dd><time dateTime={workspace.updatedAt}>{builtDate.format(new Date(workspace.updatedAt))} PHT</time></dd></div>}</dl>
          <div className="settings-refresh"><Button variant="outline" className="action" loading={refreshing} onClick={async () => { setRefreshed(false); const result = await refresh(); setRefreshed(Boolean(result)) }}>{refreshing ? 'Refreshing…' : 'Refresh data'}</Button><span role="status">{error || (refreshed ? 'Data is up to date.' : 'Changes sync automatically while this tab is open.')}</span></div>
        </section>
        <section aria-labelledby="settings-about"><h3 id="settings-about">About Project Lens</h3><dl className="settings-details"><div><dt>Version</dt><dd className="settings-build-version">{__LENS_BUILD__.version}</dd></div><div><dt>Build time</dt><dd><time dateTime={__LENS_BUILD__.builtAt}>{builtDate.format(new Date(__LENS_BUILD__.builtAt))} PHT</time></dd></div></dl></section>
      </div>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>
}
