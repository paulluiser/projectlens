# Project Lens

<!-- impeccable:product-schema 1 -->

## Platform

Web. Project Lens supports a live monthly review followed by self-guided browsing of the same report.

## Users

A presenter walks an audience through the month’s results, blockers, and next month’s priorities. Afterward, readers can open the shared report and jump directly to a chapter. The sample source describes the audience as internal management.

## Stack

React, shadcn/ui, Tailwind CSS, Three.js, and Framer Motion. The prototype will use Vite to produce a static build deployable to Vercel. Versioned JSON is the source for the project catalog and report contents. Editors can change the files on any device with access to the Git repository. A Vercel deployment serves the same published version across devices.

## Product requirements

1. The landing page introduces Project Lens and provides a direct path to the September 2026 review for SIMSDotNet.
2. The four report chapters are Progress, Accomplishments, Blockers, and Next Month. The last chapter names the incoming month explicitly. Show the most important evidence as charts, diagrams drawn in the interface, and short labels. Put supporting detail one action away.
3. Use /landing for the home page, /landing/projects for the library, and /landing/projects/<project>/<month>/<contents> for chapter links. The library lets visitors choose a project and a month. A project/month pair identifies a report independently of the selected chapter. Opening a shared link, refreshing, and using browser Back or Forward preserve the selected context.
4. The same review supports previous and next controls and keyboard arrows for presenting. A chapter list supports direct jumps while browsing. Moving between chapters carries a shared visual element forward and animates entering and exiting content. Reduced motion gives the same controls and information with immediate changes.
5. Ship the SIMSDotNet September review from the September 2026 closeout deck (v4). Display the plan for October inside the September review. Show October as awaiting a report in the library until the user supplies October results.

## Source and decisions

- The working source is `SIMSDotNet_Monthly_Planning_Summary_September_2026_v4.pptx`. It documents September results and October plans in one deck. The earlier planning revision documents August wins and September targets.
- Slide 5 lists 566.75 September hours, 2,742.25 prior hours, and 3,309.00 running hours. Slide 1 lists 3,309.25 running hours. Use 566.75 as the September metric and record both running totals in the detail view.
- The prototype uses one actual project, with the catalog structured to hold multiple projects. Preview and build from the local workspace. Actual hosting and audience access are open decisions.

## Acceptance

- The site renders its graphs and illustrations from HTML, CSS, and Three.js geometry. Visual assets are removed.

- A presenter can open the September review from the landing page, visit all four chapters, and return to the library using mouse or keyboard.
- A reader can open a chapter directly from a shared URL, inspect the underlying figures, and discover October’s planned work inside the September report.
- The interface is legible at phone and desktop widths. Report content and navigation remain usable with reduced motion or unavailable WebGL.
- `npm run build` produces the static site in `dist/` with URL fallback configured for Vercel.
