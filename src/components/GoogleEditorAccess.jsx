import { DropdownMenu } from 'radix-ui'
import MoreGlyph from '@atlaskit/icon/core/show-more-horizontal'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { PersonIcon } from '@/components/ui/icons'
import { useWorkspace } from '@/lib/workspace'

const MoreIcon = MoreGlyph.default ?? MoreGlyph

const idleBusyChange = () => {}
let sdkPromise
function googleSdk() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id)
  if (!sdkPromise) sdkPromise = new Promise((resolve,reject) => {
    const script=document.createElement('script')
    const fail=()=>{clearTimeout(timer);script.remove();sdkPromise=null;reject(new Error('Google sign-in could not load. Check your connection and try again.'))}
    const timer=setTimeout(fail,15000)
    script.src='https://accounts.google.com/gsi/client';script.async=true
    script.onload=()=>{clearTimeout(timer);if(window.google?.accounts?.id)resolve(window.google.accounts.id);else fail()}
    script.onerror=fail
    document.head.appendChild(script)
  })
  return sdkPromise
}

export function GoogleSignIn({ onBusyChange = idleBusyChange }) {
  const { beginGoogleLogin, loginGoogle } = useWorkspace()
  const holder=useRef(null)
  const [attempt,setAttempt]=useState(0)
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  useEffect(()=>{
    let disposed=false
    setError('');setLoading(true)
    Promise.all([googleSdk(),beginGoogleLogin()]).then(([google,challenge])=>{
      if(disposed)return
      if(!challenge.nonce || !challenge.googleClientId)throw Error('Google editor sign-in is not configured.')
      // Reopening sign-in replaces the callback and binds it to a fresh server nonce.
      google.initialize({client_id:challenge.googleClientId,nonce:challenge.nonce,auto_select:false,callback:async response=>{
        if(disposed)return
        setBusy(true);onBusyChange(true);setError('')
        try{await loginGoogle(response.credential)}catch(failure){if(!disposed)setError(failure.message)}finally{if(!disposed)setBusy(false);onBusyChange(false)}
      }})
      holder.current.replaceChildren()
      google.renderButton(holder.current,{type:'standard',theme:'outline',size:'large',text:'continue_with',shape:'rectangular',width:Math.min(320,holder.current.clientWidth||260)})
      setLoading(false)
    }).catch(failure=>{if(!disposed){setError(failure.message);setLoading(false)}})
    return()=>{disposed=true}
  },[attempt,beginGoogleLogin,loginGoogle,onBusyChange])
  return <div className="google-sign-in">
    {loading && <p className="settings-account-note" role="status">Loading Google sign-in…</p>}
    <div ref={holder} className="google-sign-in-button" inert={busy} />
    {busy && <p role="status" className="settings-account-note">Verifying your account…</p>}
    {error && <div className="settings-google-error"><p className="editor-error" role="alert">{error}</p><Button variant="outline" className="action" onClick={()=>setAttempt(value=>value+1)}>Retry Google sign-in</Button></div>}
  </div>
}

