import { useEffect, useState } from 'react'
import { Dialog } from 'radix-ui'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ModalHeader } from '@/components/ui/modal-header'
import { useWorkspace } from '@/lib/workspace'
import { overviewPath } from '@/lib/routes.mjs'
import { GoogleSignIn } from './GoogleEditorAccess'
import { NameFields, ProfileOnboarding } from './ProfileOnboarding'
import '@/styles/auth-interface.css'

export function WorkspaceLink({ to = overviewPath, children, onClick, ...props }) {
  const { signedIn, requestSignIn } = useWorkspace()
  return <Link to={to} {...props} onClick={event => {
    onClick?.(event)
    if (!signedIn) { event.preventDefault(); requestSignIn(to) }
  }}>{children}</Link>
}

export function AuthExperience() {
  const { signInPath, closeSignIn, signedIn, session, requestSignIn } = useWorkspace()
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => {
    if (location.state?.signInPath && !signedIn) {
      requestSignIn(location.state.signInPath)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.state, location.pathname, signedIn, requestSignIn, navigate])
  useEffect(() => {
    if (signedIn && signInPath) { navigate(signInPath); closeSignIn() }
  }, [signedIn, signInPath, navigate, closeSignIn])
  return <>
    <SignInDialog open={!!signInPath && !signedIn} onClose={closeSignIn} />
    {signedIn && session.needsName && <ProfileOnboarding />}
  </>
}

function SignInDialog({ open, onClose }) {
  const { loginCode } = useWorkspace()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [needsName, setNeedsName] = useState(false)
  useEffect(() => { if (!open) { setError(''); setNeedsName(false) } }, [open])
  async function submit(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setBusy(true); setError('')
    try { await loginCode(data.get('code').trim(), data.get('firstName')?.trim(), data.get('lastName')?.trim()) }
    catch (failure) {
      if (failure.code === 'GUEST_NAME_REQUIRED') setNeedsName(true)
      else setError(failure.message)
    } finally { setBusy(false) }
  }
  return <Dialog.Root open={open} onOpenChange={value => { if (!value && !busy) onClose() }}>
    <Dialog.Portal><Dialog.Overlay className="editor-overlay auth-overlay" /><Dialog.Content className="editor-dialog auth-dialog" onEscapeKeyDown={event => { if (busy) event.preventDefault() }} onPointerDownOutside={event => { if (busy) event.preventDefault() }}>
      <ModalHeader title="Sign in to Lens" description="Use your Google account or a remote access code to open the workspace." busy={busy} />
      <div className="auth-dialog-body"><div className="auth-google"><GoogleSignIn onBusyChange={setBusy} /></div>
        <div className="auth-divider"><span>or use a remote access code</span></div>
        <form className="auth-form" onSubmit={submit}>
          <label className="editor-field"><span>Remote login code</span><input name="code" type="password" required maxLength={7} pattern="[A-Za-z0-9]{7}" autoComplete="off" disabled={busy} placeholder="Enter your access code" /></label>
          {needsName && <><p className="auth-note" role="status">Before you join, tell your teammates who you are.</p><NameFields disabled={busy} /></>}
          {error && <p className="editor-error" role="alert">{error}</p>}
          <Button type="submit" className="action action-primary" loading={busy}>Continue to workspace</Button>
        </form>
        <p className="auth-note">Need a code? Ask your workspace administrator.</p>
      </div>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>
}
