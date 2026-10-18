# personal-website

My personal website: a static [Astro](https://astro.build) site in Dutch (at `/`) and English (under `/en/`).

The plan for the site (goals, stack, design, build phases) is in [docs/project-spec.md](docs/project-spec.md).

## Getting started

Requires Node.js 22.22.3+, 24.16+ or 26.3+ (the range ESLint's Astro plugin supports; CI and
Cloudflare use Node 24, see `.node-version`) and the npm that comes with it.

```bash
npm install
npm run dev
```

`npm install` also sets up a Git pre-push hook ([Husky](https://typicode.github.io/husky/), in
`.husky/pre-push`) that runs `npm run verify` before every push, so a push that would fail CI stops
on your machine. It checks the files on disk, uncommitted changes included. To skip it once, use
`git push --no-verify`.

## Scripts

| Command                | What it does                                                            |
| ---------------------- | ----------------------------------------------------------------------- |
| `npm run dev`          | Start the dev server at `localhost:4321`                                |
| `npm run build`        | Build the static site to `dist/`                                        |
| `npm run preview`      | Serve the production build locally                                      |
| `npm run check`        | Type-check `.astro` and `.ts` files                                     |
| `npm run lint`         | Lint with ESLint                                                        |
| `npm run format`       | Format everything with Prettier                                         |
| `npm run format:check` | Check formatting without changing files                                 |
| `npm run verify`       | Check, lint, format check and build (CI, deploys and the pre-push hook) |

## Where things live

- `src/layouts/BaseLayout.astro`: the page shell (sidebar and content card).
- `src/components/`: static components. React islands will go in `src/islands/` from phase 2.
- `src/styles/tokens.css`: colors, spacing and typography for both themes.
- `src/i18n/ui.ts`: all interface text, per language. Components read it through `t()` from `src/i18n/utils.ts`.
- `src/pages/`: Dutch pages; `src/pages/en/`: the same routes in English.

## Deploys

Every push runs `npm run verify` (`astro check`, ESLint, Prettier and the build) in GitHub Actions
(`.github/workflows/ci.yml`).

Hosting is on Cloudflare Workers (static assets only, configured in `wrangler.jsonc`) with
[Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/): `main` deploys to
production, and every other branch gets its own preview URL. One-time setup in the Cloudflare dashboard:

1. **Workers & Pages → Create → Import a repository**, and pick `lucieneu/personal-website`.
2. Project name `personal-website` (must match `name` in `wrangler.jsonc`).
3. Build command: `npm run verify`, the same checks as CI, so nothing deploys when a check fails.
   Deploy command: `npx wrangler deploy` (default).
   Non-production branch deploy command: `npx wrangler preview` (default).
4. Turn on builds for non-production branches.
