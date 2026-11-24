import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ProjectBrand } from './ProjectBrand'
import { landingPath } from '@/lib/routes.mjs'

export function PrivacyNotice() {
  useEffect(() => { document.title = 'Privacy notice · Project Lens' }, [])
  return <main id="main-content" className="privacy-notice" tabIndex={-1}>
    <Link className="privacy-brand" to={landingPath} aria-label="Back to Project Lens"><ProjectBrand size={24} /></Link>
    <h1>Privacy notice</h1><p className="privacy-updated">Updated 24 November 2026</p>
    <p>Project Lens is a shared project-review workspace. This notice explains how its sign-in and workspace features handle information.</p>
    <section><h2>Google sign-in and access</h2><p>Google provides identity information when you choose to sign in. Project Lens uses your verified email address and Google account identifier to authenticate you and check whether you are an administrator or an approved editor. It does not request access to your Gmail, Google Drive, or calendar contents.</p><p>Administrator emails are configured by the service owner. Approved editor emails are stored in the private workspace and can be managed by administrators. Other readers and ordinary editors cannot view the access list.</p></section>
    <section><h2>Workspace information and visibility</h2><p>Projects, published reports, milestones, and weekly task boards are available through the public workspace. Monthly report drafts are restricted to authorized editors. Treat information published in the workspace as shareable; avoid entering confidential or sensitive personal information into public content.</p><p>The shared workspace, including editor email addresses, is stored using Vercel Blob. Project content is retained until managed or deleted by authorized editors. Removing an editor email revokes that account’s editing access on its next server request; it does not remove project content the account previously entered.</p></section>
    <section><h2>Cookies and device storage</h2><p>Sign-in uses a short-lived verification cookie and a signed application-session cookie that expires after eight hours. Production session cookies are HttpOnly and Secure. Signing out clears the application’s session cookie; it does not sign you out of Google.</p><p>Your browser also stores interface preferences and recovery copies of unsaved report edits. Those recovery copies stay on that device and are cleared when saved or discarded through the interface, or when browser storage is cleared.</p></section>
    <section><h2>Service providers</h2><p>Google handles account authentication, and Vercel hosts the website and shared storage. Requests to these services may include network and device information used by those providers to operate and protect their services. Their own notices describe their processing: <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google Privacy Policy</a> and <a href="https://vercel.com/legal/privacy-notice" target="_blank" rel="noreferrer">Vercel Privacy Notice</a>.</p></section>
    <section><h2>Your choices and questions</h2><p>You can browse published workspace information without Google sign-in, sign out from Settings, and clear this site’s cookies and browser storage. To request a change to editor access or workspace information, contact the Project Lens administrator who provided access to the workspace. Changes to Google account permissions are managed through your Google account.</p></section>
    <Link className="text-link" to={landingPath}>Back to Project Lens</Link>
  </main>
}
