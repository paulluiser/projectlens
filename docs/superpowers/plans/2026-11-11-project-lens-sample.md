# Project Lens sample implementation

**Goal** Build an illustrated, navigable September 2026 review for SIMSDotNet.

**Architecture** Vite serves a React application with shareable project, month, and chapter routes. A local catalog supplies report data. The visual layer uses shadcn/ui controls, Tailwind tokens, Framer Motion, and a small Three.js scene.

**Spec** [Product requirements](../../../PRODUCT.md) and [Design system](../../../DESIGN.md).

## Tasks

- [x] Test project/month resolution and chapter navigation with Node’s test runner. Define `findReport(project, month)`, `reportPath(project, month, chapter?)`, and a four-chapter index. Verify an unpublished or unknown report produces a usable empty state.
- [x] Translate the September closeout slides into the local catalog, including the October plan, workstream counts, and running-hours discrepancy. Verify the figures against the source.
- [x] Build the landing page, report library, and four chapter views. Wire deep links, browser history, filter selection, detail disclosures, presentation controls, and keyboard navigation.
- [x] Apply the palette, typography, and illustrations. Add shared chapter motion, static fallbacks, and reduced-motion handling.
- [x] Run the test suite and production build. Inspect desktop and mobile layouts, exercise presenter and browser flows, and verify that a deep link loads directly from the production preview.
