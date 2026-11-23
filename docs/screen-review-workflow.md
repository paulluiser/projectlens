# Screen review workflow

Run this after any visual change. It renders every screen, state and dialog at five widths, saves a full-page capture of each, and runs an automated layout audit on every capture. Nothing is saved to the workspace: dialogs are opened, never submitted with valid data.

## Coverage

- **Widths:** 1440, 1280, 1024 (laptop with sidebar), 768 (tablet), 390 (phone, touch).
- **57 screens and states:**
  - **Public pages:** landing, features, how it works, use cases, updates.
  - **Workspace:** overview, projects (with matching and empty search), each project page and its sort order, collapsed sidebar, phone drawer and phone search.
  - **Reports:** every chapter for each report month, a calendar day selected, calendar collapsed, review complete, presentation home and chapters, share popover, missing month.
  - **Milestones:** roadmap, dated roadmap, expanded row, calendar and selected day, list, filtered, no search results, status menu.
  - **Dialogs:** all 12, including validation errors and every section of the report editor.
  - **Not found pages:** all three.
- **Dated milestones:** none of the real projects have milestone dates yet, so the script adds dates in memory (by intercepting `/api/workspace`) to render the dated roadmap, calendar and agenda.

## Run

1. Start the dev server (`npm run dev`, port 5173).
2. `npx -y -p playwright@1.58.2 node scripts/capture-screens.mjs <out-dir> [name-filter] [width]`
   (set `CHROME_PATH` to reuse a downloaded Chromium). The run writes one PNG per capture and `audit.json`.
3. Read `audit.json`. Each capture lists:
   - `edge`: text within 7px of a bordered card's edge (missing padding)
   - `clipped`: text cut off without an ellipsis
   - `overlap`: text from two elements on top of each other
   - `target`: a control smaller than 24×24
   - `font off-scale`: a size outside the Kern scale
   - `page overflows`: horizontal scrolling
   - `pageerror`: a script error
4. Review the captures by eye against the six checks, every width:
   1. Is the screen readable? Nothing truncated, numbers never break across lines, text on the Kern scale.
   2. Is anything overlapping or confusing? No rules touching cards, no stray focus boxes, popovers padded.
   3. Is it cluttered? No decoration repeated on every row, no cards nested inside cards.
   4. Does it follow the design system (DESIGN.md, `tokens.css`, `kern-app.css`)? One green for progress, status colours consistent everywhere.
   5. Could it be arranged better? Layouts match the space actually available (the sidebar takes 248px), primary action first.
   6. Can white space be removed within the 4px rhythm?
5. Revise, re-run until the audit and the visual review are clean, then `npm test` and `npm run build`.

Expected audit entries that are not defects: a status menu or popover covering the rows beneath it, and text links inside sentences, which are exempt from the 24px target rule.

## Review of November 23, 2026, round 2

The first pass missed widths between desktop and phone. Round 2 added 1280, 1024 and 768, many more states, and the automated audit.

| Check | Where | Issue | Revision |
| --- | --- | --- | --- |
| 1, 2 | Milestones overview, all widths | Delivery roadmap and next-checkpoint cards had no inner padding; text touched the border | 20px card padding; no rule below the overview |
| 4 | Milestones | "In progress" was black in the legend and filters but light green in the bar | One colour per status in the bar, legend, filters, menu and calendar |
| 2 | Milestone rows | A wrapped title pushed its chevron to the far edge | Chevron stays next to the last word |
| 5, 6 | Milestones at 761–1024px | Laptop got phone-style cards with 44px controls; each row was 4 lines tall | One compact row (title, date, status, actions); 44px targets only on touch screens |
| 3 | Milestone table | Tall tinted header band | 40px header |
| 1, 5 | Progress chapter at 768–1100px | Two columns in ~520px: "566.\n75", "3,30\n9", workstream counts overlapping labels | One column below 1100px; figures never wrap; labels truncate with an ellipsis |
| 2, 5 | Report header at 768 | Title and buttons centred and scattered | Left-aligned title row, actions after |
| 1 | Chapter tabs at 768–1100px | "Next month" clipped | Four equal tabs without icons; 2 by 2 grid on phones |
| 2 | Projects table at 768 | Table ran past its card; cells wrapped onto two lines | Cells stay on one line; "Open project" becomes an arrow below 1100px |
| 3 | Project cards on phones | Doubled divider lines | One divider between fields |
| 2 | Presentation home, phone and tablet | Focus box drawn around the title after it loaded | Script-focused headings show no focus box |
| 2, 4 | Milestone calendar | Calendar card's heading touched its border | The grid is the bordered element; the heading sits on the page |
| 1 | Header search | Only the thin input focused; clicking the rest of the box did nothing | The input fills the whole box |
| 1 | Breadcrumbs, back links, spotlight link, calendar controls | Targets under 24px | 24px minimum without changing their look |
| 1, 5 | Report editor on phones | Section tabs cut off "Blockers" | Tabs wrap |
| 5 | Dialog footers on phones | "Delete milestone" wrapped onto two lines | Buttons stay on one line and share the width |
| 3 | 404 page | No explanation, unlike the other empty states | One line on what happened and what to do |
| 3 | Missing report page | Stray "Local editor" label among the actions | Hidden there |

## Review of November 23, 2026, round 1

27 screens at 1440 and 390. Fixed: truncated search placeholder, review-end buttons, a rule touching report cards, unpadded share popover, nested cards in Progress and Accomplishments, heavy Next month separators, repeated "Not scheduled" pills, phone chapter tabs and metric rows, and loose spacing on the landing hero and project tabs.
