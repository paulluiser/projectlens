# Google sign-in and editor access

## Roles

Administrators are bootstrapped from `LENS_ADMIN_EMAILS`, configured on the server. Only people who can manage the Vercel project's environment variables can change administrators. Ordinary editors cannot promote themselves. Administrators always retain access even if the editor list is emptied.

Administrators open **Settings → Account → Manage editors** to add or remove exact Google-account email addresses. This list is saved in the private workspace JSON, with the same version and conditional-write protection as project content. No Git commit or deployment is needed to change editors. Removal denies editing and draft access on the next server request; an already-open browser refreshes its displayed access periodically or when focused. Published reports remain publicly readable.

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

Redeploy once after setting these variables. Existing shared-password sessions will no longer authorize editing in Google mode; the shared password cannot bypass the allowlist. An incomplete Google configuration fails closed. Without any Google configuration, the existing password/local-development behavior is preserved.

Verify the cutover with your administrator account: Google sign-in, Settings access management, a rejected non-allowed account, editor removal, and sign-out. Rotate `LENS_SESSION_SECRET` and redeploy to invalidate all Google app sessions. Environment changes to the administrator list require redeployment; routine editor changes in Settings do not.

## Implementation and security checks

Google's official Node library verifies token signatures, issuer, audience and expiry. Login also checks verified email and a signed, short-lived nonce tied to an HttpOnly cookie. The app session is signed, HttpOnly, SameSite=Strict and Secure in production, and expires after eight hours. Every workspace request re-evaluates access against the current stored editor list. Same-origin checks protect session changes and workspace writes. Google sign-in does not grant access to Drive, Gmail or other Google APIs.

References: [Google web setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid), [ID token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token), [nonce configuration](https://developers.google.com/identity/gsi/web/reference/js-reference#nonce).
