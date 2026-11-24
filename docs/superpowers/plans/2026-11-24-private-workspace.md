# Private workspace, presence, and accountable editing

## Scope

Require sign-in before reading workspace data. Keep the landing and privacy notice public. Preserve the existing Blob workspace and editor allowlist.

1. Add named account profiles, personal remote credentials, single-use seven-day guest invitations, server access checks, and rate limits. Guests can read published content but cannot edit or inspect editor history.
2. Add a landing sign-in dialog, mandatory first/last-name onboarding, and a short logo splash on refresh and authentication changes.
3. Add masked personal codes, administrator guest-code generation, audit records, and module-scoped edit history in Settings and project surfaces.
4. Show active viewers immediately left of search as varied avatar icons. Clicking reveals first name only. Presence uses independent storage and expires when heartbeats stop; it cannot invalidate project edit versions.
5. Verify backend access boundaries, code redemption, UI interactions, responsive layout, and the production build. Commit and push main as requested.

## Decisions

- Remote codes are bearer credentials: cryptographic generation, case normalization, hashed lookup, encrypted recovery for the account owner, and rate-limited attempts. They never enter audit entries or public API responses.
- Guest invitations expire seven days after creation and are consumed atomically. Guest sessions remain bounded and view-only.
- Profiles require an explicit first and last name submission, including existing signed-in accounts.
- Retain existing Google allowlist management and conditional Blob writes. Authentication and presence never expose other users' credentials.
- Presence follows Google Docs’ circular initial avatars: two visible people, then a +N overflow control. Names appear only after clicking. No email addresses or last names are returned.
- Use the incumbent Kern surfaces and existing Radix controls, without adding dependencies.

## Implementation boundaries

Backend: server handlers, persistence, identity, audit/history and security regression tests. Authentication interface: shared provider, landing, sign-in, onboarding and splash. Settings/history: security controls and module history. Root integration: viewer avatars, privacy documentation, integrated verification and push.
