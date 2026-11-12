# Project Lens CRUD implementation

**Goal** Create, read, update, and delete projects and monthly reports through the website, with shared server persistence.

**Architecture** The browser reads an API-backed workspace. A local JSON file supports development. On Vercel, a private Blob store keeps the same workspace JSON between deployments and devices. Version checks reject stale writes. An editor password protects production changes.

**Data** Preserve the current report schema and canonical project/month routes. Create and edit reports through labelled fields and editable lists for workstreams, compliance, accomplishments, blockers, next-month actions, and milestones. New reports begin empty. The September source seeds the initial server workspace.

- [x] Implement and test atomic JSON storage, validated CRUD mutations, conditional Blob writes, and editor sessions.
- [x] Add an API data provider with refresh-on-focus and periodic refresh, preserving in-progress form values.
- [x] Add project and report forms, add/remove nested report rows, deletion confirmation, and error/conflict feedback.
- [x] Connect the directory, sidebar, and report pages to shared server data. Keep the landing page product-only.
- [x] Run API persistence/concurrency/auth checks, component rendering checks, tests, and production build. Document deployment configuration and any remaining external setup.

**Verification:** 19 automated tests pass. Component/API checks exercised project and report CRUD, persisted JSON, editor sessions, and conflict recovery. Production build and `git diff --check` pass. The existing Three.js bundle size warning remains.

**External setup and limits:** Connect a private Vercel Blob store and configure `BLOB_READ_WRITE_TOKEN` and `LENS_EDITOR_PASSWORD` for shared production editing. Blob concurrency was tested with a mock; a live store is not configured or verified. Visual browser QA is pending because local browser access is disabled.
