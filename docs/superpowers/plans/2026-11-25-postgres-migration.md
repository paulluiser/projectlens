# Postgres Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development or executing-plans to implement this plan task-by-task. Preserve existing production content and credentials.

**Goal:** Replace Blob as the live database without losing project data, accounts, guest invitations, or audit history, and reduce idle polling.

**Architecture:** A Postgres adapter preserves the server's current state interface while storing projects, reporting months, milestones, weekly plans/tasks, identities, invitations and activity as separate records. Conditional revision checks and SQL transactions preserve current concurrency rules. Presence uses its own SQL table. Blob remains an untouched historical backup after cutover, with its last live snapshot frozen against stale writers.

**Tech Stack:** Existing Vercel Node APIs, Neon Postgres, node-postgres, current React UI/authentication.

- [x] Reduce workspace and presence polling to 60 seconds, deduplicate visibility/focus events, and avoid periodic requests on public pages. Keep revocation and guest expiry checks.
- [x] Implement explicit `LENS_STORAGE=postgres` selection and normalized SQL persistence. Missing/uninitialized Postgres fails closed; it never silently switches to Blob or seed data.
- [x] Add migration freeze enforcement to existing Blob handlers and deploy the preparation release.
- [x] Provision the free Neon integration and database, subject to the browser's required terms confirmation. Keep existing session-signing secret unchanged.
- [x] Export a private Blob backup, apply SQL schema and test real database transactions/security rules in an isolated test schema.
- [x] Briefly freeze source mutations using Blob conditional writes; export the exact final snapshot, initialize Postgres and verify canonical equality and record counts.
- [x] Set the production storage selector, deploy and verify private API access, authenticated reads/writes, guest restrictions and no runtime Blob requests.
- [x] Keep the source snapshot frozen and document rollback/export procedures. Do not delete the Blob store or historical backups.

## Implementation boundaries

Frontend worker owns polling/context and focused UI tests. Backend worker owns schema, adapter, handler integration and storage tests. Root owns provisioning, migration tooling, production backup/cutover, documentation, integration review and deployment.

## Rulings

- Work in the existing checkout and preserve unrelated untracked artifacts, consistent with the user's established main-branch workflow.
- Use Postgres JSONB payloads for individual domain records to preserve existing report formats and encrypted credentials exactly; avoid rewriting authentication or the UI during the storage migration.
- Import only into an empty destination; refuse overwrite. Backups and environment exports live under ignored `.local/migration/` with restricted filesystem permissions.
- Keep all production secrets out of command arguments, logs and Git. Use the existing Google/session configuration after cutover.
