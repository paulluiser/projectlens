---
name: Project Lens
description: A macOS-inspired reporting workspace with a unified toolbar and system blue actions.
colors:
  cloud: "#EBEDF2"
  jet: "#20242C"
  blue: "#005DCC"
  canvas: "#F7F8FA"
  surface: "#FFFFFF"
  surface-hovered: "#E1E5EC"
  text-subtle: "#414D60"
  border: "#D7DCE5"
  selected: "#DCEAFF"
  selected-text: "#084B9D"
  success: "#186448"
  success-surface: "#E7F4ED"
  warning: "#865300"
  warning-surface: "#FFF2D6"
  destructive: "#B42318"
  destructive-hover: "#8F1C13"
typography:
  display: { fontFamily: "system-ui, sans-serif", fontSize: "44px", lineHeight: 1.12 }
  display-mobile: { fontSize: "32px" }
  heading: { fontSize: "24px", fontWeight: 650, lineHeight: 1.25 }
  landing-section: { fontSize: "22px" }
  section: { fontSize: "20px" }
  metric: { fontSize: "18px" }
  intro: { fontSize: "17px" }
  panel: { fontSize: "16px" }
  body: { fontSize: "14px", lineHeight: 1.55 }
  supporting: { fontSize: "13px" }
  metadata: { fontSize: "12px" }
  chart: { fontSize: "27px" }
rounded:
  indicator: "2px"
  lozenge: "3px"
  compact: "4px"
  avatar: "5px"
  control: "6px"
  panel: "8px"
  dialog: "12px"
---

# Project Lens design system

The reporting task leads. Familiar navigation remains, while the heavy dark frame and rigid color percentages are retired under the user's November 11 override. Cloud, jet, and system blue remain the identity; they no longer prescribe surface area.

## Surface direction

The landing page explains the product with generic chapter examples and one primary action. It never fetches or displays project data. Its larger type is limited to the introductory message.

Project selection, reports, and editing use restrained product UI: system sans, quiet borders, clear labels, predictable controls. Report content has more room than filters and toolbars. Avoid making every heading or icon system blue.

## Color and state

Use white reading surfaces on a cool light canvas. Cloud anchors navigation; jet supplies text and the compact save confirmation. Violet identifies primary actions, selected chapters, and focus. Green identifies successful completion; amber identifies carry-over; red is reserved for destructive confirmation. Always pair state color with text or an icon.

## Layout and typography

Use a 60px desktop header and 224px desktop sidebar, reducing the sidebar at 1050px and opening it as an overlay below 760px. Workspace gutters are 32px desktop and 12px mobile. Keep prose within 72 characters when possible. Titles lead at 24px; section headings use 16–20px. Supporting labels use 12–14px. Mobile fields use 16px to avoid input zoom.

The landing introduction uses 44px type, 32px on narrow screens. It has an interactive chapter explanation and an explicitly illustrative diagram. It makes no claims about actual delivery results.

## Components

- Keep Atlassian icons consistent. Label standalone icon controls; hide redundant icon descriptions.
- Buttons use 6px radii, a 36px desktop minimum, and 44px minimum on touch layouts. Primary create/save actions use system blue. Secondary edits use outlines. Deletion requires confirmation with a red final action.
- The directory is an aligned desktop table. Below 760px it becomes labelled, vertically stacked records with table semantics retained. Empty states explain the next action and filtered results offer a reset.
- Reports use anchored context, chapter tabs, legible rows, and nearby previous/next controls. Blocker impact and response stack below 900px. Plans separate action, owner, deadline, milestones, and support.
- Editors preserve values during failed saves. Long report forms offer focusable section shortcuts, a fixed title/close control, and a separate action footer. Errors receive focus and scroll into view. All sections remain mounted so browser validation can reach every field.
- Successful mutations announce the result in a dismissible status message. Initial loading uses page-shaped placeholders and a status label; failed refreshes preserve the last loaded view.

## Motion

Keep product transitions short and tied to navigation or state. Framer Motion provides reduced-motion variants; CSS menus drop their animation under reduced motion. Do not animate decorative layout widths. The landing illustration changes with an explicit chapter selection.

## Verification limits

The code audit and component/API interaction checks are documented in `docs/ui-ux-audit-2026-11-11.md`. Rendered desktop/mobile and screen-reader checks remain outstanding while local browser control is disabled. Do not describe source inspection as visual validation.

## Review lifecycle controls

Published and draft states have explicit text badges. Draft preview is editor-only and uses `?preview=1`; shared URLs omit it. A publish confirmation lists optional narrative gaps. Save success explains the next step. Month selectors preserve chapter context, and directory-return links restore filters within the same browser session.

Forms retain mounted sections for native validation and show optional labels, metric hints, inline errors, and recovery notices. Local recovery is explicitly distinguished from shared saved drafts. Commitments retain original owner/date/source and use a labelled outcome selector; adding an item to the incoming plan is explicit. Compare actual figures and show neutral deltas rather than assigning success to every increase.

