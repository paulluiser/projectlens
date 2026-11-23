# Lens design system

Updated November 23, 2026: Lens now uses the Kern design system (from `~/Documents/Groundwork`), rebranded as Lens. Reference screenshots of Kern are in `docs/design-references/kern/`. Lens keeps its own aperture logo; Kern's logo is not used. The reporting content leads the interface. Keep the existing Project Lens identity, routes, fields, publication model and editor workflows.

## Direction and references

Quiet, exact, tool-like, as in Kern: warm paper surfaces, near-black ink, one blue accent (the logo's blue, #2563A6). Public pages follow the live Kern site (https://kern-ai.vercel.app/): a centred hero whose headline retypes the audience (project leads, delivery teams, stakeholders) in blue with a block cursor, a "What you get" grid with blue icons, three figures that resolve into place, one dark call-to-action band, and a four-column footer. Inner pages use an eyebrow, an h1 and the same icon grid. Everything is scoped to `.lx` in kern.css. Public pages sit on a quiet paper texture (a fine grain and a soft mottle from inline SVG noise, static, off in print and forced colours); it is kept light enough that muted text stays above 4.5:1 on the darkest speck. The workspace stays flat. Workspace pages use aligned data, compact controls and clear separators.

References inform hierarchy and interaction, rather than copying another product:

- [Linear project updates](https://linear.app/docs/initiative-and-project-updates): current state, evidence, challenges and next steps.
- [GitHub Primer forms](https://primer.style/product/ui-patterns/forms/): clear labels, grouped fields and recoverable errors.
- [Primer data visualization](https://primer.style/product/ui-patterns/data-visualization/): labelled figures and proportional bars.
- [Apple motion guidance](https://developer.apple.com/design/human-interface-guidelines/motion): purposeful feedback and reduced motion.

## Tokens

`src/styles/tokens.css` is authoritative, and its values come from Kern's Design system v2. Page #F5F3EE, raised surfaces #FBFAF7 (no pure white anywhere), tints #ECE9E2 and #E3DFD6, lines #E2DED5, control edges #8E8A83. Ink #111110, secondary text #3D3B37, muted #67645E. Primary buttons are ink with paper text; secondary buttons are hairline outlines. Focus rings are blue (#1F5FA6).

The accent is the logo's blue, not Kern's green: this is Lens's one deliberate departure from Kern.

One blue accent (#2563A6, hover #1D4F86, soft #E9F0F8, ink #173F6B; #6FA6E0 on ink surfaces) marks progress and position only: completion bars, the current navigation row, today markers, done states and the landing headline's last phrase. Destructive (#B42318), warning (#8A5300), and success colours communicate actual state and always have a text equivalent. Do not infer success from a numerical increase.

Geist Mono for everything (loaded from `@fontsource/geist-mono` at 400, 500 and 600 only; never use 700). Hierarchy comes from size, weight and colour. Use the scale tokens `--t-micro` 11 through `--t-display`; headings and display are tracked at -0.02em at most. Sentence case for headings, tabs and buttons; headings and buttons end without a period. Phone inputs use 16px text. Use the 4px spacing scale. Controls have 8px corners, surfaces 10px, cards 14px. Depth comes from borders; shadows only on layers that float. Top bars are translucent paper with a hairline, and section navigation is a segmented control on a tint. Avoid nested rounded cards where rows and separators explain the relationship.

## Navigation and layout

The desktop toolbar is 56px high and the sidebar 248px wide. Narrow screens use an accessible navigation drawer and expandable search. Preserve focus trapping, Escape dismissal, scroll locking and trigger focus restoration. Keep one primary page heading, a skip link and labelled icon controls.

Projects is the all-project dashboard. A project opens its monthly report directory; its sections (Overview, Reports, Milestones, Weekly) are switched from the sidebar only, and the page eyebrow names the current section ("Projects / Weekly"). Desktop tables become labelled records on phones. Empty and filtered states explain the next action. Keep visible context when refreshing or recovering from an error.

Reports have four chapters: Progress, Accomplishments, Blockers and Next Month. Display final figures immediately; use a labelled linear completion bar. Put narrative in open document sections. Keep blocker and response adjacent. Place the compact next-month calendar beside the agenda on desktop and above it on phones. Navigation stays in document flow and must not cover content. Presentation uses the same neutral reading treatment.

Milestones use compact aligned rows on wide screens and cards at 1024px or below. Preserve full dates, owner, status and imported source notes. The earliest open checkpoint is not necessarily in the future. Roadmaps show real scheduled windows without inventing durations. Status controls provide keyboard access, save feedback and conflict recovery.

## Forms and states

Keep all report sections mounted for native validation, with section shortcuts and a separate action footer. Required fields, optional markers, helper text and errors must remain clear. Dialogs share a single close control, labelled title, constrained scrolling and consistent gutters. Keep entered values after failures. Unsaved recovery is browser-local; Save draft persists to the shared store.

Primary actions use ink; destructive final actions use red and explicit confirmation. Touch targets are at least 44px. Inputs, selection, invalid, disabled, busy and focus states must be discernible. Measured input boundary contrast is 3.05:1 on white; primary button contrast is 6.15:1.

Drafts remain editor-only. Publication replaces the reader snapshot. Shared URLs open the publication. Concurrent changes retain the existing version check and explicit recovery. Do not change these rules for appearance.

## Motion and dependencies

No decorative orb, WebGL dependency, number scrambling or artificial navigation delay. Report chapters render immediately. Small state transitions use 140–240ms and respect reduced motion. Busy indicators and page-shaped skeletons communicate actual loading; no fabricated percentages. CSS animations pause in hidden tabs.

React, shadcn/ui/Radix, Tailwind, existing CSS and Framer Motion remain. New surface rules are scoped in workspace-remake.css, public-remake.css and reports-remake.css; milestone rules live in milestones.css. Kern's component signatures (header bar, segmented nav, headline, buttons) live in kern.css, which loads last.

## Verification

See [the November 19 audit](docs/ui-ux-audit-2026-11-19.md) for scope, findings, measurements and remaining device/assistive-technology checks. Browser measurements cover actual CSS widths, accounting for browser zoom. Automated interaction tests complement visual inspection; neither replaces real screen-reader and mobile-device testing.


## Guidelines

Audited against the Vercel Web Interface Guidelines on November 23, 2026. Lens deliberately keeps Kern's sentence case instead of the guidelines' Title Case. Global rules in kern.css cover balanced headings, `touch-action: manipulation`, scroll margins under the sticky header, explicit colours on native selects and a theme colour that matches the page.

## Workspace recreation (November 23, 2026)

Every workspace screen is rebuilt on Kern's components in `src/styles/kern-app.css`. `src/styles/index.css` puts the older sheets in a `legacy` cascade layer, so the Kern layers (`kern.css`, `kern-app.css`) always win without `!important`.

- Pages open with an eyebrow, an h1 at `--t-h1` and a muted description; actions sit on the right. Icon tiles beside titles are gone.
- Overview follows Kern's home: one dark spotlight (latest review), a stats card with a blue meter, then a row list where the latest row is tinted blue.
- Projects are marked with Kern's monogram (initials on the blue tint), not colour-coded shapes, because colour is kept for meaning.
- Section switches (report chapters, milestone views and filters) are Kern's segmented control.
- Status marks use Kern's verdict shape code: solid for published or completed, outlined for draft or in progress, dashed for awaiting or planned. Counts are neutral pills.
- Cards are 14px corners on raised paper, lists and tables are bordered row groups, dialogs and menus follow Kern's dialog and dropdown recipes, and progress bars are 8px blue meters.
- Milestone filter, search and view are kept in the URL (`?status=`, `?search=`, `?view=`).
- Every font size uses a Kern scale token; there are no px font sizes left.

## Projects, Weekly and charts (November 23, 2026)

- **Sidebar:** each project is a disclosure group with four sections in a fixed order: Overview, Reports, Milestones, Weekly. Only one project is open at a time: opening another closes the previous one, and the current project opens automatically. There are no page tabs repeating these sections.
- **Weekly:** each project has weeks with an editor-set start and end (up to 31 days) and an optional label. Tasks have a title, owner, target date, status (to do, in progress, blocked, done) and notes. The board is the default view and the list is the alternative; every card has a status menu as the keyboard and touch alternative to dragging. Week, view, search and owner live in the URL.
- **Status palette** (tokens `--status-done`, `--status-active`, `--status-blocked`, `--status-todo`): done blue #2563A6 (the accent), in progress amber #C2780A (text in #8A5300), blocked red #A1121D, and to do grey #8E8A83. It is validated with the dataviz checker in bar order (done, in progress, blocked, to do). Statuses always carry a label, and marks follow Kern's verdict shapes: solid for done, outlined for in progress, dashed for not started.
- **Charts** are built in `Charts.jsx` and follow the dataviz mark specs: columns at most 24px, 4px rounded tops, hairline grid, a legend for two or more series, a hover tooltip per mark, and a table view. The neutral series is `#CFC9BE`; it relies on labels and the table, never on contrast alone.
- **Illustrations** are in `Illustrations.jsx`: hairline ink, paper fill and the blue accent, decorative only, used in empty and "not found" states.
- The full analysis is in [docs/ui-ux-analysis-2026-11-23.md](docs/ui-ux-analysis-2026-11-23.md).
