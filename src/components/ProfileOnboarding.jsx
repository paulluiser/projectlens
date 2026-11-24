import { useState } from 'react'
import { Dialog } from 'radix-ui'
import { Button } from '@/components/ui/button'
import { useWorkspace } from '@/lib/workspace'
import '@/styles/auth-interface.css'

export function ProfileOnboarding() {
  const { session, completeProfile, logout } = useWorkspace()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function save(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setBusy(true); setError('')
    try { await completeProfile(data.get('firstName').trim(), data.get('lastName').trim()) }
    catch (failure) { setError(failure.message) }
    finally { setBusy(false) }
  }
  return <Dialog.Root open><Dialog.Portal><Dialog.Overlay className="editor-overlay auth-overlay" /><Dialog.Content className="editor-dialog auth-dialog" onEscapeKeyDown={event => event.preventDefault()} onPointerDownOutside={event => event.preventDefault()}>
    <header className="dialog-header"><div className="dialog-heading-copy"><Dialog.Title>What should we call you?</Dialog.Title><Dialog.Description className="editor-description">Add your first and last name so teammates can recognize you in the workspace.</Dialog.Description></div></header>
    <form className="auth-dialog-body auth-form" onSubmit={save}>
      <NameFields disabled={busy} user={session.user} />
      {error && <p className="editor-error" role="alert">{error}</p>}
      <Button type="submit" className="action action-primary" loading={busy}>Save and continue</Button>
      <button type="button" className="text-link auth-signout" disabled={busy} onClick={async () => { setBusy(true); try { await logout() } catch (failure) { setError(failure.message) } finally { setBusy(false) } }}>Sign out</button>
    </form>
  </Dialog.Content></Dialog.Portal></Dialog.Root>
}

export function NameFields({ disabled, user }) {
  return <div className="auth-name-fields">
    <label className="editor-field"><span>First name</span><input name="firstName" required maxLength={80} autoComplete="given-name" defaultValue={user?.firstName || ''} disabled={disabled} /></label>
    <label className="editor-field"><span>Last name</span><input name="lastName" required maxLength={80} autoComplete="family-name" defaultValue={user?.lastName || ''} disabled={disabled} /></label>
  </div>
}
