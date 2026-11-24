import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useWorkspace } from '@/lib/workspace'
import { ActivityEvents, securityRequest } from './EditHistory'

export function SecuritySettings({ onBusyChange }) {
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
    <h3 id="settings-security">Security</h3>
    {loading ? <p className="settings-account-note" role="status">Loading security settings…</p> : <>
      {data && <>
        <h4>Remote login code</h4>
        <p className="settings-account-note">Your personal seven-character code lets you sign in on another device. Keep it private.</p>
        {data.remoteCode ? <div className="security-code-row"><output className="security-code" aria-label={revealed ? 'Remote login code' : 'Remote login code hidden'}>{revealed ? data.remoteCode : '•••••••'}</output><Button variant="outline" className="action" disabled={busy} onClick={() => setRevealed(value => !value)}>{revealed ? 'Hide code' : 'Reveal code'}</Button><Button variant="outline" className="action" disabled={busy} onClick={() => copy(data.remoteCode)}>Copy code</Button></div> : <p className="settings-account-note">Generate your personal code to sign in on another device.</p>}
        {confirming ? <div className="security-confirm"><p>Replace your remote login code? The previous code will stop working immediately.</p><div className="security-actions"><Button className="action action-primary" loading={busy} onClick={() => act('regenerateRemoteCode')}>Replace code</Button><Button variant="outline" className="action" disabled={busy} onClick={() => setConfirming(false)}>Cancel</Button></div></div> : <Button variant="outline" className="action" disabled={busy} onClick={() => setConfirming(true)}>{data.remoteCode ? 'Regenerate code' : 'Generate code'}</Button>}
        {workspace.isAdmin && <div className="security-subsection"><h4>Guest access</h4><p className="settings-account-note">A guest code can be redeemed once and expires after seven days. Guests can view the workspace; editing, security audit and edit history stay private.</p>
          <div className="security-actions"><Button variant="outline" className="action" disabled={busy || Boolean(guestCode)} onClick={() => act('createGuestCode')}>Create guest code</Button></div>
          {guestCode && <div className="security-guest-code"><p className="settings-account-note">This code is shown only now. Copy it before you close Settings.</p><div className="security-code-row"><output className="security-code" aria-label="New guest code">{guestCode}</output><Button variant="outline" className="action" onClick={() => copy(guestCode)}>Copy guest code</Button><Button variant="outline" className="action" onClick={() => setGuestCode('')}>Done</Button></div></div>}
          {data.guestCodes?.length > 0 && <ul className="security-guest-list" aria-label="Guest code status">{data.guestCodes.map(code => <li key={code.id}>{code.consumedAt ? 'Redeemed' : Date.parse(code.expiresAt) < Date.now() ? 'Expired' : 'Available'} · {code.consumedAt ? 'Redeemed' : 'Expires'} {new Date(code.consumedAt || code.expiresAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</li>)}</ul>}
        </div>}
        <div className="security-subsection"><div className="settings-section-heading"><h4>Security audit</h4><Button variant="outline" className="action" disabled={busy} onClick={() => setAttempt(value => value + 1)}>Refresh audit</Button></div><p className="settings-account-note">Sign-ins, code changes and access activity.</p><div className="security-audit-scroll"><ActivityEvents events={data.auditEvents || []} empty="No security activity recorded yet." /></div></div>
      </>}
    </>}
    {error && <div><p className="editor-error" role="alert">{error}</p>{!data && <Button variant="outline" className="action" onClick={() => setAttempt(value => value + 1)}>Retry security settings</Button>}</div>}
    <p className="security-status" role="status">{status}</p>
  </section>
}
