---
name: Project Lens
description: A minimalist monthly project review with interactive charts and diagrams.
colors:
  background: "#ECECEF"
  foreground: "#141318"
  primary: "#6125EB"
  primary-foreground: "#FFFFFF"
  accent-on-dark: "#B59AFF"
  surface: "#F7F7F9"
  muted-foreground: "#595761"
  border: "#D5D4DA"
typography:
  display:
    fontFamily: "Instrument Sans Variable, sans-serif"
    fontWeight: 650
    letterSpacing: "-0.052em"
  body:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "16px"
    lineHeight: 1.5
rounded:
  surface: "12px"
  illustration: "16px"
  action: "100px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "48px"
  xxl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.action}"
    height: "44px"
---

# Project Lens design system

## Overview

A minimalist report with typography, charts, and diagrams carrying the content. Cloud Grey gives the typography and charts room. Jet Black frames the illustrations and dense data. Electric Violet directs the eye to the active chapter, a measured value, or the main action.

The landing page pairs the Project Lens wordmark with an interactive report chart. The review uses a consistent stage for charts, milestone graphics, a blocker and response diagram, and a plan timeline. The selected chapter marker travels across the navigation. Visitors set the pace with links and keys.

## Colors

| Token | Use |
| --- | --- |
| `background` | Cloud Grey, about 60% of the overall composition. Canvas and reading areas. |
| `foreground` | Jet Black, about 30%. Text, illustration frames, and chart surfaces. |
| `primary` | Electric Violet, about 10%. Main actions, active controls, and selected data. |
| `primary-foreground` | Button text on violet. |
| `accent-on-dark` | Links, chart marks, and focus outlines on dark surfaces. |
| `surface` | Cards, menus, and supporting figures. |
| `muted-foreground` | Secondary labels on light surfaces. |
| `border` | Dividers and container edges. |

## Typography

Use Instrument Sans for display and Geist for interface and figures. Scale home and chapter headings with the viewport. Use tabular numerals in comparisons and limit prose to about 65 characters per line.

## Layout

Use a 4 px spacing base. Cap desktop content at 1,312 px. Stack the composition at 760 px and switch to 16 px side gutters at 460 px. Give desktop chapters a consistent stage height so controls stay in place when the presenter advances.

## Shapes

Use small radii for charts and content frames, pill shapes for compact actions, and one-pixel rules for section boundaries. Use shadows for overlays. Draw illustrations from geometric marks, connectors, and icons. Keep labels, dates, and figures in HTML.

## Components

- **Buttons and links.** Violet for the main action, outlined secondary actions, and underlined text links where they appear in prose. Give icon-only controls accessible names and at least a 44 px hit area.
- **Selectors.** Label project and month controls. Keep months without a report visible with an explicit availability message.
- **Chapter navigation.** Show the four chapter names, current chapter, and previous and next actions. Use a moving accent line and a readable selected state.
- **Charts and timelines.** Put the value and unit on the visual. Use names and values alongside color. Put workstream counts, owners, and targets in supporting detail.
- **Details.** Expand inline with an explicit label and a visible expanded state. Keep reading order and keyboard focus predictable.

### Motion

| Interaction | Duration | Treatment |
| --- | --- | --- |
| Hover and press | 120–180 ms | Color, border, icon position, and short press feedback. |
| Controls and details | 180–260 ms | Compact fade and translation on entry and exit. |
| Chapter content | 280–460 ms | Outgoing content recedes. Incoming content arrives in the navigation direction. |
| Shared stage | 390–450 ms | Keep the chart frame anchored while its contents change. Move the chapter indicator along the navigation. |

Persistent chrome stays stable between chapters. Play an entrance and an exit when UI mounts or leaves. Pause the Three.js scene when offscreen, and render a static illustration for reduced motion or unavailable WebGL. Use `prefers-reduced-motion` to remove travel, scale, and timing dependencies throughout the interface.
