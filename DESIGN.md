---
name: Project Lens
description: A survey-sheet reporting workspace. Each monthly review reads as a route across a map.
colors:
  paper: "#FFFFFF"
  ground: "#F3F5F2"
  margin: "#E9EEE8"
  ink: "#1A2420"
  ink-soft: "#4B5953"
  contour: "#B4542A"
  contour-soft: "#E8C9B6"
  grid: "#E3E8E2"
  border: "#D4DBD3"
  line-strong: "#B8C2BB"
  control-line: "#C3CCC5"
  control-line-hover: "#A4AFA8"
  margin-hover: "#DDE4DC"
  selection: "#CFE1F3"
  survey: "#135FA8"
  survey-deep: "#0E4B86"
  water: "#E2EDF7"
  water-light: "#F2F7FB"
  contour-wash: "#F8E9E1"
  ochre-ink: "#5C4A2A"
  mark-violet: "#4A3F8F"
  mark-violet-wash: "#ECEAF6"
  woodland: "#2C6A3C"
  woodland-wash: "#E5EFE2"
  ochre: "#855800"
  ochre-wash: "#FBEFD6"
  map-red: "#B3261E"
  night: "#11201B"
  night-raised: "#1A2D26"
  night-contour: "#E08A5C"
typography:
  display: { fontFamily: "Source Sans 3 Variable", fontSize: "86px", fontWeight: 700, lineHeight: 1, letterSpacing: "-0.045em" }
  presentation: { fontFamily: "Source Sans 3 Variable", fontSize: "112px", fontWeight: 650, lineHeight: 0.98 }
  page-title: { fontFamily: "Source Sans 3 Variable", fontSize: "32px", fontWeight: 650, lineHeight: 1.15 }
  reading: { fontFamily: "Source Sans 3 Variable", fontSize: "52px", fontWeight: 650, lineHeight: 1 }
  section: { fontFamily: "Source Sans 3 Variable", fontSize: "17px", fontWeight: 650, lineHeight: 1.3 }
  body: { fontFamily: "Source Sans 3 Variable", fontSize: "15px", fontWeight: 400, lineHeight: 1.55 }
  label: { fontFamily: "Source Sans 3 Variable", fontSize: "13px", fontWeight: 600, lineHeight: 1.4 }
rounded:
  indicator: "2px"
  bar: "3px"
  chip: "4px"
  control: "6px"
  mark: "7px"
  inner: "8px"
  panel: "10px"
  dialog: "12px"
components:
  button-primary: { backgroundColor: "{colors.survey}", textColor: "{colors.paper}", rounded: "{rounded.control}", height: "38px" }
  button-outline: { backgroundColor: "{colors.paper}", textColor: "{colors.ink}", rounded: "{rounded.control}", height: "38px" }
  panel: { backgroundColor: "{colors.paper}", rounded: "{rounded.panel}" }
  chip-success: { backgroundColor: "{colors.woodland-wash}", textColor: "{colors.woodland}", rounded: "{rounded.chip}" }
---

# Project Lens design system

A monthly review is a surveyed route. Each report is a sheet of a survey map: where the project stood, what ground it covered, where it crossed hard terrain, and the route ahead. The world lends type, palette, density and one signature move. Layout, navigation and controls stay familiar: sidebar, header search, breadcrumbs, chapter tabs, tables and dialogs.

## Palette and state

White map paper on a cool ground. Ink carries text; ink-soft carries supporting text (6.7:1 on ground). Survey blue is the only action and selection color. Contour sienna draws hairlines, summit lines and section icons, never body text. Woodland green marks completion, ochre marks carry-over and blockers, map red is reserved for destructive confirmation. State color always comes with a text label or icon. The presentation index switches to a night sheet with contour-orange rings.

## Type

Source Sans 3 (self-hosted variable) for everything. It is humanist and close to cartographic lettering, with tabular figures for every quantity. Display sizes use tight negative tracking; labels stay in sentence case. No eyebrows or all-caps labels.

## Signature: the route

- **Progress chapter**: completed tasks drawn as an elevation profile. One station per published month (starting at the end of the previous month), a contour-hatched fill under the walked ground, a you-are-here marker, a dashed remaining climb, and a sienna summit line at the project total. The chart width follows its panel so axis labels stay readable on phones. The figure is also stated in text, and the SVG carries an accessible summary.
- **Landing**: a live Three.js contour terrain. A route is draped over the hills, with one numbered pin per chapter. The map key below selects a pin. Without WebGL, an SVG contour drawing remains. The landing page shows generic chapter labels only and never loads project data.
- **Presentation index**: concentric contours around the project summit, with climbed rings drawn in contour orange.
- **Chapter tabs**: a single survey-blue marker slides between tabs (shared layout element).
- **Brand mark**: two contours and a trig point, drawn inline.

## Layout

56px header with translucent paper, 232px sage sidebar (208px under 1050px, overlay drawer under 760px). Gutters are 40px on desktop and 16px on phones. Panels are white with a 1px border and 10px radius; tables sit inside one bordered panel and stack as labelled records on phones. Accomplishments use summit marks; blockers use ochre-washed blocks paired with green responses.

## Motion

One authored moment per surface: the landing reveal plus terrain, and the route drawing itself on Progress. Route and content transitions run 220–240ms. Dialogs enter in 220ms and exit in 130ms. Reduced motion removes the terrain drift, pin pulse, route drawing and panel entrances, and keeps every control and figure.

## Retained behavior

Skeletons are shaped like the content they replace and stop pulsing after three cycles. A slow load adds a retry action after ten seconds. Dialogs share `ModalHeader` and `src/styles/forms.css`. The header holds compact, expand and close controls, and section shortcuts and the action footer sit outside the scroll area. Phone editors use the visible viewport height. Drafts, previews, publishing, sharing and presentation keep the behavior described in PRODUCT.md.
