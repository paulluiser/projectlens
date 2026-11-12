# Project Lens

<!-- impeccable:product-schema 1 -->

## Platform

Web. Project Lens supports a live monthly review followed by self-guided browsing of the same report.

## Users

A presenter walks an audience through the month’s results, blockers, and next month’s priorities. Afterward, readers can open the shared report and jump directly to a chapter. The sample source describes the audience as internal management.

## Stack

React, shadcn/ui, Tailwind CSS, Three.js, and Framer Motion. The prototype will use Vite to produce a static build deployable to Vercel. Versioned JSON seeds the initial workspace. Website changes save through a server API to a local JSON file during development and a private Vercel Blob JSON object when deployed. Editors sign in with a shared editor password. Readers open the same report URLs across devices.

## Product requirements

1. The landing page introduces Project Lens and illustrates the four review chapters with generic labels. Project names, dates, and figures appear after entering the report library.
2. The four report chapters are Progress, Accomplishments, Blockers, and Next Month. The last chapter names the incoming month explicitly. Show the most important evidence as charts, diagrams drawn in the interface, and short labels. Put supporting detail one action away.
3. Use /landing for the home page, /landing/projects for the library, and /landing/projects/<project>/<month>/<contents> for chapter links. The library lets visitors choose a project and a month. A project/month pair identifies a report independently of the selected chapter. Opening a shared link, refreshing, and using browser Back or Forward preserve the selected context.
4. The same review supports previous and next controls and keyboard arrows for presenting. A chapter list supports direct jumps while browsing. Moving between chapters carries a shared visual element forward and animates entering and exiting content. Reduced motion gives the same controls and information with immediate changes.
5. Ship the SIMSDotNet September review from the September 2026 closeout deck (v4). Display the plan for October inside the September review. Show October as awaiting a report in the library until the user supplies October results.

6. Editors can create, read, update, and delete projects and monthly reports in the website. A report form includes the progress metrics and all nested review entries. Project names can change while their route IDs stay stable. Delete actions require a confirmation.
7. Concurrent edits use a workspace version. A stale save receives a conflict response and keeps the editor’s form values. Open views refresh when focused and periodically while visible, with refresh paused during editing.

## Source and decisions

- The working source is `SIMSDotNet_Monthly_Planning_Summary_September_2026_v4.pptx`. It documents September results and October plans in one deck. The earlier planning revision documents August wins and September targets.
- Slide 5 lists 566.75 September hours, 2,742.25 prior hours, and 3,309.00 running hours. Slide 1 lists 3,309.25 running hours. Use 566.75 as the September metric and record both running totals in the detail view.
- The prototype uses one actual project, with the catalog structured to hold multiple projects. Preview and build from the local workspace. Actual hosting and audience access are open decisions.

## Interface

Use a clear reporting workspace with familiar sidebar navigation, breadcrumbs, chapter tabs, and labelled controls. The November 12, 2026 redesign replaces the macOS look with a survey-sheet world: white map paper, contour hairlines, survey blue actions, and semantic green, ochre, and red feedback. Progress is drawn as an elevation profile of the project route. Keep Atlassian core icons consistent throughout. The landing page introduces Project Lens with an illustrative contour terrain and loads report data only after navigation to a project surface.

## Deployment decisions

The implementation uses private Vercel Blob for durable shared JSON and a shared-password editor session. These are implementation choices for the requested server-based sharing. The Vercel project must have a private Blob store and server environment variables configured before production editing is enabled. The current local website uses the server JSON file.

## Acceptance

- The site renders its graphs and illustrations from HTML, CSS, and Three.js geometry. Visual assets are removed.

- A presenter can open the library from the landing page, select the September review, and visit all four chapters using mouse or keyboard.
- A reader can open a chapter directly from a shared URL, inspect the underlying figures, and discover October’s planned work inside the September report.
- The interface is legible at phone and desktop widths. Report content and navigation remain usable with reduced motion or unavailable WebGL.
- `npm run build` produces the static site in `dist/` with URL fallback configured for Vercel.

## Monthly review workflow

Editors save reports as private drafts, preview them, and publish explicitly. A published report is a stable snapshot; later edits do not change it until the next publication. Reader API responses exclude drafts and presenter notes. Existing seeded reports count as published without inventing a publication date.

Progress compares against the previous calendar month's published report. Missing prior reports show an explanation rather than fabricated zero values. A report can import the preceding review's planned actions and record completed, carried-over, changed, or dropped outcomes with context. Editors may explicitly add carried or changed commitments to the incoming plan and adjust their dates.

Editor improvements include optional-field labels, metric hints, native inline validation, closing warnings, and recoverable browser-local work. Navigation preserves the current chapter across month changes and restores directory filters. Sharing copies canonical published URLs. Publication includes an advisory completeness check. Presentation includes shortcut help, editor-only notes, and a completion screen. Planned dates include the year and distinguish historical plans from task completion.


The sidebar Projects action opens the all-project dashboard at `/landing/projects`. Create project is available there for editors. A project row opens `/landing/projects/<project>` for monthly reviews and project management. The sidebar entry does not restore a previously selected project.
