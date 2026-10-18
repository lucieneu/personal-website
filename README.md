# personal-website

My personal website: a static [Astro](https://astro.build) site in Dutch (at `/`) and English (under `/en/`).

The plan for the site (goals, stack, design, build phases) is in [docs/project-spec.md](docs/project-spec.md).

## Getting started

Requires Node.js 22.22+ (CI and Cloudflare use Node 24, see `.node-version`) and pnpm, which
[Corepack](https://nodejs.org/api/corepack.html) installs at the version pinned in `package.json`.

```bash
corepack enable
pnpm install
pnpm dev
```

## Scripts

| Command             | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `pnpm dev`          | Start the dev server at `localhost:4321`             |
| `pnpm build`        | Build the static site to `dist/`                     |
| `pnpm preview`      | Serve the production build locally                   |
| `pnpm check`        | Type-check `.astro` and `.ts` files                  |
| `pnpm lint`         | Lint with ESLint                                     |
| `pnpm format`       | Format everything with Prettier                      |
| `pnpm format:check` | Check formatting without changing files (used in CI) |

## Where things live

- `src/layouts/BaseLayout.astro`: the page shell (sidebar and content card).
- `src/components/`: static components. React islands will go in `src/islands/` from phase 2.
- `src/styles/tokens.css`: colors, spacing and typography for both themes.
- `src/i18n/ui.ts`: all interface text, per language. Components read it through `t()` from `src/i18n/utils.ts`.
- `src/pages/`: Dutch pages; `src/pages/en/`: the same routes in English.

## Deploys

Every push runs `astro check`, ESLint, Prettier and the build in GitHub Actions (`.github/workflows/ci.yml`).

Hosting is on Cloudflare Workers (static assets only, configured in `wrangler.jsonc`) with
[Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/): `main` deploys to
production, and every other branch gets its own preview URL. One-time setup in the Cloudflare dashboard:

1. **Workers & Pages → Create → Import a repository**, and pick `lucieneu/personal-website`.
2. Project name `personal-website` (must match `name` in `wrangler.jsonc`).
3. Build command: `pnpm check && pnpm lint && pnpm build`, so nothing deploys when a check fails.
   Deploy command: `npx wrangler deploy` (default).
   Non-production branch deploy command: `npx wrangler preview` (default).
4. Turn on builds for non-production branches.
