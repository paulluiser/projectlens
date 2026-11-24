import { useEffect, useState } from 'react'
import EyeGlyph from '@atlaskit/icon/core/eye-open'
import MaskGlyph from '@atlaskit/icon/core/eye-open-strikethrough'
import CopyGlyph from '@atlaskit/icon/core/copy'
import RefreshGlyph from '@atlaskit/icon/core/refresh'
import { Button } from '@/components/ui/button'
import { useWorkspace } from '@/lib/workspace'
import { ActivityEvents, securityRequest } from './EditHistory'

const EyeIcon = EyeGlyph.default ?? EyeGlyph
const MaskIcon = MaskGlyph.default ?? MaskGlyph
const CopyIcon = CopyGlyph.default ?? CopyGlyph
const RefreshIcon = RefreshGlyph.default ?? RefreshGlyph

export function SecuritySettings({ onBusyChange, section = 'all' }) {
  const { workspace } = useWorkspace()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [guestCode, setGuestCode] = useState('')
  const [status, setStatus] = useState('')
  const [attempt, setAttempt] = useState(0)
  const allowed = Boolean(workspace?.canEdit)
  useEffect(() => {
    if (!allowed) return
    const controller = new AbortController()
    setLoading(true); setError('')
    securityRequest('/api/security', { signal: controller.signal }).then(result => { if (!controller.signal.aborted) setData(result) }).catch(failure => { if (!controller.signal.aborted) setError(failure.message) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [allowed, attempt])
  async function act(action) {
    setBusy(true); onBusyChange(true); setError(''); setStatus('')
    try {
      const result = await securityRequest('/api/security', { method: 'POST', body: JSON.stringify({ action }) })
      setData(result)
      if (action === 'createGuestCode') { setGuestCode(result.code); setStatus('Guest code created. Copy it before closing Settings.') }
      else { setRevealed(false); setConfirming(false); setStatus('Your remote login code has changed. The previous code no longer works.') }
    } catch (failure) { setError(failure.message) }
    finally { setBusy(false); onBusyChange(false) }
  }
  async function copy(code) {
    try { await navigator.clipboard.writeText(code); setStatus('Code copied.') }
    catch { setStatus('Copy is unavailable. Reveal the code and select it to copy manually.') }
  }
  if (!allowed) return null
  return <section className="security-section" aria-labelledby="settings-security">
    <h3 id="settings-security" className="sr-only">Security</h3>
    {loading ? <p className="settings-account-note" role="status">Loading security settings…</p> : <>
      {data && <>
        {(section === 'all' || section === 'account') && <div className="settings-remote-group"><h4>Remote login code</h4>
        <p className="settings-account-note">Sign in on another device. Keep this code private.</p>
        <div className="remote-code-control">
          <input aria-label="Remote login code" type={revealed ? 'text' : 'password'} value={data.remoteCode || ''} readOnly autoComplete="off" spellCheck={false} />
          <button type="button" className="icon-button" aria-label={revealed ? 'Mask code' : 'Reveal code'} title={revealed ? 'Mask code' : 'Reveal code'} aria-pressed={revealed} disabled={busy || !data.remoteCode} onClick={() => setRevealed(value => !value)}>{revealed ? <MaskIcon label="" /> : <EyeIcon label="" />}</button>
          <button type="button" className="icon-button" aria-label="Copy code" title="Copy code" disabled={busy || !data.remoteCode} onClick={() => copy(data.remoteCode)}><CopyIcon label="" /></button>
          <button type="button" className="icon-button" aria-label={data.remoteCode ? 'Regenerate code' : 'Generate code'} title={data.remoteCode ? 'Regenerate code' : 'Generate code'} disabled={busy} onClick={() => setConfirming(true)}><RefreshIcon label="" /></button>
        </div>
        {confirming && <div className="security-confirm"><p>Replace your remote login code? The previous code will stop working immediately.</p><div className="security-actions"><Button className="action action-primary" loading={busy} onClick={() => act('regenerateRemoteCode')}>Replace code</Button><Button variant="outline" className="action" disabled={busy} onClick={() => setConfirming(false)}>Cancel</Button></div></div>}
        </div>}
        {workspace.isAdmin && (section === 'all' || section === 'access') && <div className="security-subsection"><h4>Guest access</h4><p className="settings-account-note">View only · Redeem within 3 days · Access lasts 7 days.</p>
          <div className="security-actions"><Button variant="outline" className="action" disabled={busy || Boolean(guestCode)} onClick={() => act('createGuestCode')}>Create guest code</Button></div>
          {guestCode && <div className="security-guest-code"><p className="settings-account-note">This code is shown only now. Copy it before you close Settings.</p><div className="security-code-row"><output className="security-code" aria-label="New guest code">{guestCode}</output><Button variant="outline" className="action" onClick={() => copy(guestCode)}>Copy guest code</Button><Button variant="outline" className="action" onClick={() => setGuestCode('')}>Done</Button></div></div>}
          {data.guestCodes?.length > 0 && <ul className="security-guest-list" aria-label="Guest code status">{data.guestCodes.map(code => <li key={code.id}>{code.consumedAt ? 'Redeemed' : Date.parse(code.expiresAt) < Date.now() ? 'Expired' : 'Available'} · {code.consumedAt ? 'Redeemed' : 'Expires'} {new Date(code.consumedAt || code.expiresAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</li>)}</ul>}
        </div>}
        {(section === 'all' || section === 'activity') && <div className="security-subsection"><div className="settings-section-heading"><h4>Audit trail</h4><Button variant="outline" className="action" disabled={busy} onClick={() => setAttempt(value => value + 1)}>Refresh audit</Button></div><div className="security-audit-scroll"><ActivityEvents events={data.auditEvents || []} empty="No security activity recorded yet." /></div></div>}
      </>}
    </>}
    {error && <div><p className="editor-error" role="alert">{error}</p>{!data && <Button variant="outline" className="action" onClick={() => setAttempt(value => value + 1)}>Retry security settings</Button>}</div>}
    {status && <p className="security-status" role="status">{status}</p>}
  </section>
}
