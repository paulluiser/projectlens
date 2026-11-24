# Google sign-in and editor access

## Roles

Administrators are bootstrapped from `LENS_ADMIN_EMAILS`, configured on the server. Only people who can manage the Vercel project's environment variables can change administrators. Ordinary editors cannot promote themselves. Administrators always retain access even if the editor list is emptied.

Administrators open **Settings → Account → Manage editors** to add or remove exact Google-account email addresses. This list is saved in the private workspace JSON, with the same version and conditional-write protection as project content. No Git commit or deployment is needed to change editors. Removal denies editing and draft access on the next server request; an already-open browser refreshes its displayed access periodically or when focused. Removing an editor also denies workspace access, including remote-code sign-in. Published content is available only to signed-in accounts and authorized guests.

The list is returned only to authenticated administrators. Editor access applies to all projects; this does not introduce per-project permissions. The current release does not add invitations or send email.

## One-time Google configuration

1. In [Google Cloud Console](https://console.cloud.google.com/), create/select a project for Project Lens.
2. Under **Google Auth Platform**, configure branding with the app name and your support/contact email. A personal Gmail account uses the **External** audience. Review Google's User Data Policy yourself before agreeing.
3. In **Clients**, create a **Web application** OAuth client. Configure these authorized JavaScript origins:
   - `https://projectlens-kappa.vercel.app`
   - `http://localhost:4173`
   - `http://127.0.0.1:4173`
   Use your actual local port if different. Add an exact custom-domain origin if one is introduced. Arbitrary Vercel preview deployments are not automatically authorized.
4. Copy the **Client ID**. This implementation uses Google's JavaScript callback flow and needs no OAuth client secret or redirect URI.
5. While Google's app is in Testing, add every intended user to Google's test-user list as well. For unrestricted Google sign-in availability, publish the OAuth app when its branding requirements are satisfied. The Project Lens server allowlist still controls who can edit. Adding someone in Project Lens does not modify Google's test-user list.

## Vercel configuration

In the Project Lens project's environment-variable settings, configure these for Production:

| Variable | Value |
| --- | --- |
| `LENS_GOOGLE_CLIENT_ID` | OAuth web client ID ending in `.apps.googleusercontent.com` |
| `LENS_ADMIN_EMAILS` | Your exact Google-account email; multiple administrators can be comma-separated |
| `LENS_SESSION_SECRET` | A randomly generated secret, at least 32 characters |
| `BLOB_READ_WRITE_TOKEN` | Keep the existing private Blob store connected |
| `LENS_EDITOR_EMAILS` | Optional initial editors, comma-separated; unnecessary when starting with the administrator only |

Generate a signing secret locally with `node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"` and store it only as a server environment variable. Never prefix these settings with `VITE_` or commit actual values. Copy equivalent values into ignored `.env.local` to test locally.

Redeploy once after setting these variables. Existing shared-password sessions will no longer authorize editing in Google mode; the shared password cannot bypass the allowlist. An incomplete Google configuration fails closed. Without Google configuration, sign-in fails closed. The shared password is no longer a production login method. Automated tests may explicitly enable `LENS_DEV_AUTH_BYPASS=1` on a non-production server; never configure that flag for a public development server.

Verify the cutover with your administrator account: Google sign-in, Settings access management, a rejected non-allowed account, editor removal, and sign-out. Rotating `LENS_SESSION_SECRET` invalidates application sessions and remote-code encryption; plan a Google sign-in and remote-code regeneration for all accounts after such a rotation. Environment changes to the administrator list require redeployment; routine editor changes in Settings do not.

## Implementation and security checks

Google's official Node library verifies token signatures, issuer, audience and expiry. Login also checks verified email and a signed, short-lived nonce tied to an HttpOnly cookie. The app session is signed, HttpOnly, SameSite=Strict and Secure in production, and expires after eight hours. Every workspace request re-evaluates access against the current stored editor list. Same-origin checks protect session changes and workspace writes. Google sign-in does not grant access to Drive, Gmail or other Google APIs.

References: [Google web setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid), [ID token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token), [nonce configuration](https://developers.google.com/identity/gsi/web/reference/js-reference#nonce).


## Remote and guest access

All accounts confirm first and last name before entering the workspace. Existing Google sessions are upgraded through the same prompt on their next refresh. Account owners find their masked **Remote login code** in **Settings → Security**; reveal or copy it only when needed. Regeneration immediately disables the previous code. Codes are seven alphanumeric characters, case-insensitive. The server stores an HMAC lookup and authenticated encrypted recovery value, never a plaintext code.

Administrators create a **Guest code** in the same section and copy it before closing. Guest codes expire three days after creation and can be redeemed once. The recipient selects remote login, supplies the code and their first/last name, then receives view-only access. Guest sessions expire seven days after redemption. The server rejects expired sessions, and the client clears the workspace when that deadline is reached. Permanent-account sessions last eight hours. Guests cannot inspect drafts, security settings, audit records, or edit history. Distribute codes privately; they are login credentials.

Code attempts are rate-limited per network address and globally. Rate-limit state is shared across server instances. Single-use redemption uses conditional Blob writes so simultaneous requests cannot redeem the same invitation twice. Guidance: [OWASP authentication and login throttling](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [Vercel request headers](https://vercel.com/docs/headers/request-headers).

## Presence and activity records

Active viewers appear as colored circular initial avatars immediately beside the left edge of global search. Two viewers are visible; a third +N control lists additional viewers. Click an icon to see the first name; presence responses omit last names and email addresses. A visible tab sends a heartbeat every 20 seconds and presence expires after 90 seconds without one. Presence uses a separate private Blob object and cannot invalidate a project save.

Settings displays recent audit events. Project overview, monthly reports, milestones, and weekly plans expose scoped **Edit history** to editors. Records identify the actor, timestamp, operation, and changed fields. Login credentials are excluded. The audit records start when this release is deployed; earlier edits are not fabricated.

The landing and privacy pages remain public. `/api/workspace`, `/api/presence`, `/api/security`, and `/api/history` enforce access on the server. `/api/session` returns minimal session state; only an explicit `?challenge=google` request issues a Google nonce.
