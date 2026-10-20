// With a larger default font size in the browser settings (not zoom), the whole layout grows
// with the text: sizes and spacing are in rem, the breakpoint in em. Chromium can emulate the
// setting through DevTools; the other engines are covered by the default-size tests.
import type { Page } from '@playwright/test';
import { expect, languageSwitch, mainNav, sitePaths, test } from './fixtures';

// 150% of the usual 16px.
const fontSize = 24;

async function useLargerFont(page: Page) {
  const devtools = await page.context().newCDPSession(page);
  await devtools.send('Page.setFontSizes', { fontSizes: { standard: fontSize, fixed: fontSize } });
}

test.describe('with a larger default font size', () => {
  test.beforeEach(({ browserName }) =>
    test.skip(browserName !== 'chromium', 'only Chromium can change the default font size'),
  );

  test('every page grows with the text, without overlap or sideways scrolling', async ({
    page,
    isMobile,
  }) => {
    await useLargerFont(page);
    for (const path of await sitePaths(page)) {
      await page.goto(path);
      const layout = await page.evaluate(() => {
        const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
        return {
          rootFontSize: getComputedStyle(document.documentElement).fontSize,
          scrollWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
          header: box('header').toJSON() as DOMRect,
          card: box('#content').toJSON() as DOMRect,
        };
      });
      expect(layout.rootFontSize, path).toBe(`${fontSize}px`);
      expect(layout.scrollWidth, `${path} scrolls sideways`).toBeLessThanOrEqual(
        layout.viewportWidth,
      );
      // The header (the sidebar on desktop) and the card never overlap.
      const { header, card } = layout;
      const apart =
        header.right <= card.left || header.bottom <= card.top || card.right <= header.left;
      expect(apart, `${path}: header and card overlap`).toBe(true);

      // The navigation stays on screen; on phones the island's links fit on one row.
      const nav = (await mainNav(page).boundingBox())!;
      expect(nav.x, `${path}: navigation off screen`).toBeGreaterThanOrEqual(0);
      expect(nav.x + nav.width, `${path}: navigation off screen`).toBeLessThanOrEqual(
        layout.viewportWidth,
      );
      if (isMobile) {
        const link = (await mainNav(page).getByRole('link').first().boundingBox())!;
        expect(nav.height, `${path}: the island wraps`).toBeLessThan(2 * link.height);
      }

      // "NL / EN" stays on one line: the switch is no taller than one of its links.
      const languages = (await languageSwitch(page).boundingBox())!;
      const option = (await languageSwitch(page).getByRole('link').boundingBox())!;
      expect(languages.height, `${path}: the language switch wraps`).toBeLessThanOrEqual(
        option.height + 1,
      );
    }
  });

  test('the one-column layout starts at a wider window', async ({ page, isMobile }) => {
    test.skip(isMobile, 'phones always get the one-column layout');
    // 1280px is wider than 64em at 16px (1024px), but narrower than 64em at 24px (1536px).
    await page.setViewportSize({ width: 1280, height: 800 });
    await useLargerFont(page);
    await page.goto('/');
    expect(await mainNav(page).evaluate((nav) => getComputedStyle(nav).position)).toBe('fixed');
  });
});