export function EditorAccessManager({ onBusyChange }) {
  const { workspace,mutate }=useWorkspace()
  const [email,setEmail]=useState('')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [removing,setRemoving]=useState(null)
  const form=useRef(null)
  const verificationInput = useRef(null)
  const [verification, setVerification] = useState('')
  useEffect(() => { if (removing) verificationInput.current?.focus() }, [removing])
  const {administrators = [],editors = []}=workspace?.editorAccess || {}
  async function save(emails,clearInput=false) {
    setBusy(true);onBusyChange(true);setError('')
    try {await mutate({action:'updateEditors',data:{emails}},workspace.version,{notice:'Editor access saved.'});if(clearInput){setEmail('');form.current?.reset()}setRemoving(null)}
    catch(failure){setError(failure.status===409?'The access list changed. Review the latest list and try again.':failure.message)}
    finally{setBusy(false);onBusyChange(false)}
  }
  if (!workspace?.canEdit || !workspace?.isAdmin || !workspace.editorAccess) return null
  return <section className="settings-editor-management" aria-labelledby="manage-editors-heading">
    <h4 id="manage-editors-heading">Manage editors</h4>
    <ul aria-label="Accounts with editor access">{[...administrators,...editors].map(address=><li key={address}>
      <span className="editor-access-email">{address}</span>
      {administrators.includes(address) ? <span className="editor-access-role">Administrator</span> : <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger asChild><button type="button" className="icon-button editor-access-options" aria-label={`Options for ${address}`} title="Account options" disabled={busy}><MoreIcon label="" /></button></DropdownMenu.Trigger>
        <DropdownMenu.Portal><DropdownMenu.Content className="editor-access-menu" align="end" sideOffset={6} collisionPadding={12} onCloseAutoFocus={event => { if (removing) event.preventDefault() }}>
          <DropdownMenu.Item onSelect={() => { setVerification(''); setRemoving(address); setError('') }}>Remove access</DropdownMenu.Item>
        </DropdownMenu.Content></DropdownMenu.Portal>
      </DropdownMenu.Root>}
    </li>)}</ul>
    {removing && <form className="editor-removal-verification" aria-label="Verify editor removal" onSubmit={event => {
      event.preventDefault()
      if (!busy && verification.trim().toLowerCase() === removing.toLowerCase()) save(editors.filter(item => item !== removing))
    }}>
      <strong>Remove access for {removing}?</strong>
      <label className="editor-field"><span>Type their email to confirm</span><input ref={verificationInput} aria-label="Confirm editor email" type="email" autoComplete="off" spellCheck={false} required disabled={busy} value={verification} onChange={event => setVerification(event.target.value)} /></label>
      <div className="security-actions"><Button type="submit" variant="destructive" className="action delete-confirm" loading={busy} disabled={verification.trim().toLowerCase() !== removing.toLowerCase()}>Confirm removal</Button><Button type="button" variant="outline" className="action" disabled={busy} onClick={() => { setRemoving(null); setVerification('') }}>Cancel</Button></div>
    </form>}
    <form ref={form} onSubmit={event=>{event.preventDefault();const value=email.trim().toLowerCase();if([...administrators,...editors].includes(value)){setError('This account already has access.');return}save([...editors,value],true)}}>
      <label className="editor-field"><span>Editor email</span><input type="email" required maxLength={254} autoComplete="off" placeholder="name@example.com" value={email} disabled={busy} onChange={event=>{setEmail(event.target.value);setError('')}} /></label>
      <Button type="submit" className="action action-primary" loading={busy} disabled={!email.trim()}>Add editor</Button>
    </form>
    {error && <p className="editor-error" role="alert">{error}</p>}
  </section>
}

export function GoogleEditorAccess({ onBusyChange, showManagement = true }) {
  const {workspace,logout}=useWorkspace()
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  return <div className="settings-account">
    <div className="settings-account-row"><span className="settings-account-icon" aria-hidden="true"><PersonIcon label="" /></span><div className="settings-account-copy"><strong>{workspace.isAdmin ? 'Administrator access' : workspace.canEdit ? 'Editor access' : workspace.signedIn ? 'Guest access' : 'Read-only access'}</strong><p>{[workspace.user?.firstName, workspace.user?.lastName].filter(Boolean).join(' ') || workspace.user?.email || workspace.editor?.email || (workspace.authReady?'Use an approved Google account to edit.':'Google editor sign-in needs configuration.')}</p></div>
      {(workspace.signedIn || workspace.canEdit) && <Button variant="outline" className="action" loading={busy} onClick={async()=>{setBusy(true);onBusyChange(true);setError('');try{await logout();window.google?.accounts?.id?.disableAutoSelect()}catch(failure){setError(failure.message)}finally{setBusy(false);onBusyChange(false)}}}>{busy?'Signing out…':'Sign out'}</Button>}
    </div>
    {!workspace.signedIn && !workspace.canEdit && workspace.authReady && <GoogleSignIn onBusyChange={onBusyChange} />}
    {showManagement && workspace.canEdit && workspace.isAdmin && workspace.editorAccess && <EditorAccessManager onBusyChange={onBusyChange} />}
    {error && <p className="editor-error" role="alert">{error}</p>}
  </div>
}
