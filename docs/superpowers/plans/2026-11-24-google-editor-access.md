# Google editor access

- Preserve JSON/Blob storage and existing public read-only browsing.
- Add Google Identity Services sign-in in Settings. Verify ID tokens with Google's Node SDK on the server, bind them to a signed nonce, and issue an HttpOnly session cookie.
- Bootstrap administrators from LENS_ADMIN_EMAILS (initial administrator: the owner’s configured Google-account email). Require LENS_GOOGLE_CLIENT_ID and LENS_SESSION_SECRET to enable Google mode; incomplete Google configuration fails closed. Existing password access remains until Google configuration begins and is disabled in Google mode.
- Persist editor emails in the private runtime workspace JSON. Administrators can add/remove editors in Settings without deployments. Administrators cannot be changed in the UI.
- Authorize every read/write using current stored access, so removal revokes editing and draft access on the next request. Only administrators receive the access list and may change it. Preserve conditional-write conflict protection.
- Test allowed/denied identities, claim and nonce validation, tampering/expiry, admin authorization, removal/revocation, and credential-free reader responses. Verify the Settings flows in a browser with test-only Google responses, then require a real Google sign-in after console configuration.
- Help configure the Google OAuth web client, approved origins, branding/audience and Vercel environment. Never store the signing secret in the repo or expose it in client responses.
