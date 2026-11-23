# Lens UI and UX analysis

November 23, 2026. Scope: every public and workspace screen, the new Weekly module and project Overview, at 1440, 1280, 1024, 768 and 390px. The method combined the Playwright capture and layout audit (`scripts/capture-screens.mjs`), the Vercel Web Interface Guidelines, the Kern design system (DESIGN.md), and a task walkthrough for each role on the Use cases page.

## Who uses Lens, and for what

| Role | Main job | Where it happens |
| --- | --- | --- |
| Project lead | Prepare and present the monthly review; delegate this week's work | Report editor, presentation mode, Weekly |
| Delivery team member | See what they own this week and what's due next | Weekly (filtered by owner), Next month chapter |
| Stakeholder | Read the latest published review without editing | Overview, a shared report link |
| Editor | Keep projects, reports, milestones and weeks current | Every dialog |

The two time horizons, monthly review and weekly execution, were the biggest gap. Lens covered the month well but had nowhere to track the week in between, so delegation lived in chat or spreadsheets.

## Information architecture

**Before:** the sidebar listed projects as flat links that opened the reports list. Milestones appeared as a sub-link only on the active project. Nothing summarized a project as a whole, so the only entry points were a table of report months or a milestone list.

**After:** every project is a group with the same four sections, in the same order, switched from the sidebar (the page tabs that repeated them were removed as redundant):

```
Projects
  SIMSDotNet        ▾
    Overview        where the project stands (charts, latest review, this week)
    Reports         monthly reviews (the existing reports list and chapters)
    Milestones      roadmap, calendar and list
    Weekly          weekly task delegation, as a board or a list
  PMS               ▸
  HRDotNet Mobile   ▸
```

Why this structure:
- **Predictable.** The same four sections exist for every project, so people learn the layout once.
- **Scales without clutter.** Only one project is open at a time; the current project opens automatically and opening another closes it.
- **Shows where you are.** The sidebar marks the current section; on a report chapter it marks Reports as the location, since Reports is the parent.
- **Keeps old links working.** Reports keeps the project's original address, so existing links and bookmarks still land on the reports list.

## Findings by heuristic

Severity: **H** blocks or misleads, **M** slows people down, **L** polish.

### Visibility of system status
- **M:** there was no sense of "this week": reports summarize a month after it ends. *Fixed:* Weekly shows days left, done out of total, a status split, and overdue, due-today and outside-the-week counts.
- **M:** project health was spread across three screens. *Fixed:* the project Overview combines the latest review, current week, milestone split and trends; the workspace Overview adds "Projects at a glance".
- **L:** the save toast rendered a light box inside a dark one. *Fixed:* a single dark Kern toast.

### Match with the real world
- **M:** teams rarely work in calendar weeks (sprints run Wednesday to Tuesday, release weeks stretch). *Built in:* you set each week's start and end yourself, up to 31 days, with an optional label like "Sprint 14". New weeks default to the next Monday–Friday after the last week.
- **L:** status words matched each other everywhere: to do, in progress, blocked, done for tasks, and the existing four for milestones.

### User control and freedom
- **H:** destructive confirmations were rendering as plain outline buttons (a CSS regression from the Kern restyle). *Fixed:* delete confirmations are red again across every dialog.
- **M:** deleting a week deletes its tasks. The confirmation says so and gives the task count.
- **L:** filters, search, view and the selected week live in the URL, so Back, reload and shared links all restore them.

### Consistency and standards
- **M:** status colours differed between the bar, the legend and the filters (in progress was black in one place, light green in another). *Fixed:* one validated status palette (done green, in progress blue, blocked red, to do grey) used for milestones, tasks, charts and legends. The palette passes the colour-blindness and normal-vision checks in the order the bars use.
- **L:** status marks follow Kern's verdict shape code: solid for confirmed (done or completed), outlined for in progress, dashed for not started.

### Error prevention
- **M:** a task's target date can fall outside its week. That's allowed, because work slips, but it's flagged in the dialog as you type and on the card ("Outside week").
- **M:** overdue tasks (not done and past their target) are marked in red text with an "Overdue" tag, so the meaning never depends on colour alone.
- **L:** the server rejects invalid brackets (end before start, more than 31 days, impossible dates) with a message that says what to change.

### Recognition rather than recall
- **M:** the owner field suggests names already used in the project, so names stay consistent ("KC" rather than "K.C.").
- **L:** every card shows the owner's initials, the target weekday and date, and the status without opening it.

### Flexibility and efficiency
- **M:** the board supports drag and drop between columns for pointer users. Every card also has a status menu, the keyboard and touch alternative the guidelines require for drag gestures.
- **L:** "Add task" sits at the foot of each column and starts in that column's status.
- **L:** "/" jumps to search from anywhere in the workspace.

### Aesthetic and minimalist design
- **M:** the milestone toolbar had two segmented bars with a dot and a count on every option, repeating the legend above it. *Fixed:* one row with search, a status dropdown and the view switch.
- **L:** charts are used only where a trend or proportion is the point. Single figures stay as numbers.

### Help and recovery
- **L:** every empty state now has an illustration, a sentence on what happens there, and the next action ("Plan your first week", "No tasks this week yet", "No matching tasks", the 404 page).

## Graphics, illustrations and graphs

**Charts.** All follow the dataviz rules: columns at most 24px wide with 4px rounded tops on one baseline, hairline grid, a legend for two or more series, labels only on the latest value, a hover tooltip on every mark, and a "View as table" fallback.

| Where | Chart | Why this form |
| --- | --- | --- |
| Project Overview | Project completion by month (columns, 0–100%) | Change over time in a single measure |
| Project Overview | Tasks completed vs planned (paired columns) | Compares two measures per month on one axis |
| Project Overview | Milestones (segmented status bar with legend) | Parts of a whole by state |
| Project Overview | Weekly throughput (done vs open, last 6 weeks) | Execution trend between reviews |
| Workspace Overview | Projects at a glance (completion bars) | Compares projects on one shared scale |
| Weekly | Status split and workload by owner (stacked done/open bars) | Shows balance: who is overloaded, who is blocked |

**Illustrations.** Five line drawings in Kern's style (hairline ink, paper fill, one green), used only in empty and "not found" states: week bracket, board, chart, search, and roadmap. They're decorative (`aria-hidden`); the text beside each one carries the meaning.

## Accessibility notes
- Every chart has a text alternative (`role="img"` with a full description) and a table view. Status is never shown by colour alone.
- Drag and drop has a keyboard and touch alternative (the status menu). Columns announce their names and counts.
- Sidebar project groups are disclosure buttons with `aria-expanded` and `aria-controls`.
- Kanban columns scroll horizontally with snap on phones, so each column is full-width and readable.

## Remaining recommendations

| Priority | Recommendation |
| --- | --- |
| M | Link weekly tasks to milestones, so the roadmap shows the work under each checkpoint |
| M | Carry unfinished tasks into the next week with one action (with a note of where each came from) |
| M | An "assigned to me" view across projects, once Lens knows who is signed in (editor sign-in is shared today) |
| L | Order tasks within a column by drag, not only by target date |
| L | A dark theme, to match Kern's (light is the default, as in Kern) |
| L | Add an interface test for the Weekly board to the UI test suite; the server tests already cover every Weekly action |