Share controls explain which published version opens. A dedicated completion state marks the end of a review.


## Loading and motion behavior

Directory, progress, narrative chapters, and plans use skeletons shaped to the content they replace. Lazy route loading and initial API loading share the same skeleton component. Placeholders contain no sample figures or interactive-looking controls. Skeleton pulses stop after three cycles (4.2 seconds); the placeholders remain until content arrives. A ten-second wait adds an explanation and a retry action for API loading. No artificial loading delay or fabricated percentage is used.

The focal transition remains the report chapter indicator. Route/content transitions take 220–240ms, dialogs enter in 220ms and exit in 130ms, editor rows arrive in 160ms, and save confirmations enter/exit in 180ms. Primary async buttons show a labelled busy state and prevent repeated submission. Background refresh preserves readable content and uses a delayed, non-announced visual indicator to avoid repetitive screen-reader interruptions.

CSS animations pause when the page is hidden. Reduced motion uses static skeletons and busy markers, immediate dialog changes, and the existing spatial-motion alternatives. Loading labels, disabled controls, success messages, and error/retry feedback remain available. Rendered timing, mobile layout, and assistive-technology testing remain unverified while browser control is disabled.


## Mobile refinement

Phone layouts use an expandable full-width search field so the brand and query do not compete in a narrow header. The mobile navigation drawer locks page scrolling, starts focus on Close navigation, traps Tab within its controls, and restores trigger focus on dismissal. Both the drawer and covered report use explicit accessibility state.

A selected project's monthly records omit the repeated project column on mobile. The month is the primary link, state follows, and management actions sit behind a divider. Create report fills a toolbar row. Filters share two equal columns with constrained long labels.

Report chapter tabs retain readable 14px labels and horizontal scrolling; active-tab positioning remains automatic. Month selectors take a full row, share controls expand inline, metric labels wrap, accomplishment results move below titles, and workstreams/planned owners stack. Previous/next controls stay near the bottom while scrolling with safe-area spacing.

Wide report editors use the visible viewport height and keyboard offset when VisualViewport is available. Fields stack, save/cancel stay in the fixed action footer, and section shortcuts scroll horizontally. Compact confirmation dialogs remain centred within the visible viewport. Phone layout also applies in short landscape viewports on coarse-pointer devices up to 1050px wide. Tablet report headings wrap to avoid toolbar collisions.

Verification is limited to component interactions and source inspection: drawer focus/scroll locking, search focus/submission, and viewport resize variables are tested. Phone rendering, overflow measurements, touch gestures, virtual keyboards, Safari, and landscape orientation remain unverified while local browser access is disabled.


## Modal and field system

All editor, sign-in, publication, and deletion dialogs share `ModalHeader` and `src/styles/forms.css`. Retired page-specific editor rules are removed from the main stylesheet. Headers, report section shortcuts, and action footers remain outside the scrolling form body, so desktop and mobile controls do not depend on negative sticky offsets. Wide report dialogs keep their full-height phone layout and VisualViewport support.

Use 24px desktop dialog gutters and 20px mobile gutters, 16px field-grid gaps, and 24px between report sections. Desktop controls are at least 44px high; phone controls use at least 46px and 16px text. Labels use stronger foreground text; optional markers and helper text use subtle text. Focus, invalid, disabled, and read-only states are explicit for inputs, textareas, and selects. Empty helper elements are omitted. Repeated rows have a neutral surface and consistent removal controls.

Deletion titles and final actions use destructive color. Server errors use destructive text and surface tokens; recovery prompts use warning tokens. The modal header close control is labelled and disabled during submission. Sign-in also prevents Escape dismissal while its request is in flight.

Component checks cover footer separation, optional markers, native invalid-state feedback/recovery, editor sessions, conflicts, and the existing CRUD/publication cycle. The mechanical design detector reports no findings for the changed dialog/form targets. Rendered visual verification remains outstanding because browser access is disabled.


## Project dashboard navigation

The sidebar Projects link always targets `/landing/projects` and clears project/month context. This page is the all-project dashboard: one row per project, published report counts, editor-visible draft counts, latest published review month, and a link to open the project. Create project belongs in its dashboard toolbar. Individual project pages show monthly reviews and offer Edit project/Create report. Returning to a filtered report directory remains a separate report breadcrumb behavior.


## macOS appearance

A cool desktop surface frames an inset workspace with a translucent toolbar and grouped Finder-style sidebar. The landing page pairs a dark introduction with a live, generic chapter preview. The Projects dashboard places project counts beside its list heading. Reports use a sticky chapter rail on wide screens and scrollable tabs at narrower widths. Progress combines a single metric strip with a linear completion chart. Report editors open below the desktop toolbar and use the full available height on phones. Shared color and type tokens live in `src/styles/tokens.css`.
