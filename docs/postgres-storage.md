# Postgres workspace storage

The live adapter is selected only by `LENS_STORAGE=postgres`, with a server-only Neon pooled `DATABASE_URL`. Keep `LENS_SESSION_SECRET`, the Google client and administrator list unchanged: account codes remain encrypted with the same key and existing sessions keep their identities. Missing or uninitialized Postgres returns an unavailable response; it never falls back to old Blob data or seed content.

Projects, reporting months, milestones, weekly plans/tasks, accounts, guest codes, audit/history, login attempts and retired credential hashes use separate tables. Each save locks the revision row, rejects stale revisions and updates only changed records in one transaction. JSONB preserves the report shapes and encrypted values; collection manifests preserve ordering and absent versus empty arrays. Presence has a separate expiring table and does not modify the workspace revision.

## Cutover

1. Deploy the preparation release while `LENS_STORAGE` remains `blob` or unset. It includes the mutation freeze guard and reduces idle browser polling.
2. Create a free Neon database and connect only the Project Lens project. Do not rotate existing application credentials. Prefer the same region as the Vercel API functions.
3. Use the expiring operator-only migration control to export a private, checksummed source backup and apply `server/schema.sql`. The operator key is never part of the website or Git.
4. Briefly freeze source mutations. This conditional Blob write increments the source version so in-flight stale saves cannot overwrite the freeze. Reads and sign-out continue; project saves, account mutations and code redemption pause.
5. Export the exact frozen snapshot, import into an empty Postgres database and verify canonical deep equality and domain-record counts. The only deliberate difference is the completed storage-migration marker. Duplicate initialization refuses overwrite.
6. Set production `LENS_STORAGE=postgres`, redeploy, and verify anonymous denial, authorized reads/writes, preserved account permissions, guest restrictions and source immutability.
7. Keep the Blob source frozen as a historical backup. Remove the temporary migration endpoint and its operator-key environment variables after verification.

Private snapshots are written beneath ignored `.local/migration/` with permissions 0600. Keep these out of artifacts, public hosting and Git. `npm run db:migrate -- export-db` supports operator backups when a usable database connection is supplied in the environment; never put secrets in command arguments.

## Rollback

Do not simply change the selector back to Blob after live Postgres edits: that would expose stale data. First pause writes, export and verify the latest Postgres state, back up the frozen Blob source, then restore that latest state to Blob by conditional write and remove the freeze marker. Only then switch the selector and redeploy. Never delete either store as part of a cutover.

## Refresh behavior

A visible signed-in workspace checks data every 60 seconds; idle checks use the workspace response's session flags rather than a second session request. Editing still checks session validity. Presence heartbeats every 60 seconds and expires after 180 seconds without one. Public pages do not poll. Rapid focus/visibility events are deduplicated for 10 seconds. Guest sessions still have an independent hard expiry timer.

## Verification

The adapter tests cover normalized round-trip identity, duplicate initialization, transaction rollback, stale/concurrent writes, unchanged-record preservation and presence independence. The optional real SQL test uses `TEST_DATABASE_URL` and an isolated temporary schema; never point it at a production schema. Browser tests retain account-change race, revocation, guest expiry and published-report privacy checks.
