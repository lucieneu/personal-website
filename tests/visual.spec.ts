// Screenshots of every page in both themes, compared with screenshots taken before a change: proof
// that the change (a refactor, say) doesn't change how the site looks. Runs with its own config:
// `npm run test:visual` (see the README).
import { expect, sitePaths, test } from './fixtures';

// The browser logs the 404 response of the 404 page itself as a console error.
test.use({ allowedConsoleErrors: [/404/] });

/** A screenshot name for a path: '/' → 'home', '/en/projects/' → 'en-projects'. */
const nameOf = (path: string) => path.replace(/^\/|\/$/g, '').replaceAll('/', '-') || 'home';

for (const colorScheme of ['light', 'dark'] as const) {
  test(`every page looks the same (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    const paths = [...(await sitePaths(page)), '/this-page-does-not-exist/'];
    for (const path of paths) {
      await page.goto(path);
      // Soft, so one changed page doesn't hide the others. Images are masked: lazy ones may
      // still be loading.
      await expect.soft(page).toHaveScreenshot(`${nameOf(path)}-${colorScheme}.png`, {
        fullPage: true,
        mask: [page.locator('img')],
      });
    }
  });
}
