# Cloudflare setup

The one-time setup in the Cloudflare dashboard that hosting this site needs. All of it was done in
October 2026; this page is the reference for doing it again (a new account, a new domain, or a
deleted Worker). How deploys work day to day is in the README, under Deploys.

The repo itself holds the rest of the configuration, so it needs no dashboard steps:
`wrangler.jsonc` (serve `dist/` as static assets, the reller.nl custom domain, the workers.dev
address and preview URLs) and `public/_headers` (cache headers for `/_astro/*`).

## Workers Builds

Workers Builds builds every push from GitHub: `main` deploys to production, and every other branch
gets its own preview URL.

1. **Workers & Pages → Create → Import a repository**, and pick `lucieneu/personal-website`.
2. Project name `personal-website` (must match `name` in `wrangler.jsonc`).
3. Build command: `npm run verify`, the same checks as CI, so nothing deploys when a check fails.
   Deploy command: `npx wrangler deploy` (default).
   Non-production branch deploy command: `npx wrangler preview` (default).
4. Turn on builds for non-production branches.
5. In the Worker's **Domains** tab, under **Worker URL**, turn on **Preview**. `"preview_urls": true`
   in `wrangler.jsonc` does the same, but only takes effect on a production deploy
   (`wrangler deploy`), so without this switch previews have no URL until `main` has deployed once.

## Domain (reller.nl)

The reller.nl zone's DNS is on Cloudflare; it has to be in the same account as the Worker.

1. **DNS → Records**: delete the `A` and `AAAA` records for `reller.nl` (they pointed to the
   registrar's parking page), so the custom domain can create its own record without a conflict.
   Keep the `www` record, proxied.
2. Deploy `main` (or, in the Worker's **Domains** tab, add `reller.nl` as a custom domain).
   Cloudflare creates the DNS record and the certificate.
3. **Rules → Redirect Rules**: create one from the template _Redirect from WWW to root_, so
   `www.reller.nl` redirects to `https://reller.nl` (301, keeping the path).
4. **SSL/TLS → Edge Certificates**: turn on **Always Use HTTPS**.

Cloudflare issues the certificate (Google Trust Services, for `reller.nl` and `*.reller.nl`) and
renews it by itself.

## Checking it

Both redirects are a 301 that keeps the path and the query:

```bash
curl -sI "http://reller.nl/about/?x=1"
```

```bash
curl -sI "https://www.reller.nl/about/?x=1"
```

Both answer `Location: https://reller.nl/about/?x=1`. `https://reller.nl/version.json` shows the
commit that production serves.

## Zone settings that are not turned on

As of Oct 21, 2026. Both are optional, and the owner's call.

- **Minimum TLS version** (SSL/TLS → Edge Certificates): Cloudflare's default still accepts
  TLS 1.0 and 1.1. Setting it to TLS 1.2 turns those off.
- **HSTS** (SSL/TLS → Edge Certificates → HTTP Strict Transport Security): off, so reller.nl
  sends no `Strict-Transport-Security` header.

## Differences between reller.nl and workers.dev

Cloudflare adds a few things on the reller.nl zone that the workers.dev address doesn't get:

- A bot-detection script (`/cdn-cgi/challenge-platform/…`) in every HTML page. It lowers
  Lighthouse Best Practices (it uses deprecated APIs).
- Page Shield adds a report-only Content Security Policy to a sample of responses. Its reports show
  up as console errors, which fails the Playwright tests (they fail on any console error) when they
  run against reller.nl.

CI tests production at `https://personal-website.lucien-hilversum.workers.dev`, which has
neither. Turning them off, in the zone's Security settings, is the owner's call.
