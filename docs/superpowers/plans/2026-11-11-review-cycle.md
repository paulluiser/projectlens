# Monthly review cycle implementation

Implemented the authorized first three macro features and eight micro improvements.

- [x] Private report drafts, explicit publication, publication dates, stable reader snapshots, and reader-side API redaction.
- [x] Previous calendar month comparison with count/hour deltas and project percentage-point changes; missing data stays missing.
- [x] Import published commitments, record outcomes/context, and explicitly add carried/changed actions to the next plan.
- [x] Unsaved-close warning, page-leave warning, local recovery and explicit restore/discard. History navigation retains recovery but does not block the route.
- [x] Optional labels, metric hints, native inline validation, count limits, and upcoming-month date bounds.
- [x] Chapter-preserving month switch and directory filter restoration.
- [x] Clear post-create/report-save actions through project toolbar and automatic draft preview.
- [x] Report/chapter sharing with canonical published links, copy feedback and manual fallback.
- [x] Advisory publication completeness check without forcing irrelevant narrative.
- [x] Shortcut guide, private presenter notes, and completion screen.
- [x] Full planned dates and historical-plan context.

Verification: 30 tests pass, including a committed JSDOM/API review-cycle test covering recovery, carry import, publish, stable publication after edit, comparison, sharing, month navigation, filter restoration, and presentation completion. Additional password/conflict/sign-out integration passed. Build and whitespace checks pass. Mechanical design detector produced only advisory token mismatches. Existing Three.js size warning remains. No rendered browser or live Blob verification was possible in this session.
