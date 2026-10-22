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
| `npm run test:e2e`     | Playwright smoke tests (see below)                                      |
| `npm run test:visual`  | Compare screenshots of every page with earlier ones (see below)         |

## Where things live

- `src/layouts/BaseLayout.astro`: the page shell (sidebar, content card, footer, SEO tags and the
  view transitions).
- `src/components/`: static components, built up from small to large (atomic design). Reuse these,
  or add a small one, rather than repeating markup or CSS. A component leaves the space around it
  to the one that places it: the parent passes a `class` for margins, and the component puts that
  `class` (with any other attributes) on its root element. React islands will go in
  `src/islands/` from phase 2. Each component's styles are in a CSS Module next to it
  (`Link.module.css`), and what a loop renders per item is a component of its own.
  - `atoms/`: the smallest pieces: `Link`, `List`, `Icon` (the base of the icons in
    `atoms/icons/`, one component per icon), `IconButton`, `DateTime`,
    `CoverImage`, `Tag`, `VisuallyHidden`.
  - `molecules/`: small groups of atoms: `ProjectCard`, `Tags`, `MetaList` and `MetaItem`,
    `MainNav` and `NavItem`, `LanguageSwitch` and `LanguageOption`, `ThemeToggle`,
    `SocialLinks` and `LinkItem`, `ExperienceItem`, `NotFoundMessage`.
  - `organisms/`: whole parts of the page: `Sidebar`, `ContentCard`, `SiteFooter`,
    `ProjectList`, `ExperienceTimeline`, and the `<head>` parts `Seo` and `ThemeScript`.
  - `views/`: one view per page, shared by the Dutch and English page files.
- `src/lib/`: the logic (dates, navigation, projects, experience, SEO, the theme switch);
  `src/i18n/utils.ts` has the language helpers. Components only pass props and render.
- `src/content/`: projects (`projects/nl/` and `projects/en/`, one MDX file per language) and work
  experience (`experience.json`). The schemas are in `src/content.config.ts`.
- `src/styles/`: `tokens.css` (colors, spacing and typography for both themes), `global.css` and
  `transitions.css` (page transitions and the theme switch).
- `src/i18n/ui.ts`: all interface text, per language. A component gets the page's language and
  `t()` with `const { lang, t } = pageLang(Astro.currentLocale)` from `src/i18n/utils.ts`, rather
  than a `lang` prop. The helpers that don't need Astro are in `src/i18n/paths.ts`, which the
  build check uses too.
- `src/pages/`: Dutch pages; `src/pages/en/`: the same routes in English. `404.astro` is one page
  for both languages.
- `src/integrations/check-translations.ts`: fails the build when a page or project exists in only one
  language (drafts excepted, since they aren't built).
- `tests/`: Playwright tests.

Files in `src/` are imported with the `@/` alias set in `tsconfig.json`
(`import Link from '@/components/atoms/Link.astro'`), also from the same folder. Only a
component's own CSS Module is imported with `./` (`./Link.module.css`). ESLint's built-in
`no-restricted-imports` flags any other relative import in `src/` (it doesn't see a dynamic
`import()` or the imports in `.mdx` files).

## Adding a project

Add `src/content/projects/nl/<slug>.mdx` and `src/content/projects/en/<slug>.mdx` with the same
file name, and put the cover image in `src/assets/projects/`. The frontmatter fields are checked at
build time; `draft: true` keeps a project out of the production build. Projects with
`featured: true` appear on the home page (the newest 3).

## Tests

`npm run test:e2e` builds the site, serves it locally and runs the Playwright tests in Chromium,
Firefox, WebKit and two phone profiles. To test a deployed site instead, set `BASE_URL`:

```bash
BASE_URL=https://<branch>-personal-website.lucien-hilversum.workers.dev npm run test:e2e
```

The first time, install the browsers with `npx playwright install`.

## Checking that a change changes nothing

For a refactor, `npm run test:visual` shows that every page still looks the same. It takes a
full-page screenshot of every page in both themes, on a desktop, a tablet and a phone, and compares
it with the one taken before the change (Playwright's `toHaveScreenshot()`). Take the screenshots
on `main` first, then compare on your branch:

```bash
git switch main && npm run test:visual -- --update-snapshots
```

```bash
git switch <branch> && npm run test:visual
```

Each run builds and serves the checkout it's on. Differences show up side by side in the report
(`npx playwright show-report`). Images are masked because lazy ones may still be loading.

The browser runs in Playwright's official Docker image, so Docker Desktop has to be running.
Everything else runs here, and nothing leaves the machine: the browser reaches `localhost` through
Playwright's connection. The first run downloads the image. The container (`playwright-visual`) keeps
running after a run, and the next run reuses it; `docker stop playwright-visual` removes it. The screenshots stay local (`tests/visual.spec.ts-snapshots/` is ignored). To compare two deploys instead, set `BASE_URL`: production with `--update-snapshots`, then
the branch preview. For the HTML, copy `dist/` after building `main` and `diff -r` it with the
branch's.

## Deploys

Every push runs `npm run verify` (`astro check`, ESLint, Prettier and the build) in GitHub Actions
(`.github/workflows/ci.yml`). A second job then waits until Cloudflare has deployed that commit
(the deploy reports its commit at `/version.json`) and runs the Playwright tests against it: the
branch preview, or production for `main`.

Hosting is on Cloudflare Workers (static assets only, configured in `wrangler.jsonc`) with
[Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/): `main` deploys to
production, and every other branch gets its own preview URL.

Production is [reller.nl](https://reller.nl), a Worker custom domain set in `wrangler.jsonc`
(`routes`), so `wrangler deploy` attaches it. It's also at
`https://personal-website.lucien-hilversum.workers.dev`, which CI tests and whose canonical URLs
point to reller.nl. A branch preview is at
`https://<branch>-personal-website.lucien-hilversum.workers.dev`. Previews are public but send
`X-Robots-Tag: noindex`, so search engines skip them.

The one-time setup in the Cloudflare dashboard (Workers Builds and the reller.nl domain, all done)
is in [docs/cloudflare-setup.md](docs/cloudflare-setup.md), as a reference for setting it up again.
