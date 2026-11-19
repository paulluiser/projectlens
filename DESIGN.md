# Project Lens design system

Updated November 19, 2026 after the end-to-end visual audit. The reporting content leads the interface. Keep the existing Project Lens identity, routes, fields, publication model and editor workflows.

## Direction and references

Use a calm reporting workspace: white reading surfaces, pale neutral navigation, dark ink and one blue action colour. Public pages use an editorial introduction and the report's real four-chapter outline. Workspace pages use aligned data, compact controls and clear separators.

References inform hierarchy and interaction, rather than copying another product:

- [Linear project updates](https://linear.app/docs/initiative-and-project-updates): current state, evidence, challenges and next steps.
- [GitHub Primer forms](https://primer.style/product/ui-patterns/forms/): clear labels, grouped fields and recoverable errors.
- [Primer data visualization](https://primer.style/product/ui-patterns/data-visualization/): labelled figures and proportional bars.
- [Apple motion guidance](https://developer.apple.com/design/human-interface-guidelines/motion): purposeful feedback and reduced motion.

## Tokens

`src/styles/tokens.css` is authoritative. Ink is #20252b, secondary text #59636e, primary blue #2563a6, hover #1c4f85, canvas #f6f7f8, surfaces white, dividers #dce1e6 and input boundaries #8995a1. Destructive, warning and success colours communicate actual state and always have a text equivalent. Do not infer success from a numerical increase.

Use the system sans stack for functional text. Georgia is limited to the public home headline. Body text is generally 14–16px; supporting text 13px; page titles 24px. Phone inputs use 16px text. Use the 4px spacing scale. Controls have 6px corners and surfaces 8px corners. Avoid nested rounded cards where rows and separators explain the relationship.

## Navigation and layout

The desktop toolbar is 60px high and the sidebar 232px wide. Narrow screens use an accessible navigation drawer and expandable search. Preserve focus trapping, Escape dismissal, scroll locking and trigger focus restoration. Keep one primary page heading, a skip link and labelled icon controls.

Projects is the all-project dashboard. A project opens its monthly report directory, with Reports and Milestones as sibling tabs. Desktop tables become labelled records on phones. Empty and filtered states explain the next action. Keep visible context when refreshing or recovering from an error.

Reports have four chapters: Progress, Accomplishments, Blockers and Next Month. Display final figures immediately; use a labelled linear completion bar. Put narrative in open document sections. Keep blocker and response adjacent. Place the compact next-month calendar beside the agenda on desktop and above it on phones. Navigation stays in document flow and must not cover content. Presentation uses the same neutral reading treatment.

Milestones use compact aligned rows on wide screens and cards at 1024px or below. Preserve full dates, owner, status and imported source notes. The earliest open checkpoint is not necessarily in the future. Roadmaps show real scheduled windows without inventing durations. Status controls provide keyboard access, save feedback and conflict recovery.

## Forms and states

Keep all report sections mounted for native validation, with section shortcuts and a separate action footer. Required fields, optional markers, helper text and errors must remain clear. Dialogs share a single close control, labelled title, constrained scrolling and consistent gutters. Keep entered values after failures. Unsaved recovery is browser-local; Save draft persists to the shared store.

Primary actions use blue; destructive final actions use red and explicit confirmation. Touch targets are at least 44px. Inputs, selection, invalid, disabled, busy and focus states must be discernible. Measured input boundary contrast is 3.05:1 on white; primary button contrast is 6.15:1.

Drafts remain editor-only. Publication replaces the reader snapshot. Shared URLs open the publication. Concurrent changes retain the existing version check and explicit recovery. Do not change these rules for appearance.

## Motion and dependencies

No decorative orb, WebGL dependency, number scrambling or artificial navigation delay. Report chapters render immediately. Small state transitions use 140–240ms and respect reduced motion. Busy indicators and page-shaped skeletons communicate actual loading; no fabricated percentages. CSS animations pause in hidden tabs.

React, shadcn/ui/Radix, Tailwind, existing CSS and Framer Motion remain. New surface rules are scoped in workspace-remake.css, public-remake.css and reports-remake.css; milestone rules live in milestones.css.

## Verification

See [the November 19 audit](docs/ui-ux-audit-2026-11-19.md) for scope, findings, measurements and remaining device/assistive-technology checks. Browser measurements cover actual CSS widths, accounting for browser zoom. Automated interaction tests complement visual inspection; neither replaces real screen-reader and mobile-device testing.
