# Approved SDLC milestone reset

The user approved replacing all milestone contents in SIMSDotNet, PMS, and HRDotNet Mobile with explicit development, QA, acceptance, deployment, and handover gates on 20 November 2026.

| Project | Gates | Completed gate numbers | In progress | Planned |
| --- | --- | --- | --- | --- |
| SIMSDotNet | 15 | 1, 2, 3, 4 | 5 | 6–15 |
| PMS | 14 | 1, 2, 3 | 5 | 4, 6–14 |
| HRDotNet Mobile | 17 | 1, 2, 3, 5 | 4 | 6–17 |

The website uses `completed` for the user's “done” status. Mobile includes separate submission, store approval, and production publication/smoke-testing gates for Google Play and Apple App Store.

Old owners, dates, source notes, and forecast flags are cleared. Owners remain explicitly Unassigned and dates remain unset until supplied. The approved gate sequence is retained when dates are equal or absent; it is not alphabetized. No completion state is inferred from the calendar.

The seed revision `sdlc-gates-2026-11-20-v1` invokes the existing one-time milestone replacement for saved local JSON and production Blob workspaces. Projects and monthly reports are preserved. Once the revision is persisted by a save, subsequent milestone edits and deletions are retained.

The older workbook extraction documents and script describe historical imports. They are not the current SDLC baseline and should not be rerun to update the approved gates.
