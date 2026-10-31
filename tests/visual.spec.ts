// Screenshots of every page in both themes, compared with screenshots taken before a change: proof
// that the change (a refactor, say) doesn't change how the site looks. Runs with its own config:
// `npm run test:visual` (see the README).
import { readFileSync } from 'node:fs';
import { expect, pathsInSitemap, test } from './fixtures';

// One test per page, so they run in parallel and a failure names the page. Playwright needs the
// list before the server starts, so it comes from the build that `npm run test:visual` makes first.
const sitemap = readFileSync(new URL('../dist/sitemap-0.xml', import.meta.url), 'utf8');
const paths = [...pathsInSitemap(sitemap), '/this-page-does-not-exist/'];

/** A screenshot name for a path: '/' → 'home', '/en/projects/' → 'en-projects'. */
const nameOf = (path: string) => path.replace(/^\/|\/$/g, '').replaceAll('/', '-') || 'home';

// The browser logs the 404 response of the 404 page itself as a console error.
test.use({ allowedConsoleErrors: [/404/] });

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(colorScheme, () => {
    for (const path of paths) {
      test(`${path} looks the same`, async ({ page }) => {
        // The site is dark unless light is chosen with the toggle, which stores the choice.
        await page.addInitScript((theme) => localStorage.setItem('theme', theme), colorScheme);
        await page.goto(path);
        // The starfield is hidden: its stars are random and moving.
        await page.addStyleTag({ content: '[data-starfield] { visibility: hidden; }' });
        // Images are masked: lazy ones may still be loading.
        await expect(page).toHaveScreenshot(`${nameOf(path)}-${colorScheme}.png`, {
          fullPage: true,
          mask: [page.locator('img')],
        });
      });
    }
  });
}
