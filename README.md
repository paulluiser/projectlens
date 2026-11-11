# Project Lens

Project Lens is a monthly review website. The sample covers SIMSDotNet’s September 2026 progress, accomplishments, blockers, and October plan.

## Run locally

Run these commands with Node.js 22.12 or later on the 22 line, or Node.js 24 or later.

```sh
npm ci
npm run dev
```

Open the Vite URL printed in the terminal. Inside a review, choose **Present** to focus the view. Use the left and right arrows to move between chapters, and Escape to exit presentation mode. Each chapter has its own shareable URL.

## Reports

Each report lives in `data/projects/<project>/<YYYY-MM>/report.json`. The project catalog is `data/projects/catalog.json`.

To add a month, copy the September JSON as a starting point, add the month to the catalog, and register the new report import in `src/lib/reports.mjs`. The October entry currently links to the plan in the September review while awaiting October results.

The canonical chapter route is `/landing/projects/<project>/<YYYY-MM>/<contents>`. For example, `/landing/projects/simsdotnet/2026-09/progress` opens the September progress chapter. Earlier `/reports` links redirect to the corresponding new route.

For cross-device editing, connect the Git repository to a shared remote. Commit and push report edits from any device with repository access. Connect that repository to Vercel to deploy updates on push. Readers can open the same deployment URL from any device.

## Build and deploy

```sh
npm test
npm run build
npm run preview
```

Import the project into Vercel using the Vite framework preset and the `dist` output directory. The included `vercel.json` routes direct report links to the app. There are no environment variables or database services to configure. [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)

See [the PRD](PRODUCT.md) and [design system](DESIGN.md) for the sample’s requirements and visual rules.
