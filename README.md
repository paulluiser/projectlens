# Project Lens

Project Lens presents monthly progress, accomplishments, blockers, and incoming plans. Projects and reports can be created, edited, and deleted through the website.

## Run locally

Use Node.js 22.12 or later on the 22 line, or Node.js 24 or later.

```sh
npm ci
npm run dev
```

Open the Vite URL. Go to **Projects**, create a project, then create a monthly report. The report editor includes progress counts, workstreams, compliance measures, accomplishments, blockers, next-month actions, milestones, and support. Delete controls ask for confirmation.

Local development saves changes in `.local/workspace.json`. The file is created on the first change and survives server restarts. Set `LENS_DATA_FILE` to choose another path. Local editing is enabled by default. Set `LENS_EDITOR_PASSWORD` in `.env.local` to require editor sign-in locally.

## Shared deployment

Deploy the project to Vercel using the Vite framework preset and `dist` output directory. The `api` directory contains the server functions. Connect a **private Vercel Blob store** to the project and configure these server environment variables.

| Variable | Purpose |
| --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Access to the connected private Blob store |
| `LENS_EDITOR_PASSWORD` | Shared editor password |

Use a long editor password and give it to the people who should manage reports. Sign in from the Projects page. The browser receives an HttpOnly session cookie valid for eight hours. Readers can open reports directly. Editor sessions authorize changes across the workspace.

The shared workspace is stored as JSON at `project-lens/workspace.json` in the Blob store. Reads bypass the Blob cache. Conditional writes reject stale versions so one editor cannot silently overwrite another editor’s save. Open project pages refresh on focus and every 15 seconds while visible. Refresh pauses while an editor form is open. If a save conflicts, the form preserves its values and offers an explicit reload of the latest saved record. [Vercel Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk)

Production editing becomes available after both variables are configured. The initial workspace comes from the versioned JSON files in `data/projects/`. Subsequent website changes save to the runtime JSON store. Keep the same Blob store connected across deployments to retain those changes.

## Reports and links

The canonical chapter route is `/landing/projects/<project>/<YYYY-MM>/<contents>`. For example, `/landing/projects/simsdotnet/2026-09/progress` opens September progress. Project IDs remain stable when names are edited. Each project has one report per month. The incoming month’s name is derived from the reporting month, and planned action dates must fall within that incoming month.

The product-only landing page introduces Project Lens. The initial September report includes its October plan. October begins as an awaiting-report entry and can be filled through **Create report**.

Inside a report, choose **Present** to focus the review. Use the left and right arrows to move between chapters and Escape to exit. Earlier `/reports` links redirect to the corresponding current route.

## Verification

```sh
npm test
npm run build
npm run preview
```

Tests cover CRUD, persistence, malformed input, count and date validation, password sessions, stale saves, and concurrent conditional writes. Vite preview includes the same local API as development.

See [the PRD](PRODUCT.md), [design system](DESIGN.md), and [.env.example](.env.example) for product constraints, visual rules, and server configuration.

## Draft, publish, and follow through

1. Create a project, then choose **Create report**. **Save draft** keeps report content visible only to editors. Saving opens the draft preview.
2. In the report editor, use **Bring in previous plan** to import the prior calendar month's published action list. Mark each commitment completed, carried over, changed, or dropped and add context. **Add to next month’s plan** creates a planned action with the incoming month's first day as a starting date; adjust it before saving.
3. Preview the report, then choose **Publish report**. The completeness checklist suggests optional additions and allows publication when sections are intentionally empty. Readers see the published snapshot. Later edits save a separate draft; publication replaces the snapshot.

Progress comparisons use the preceding calendar month's published figures. Changes in project completion are expressed in percentage points. No prior report means no comparison, not a zero baseline. Shared links always open the publication and omit the editor preview flag.

Unsaved forms keep a recovery copy in this browser's local storage. Closing a changed editor offers to keep or discard that copy; a later editor session offers to restore it. Browser page-leave warnings cover refresh/closing the page. Browser history navigation can leave the route, but the recovery copy remains. Recovery copies do not transfer across devices; **Save draft** sends work to shared server storage. If browser storage is unavailable, the editor displays a warning. Saved work is cleared from local recovery.

In **Present**, arrow keys navigate chapters, Escape exits, and **Finish review** opens the end screen.

The automated suite includes a JSDOM component/API review-cycle check using temporary server JSON, with no mutation of the sample workspace. This checks interactions and persistence, not browser layout. Live Blob and rendered visual verification remain outstanding.

The `@vercel/cli-config` Zod dependency is overridden to 4.6.6 to address the constrained-collection memory advisory without downgrading the Blob SDK. `npm audit` reports zero vulnerabilities after this override.


## Loading and interaction feedback

Loading screens match the directory and report chapter layouts. Long initial requests offer a retry after ten seconds; background refresh keeps current data on screen. Saves, sign-in, publishing, and deletion show disabled busy buttons. Dialogs, chapter navigation, editor rows, and success messages have short transitions. Reduced motion keeps feedback static, and CSS animations pause in hidden tabs.

The component test holds requests to verify initial skeletons, busy-submit protection, content arrival, report skeleton selection, and slow-load retry behavior. These checks do not verify rendered animation smoothness or layout.
