// The card starfield: starts after the page is shown, keeps running across navigations, follows
// the theme, and stays off in the exceptions (reduced motion, Data Saver).
import { clickLink, expect, test } from './fixtures';

const starfield = (page: import('@playwright/test').Page) => page.locator('[data-starfield]');

/** Whether both canvases (the fixed and the moving stars) have stars drawn on them. */
const hasStars = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLCanvasElement>('[data-starfield] canvas')].every((canvas) => {
      const { data } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
      return data.some((value, i) => i % 4 === 3 && value > 0);
    }),
  );

test('the starfield runs behind the page and is hidden from assistive technology', async ({
  page,
}) => {
  await page.goto('/');
  await expect(starfield(page)).toHaveAttribute('data-state', 'running');
  await expect(starfield(page)).toHaveAttribute('aria-hidden', 'true');
  expect(await hasStars(page)).toBe(true);
  // Clicks go through it to the page.
  await expect(starfield(page)).toHaveCSS('pointer-events', 'none');
});

test('the starfield keeps running across navigations', async ({ page }) => {
  await page.goto('/');
  await expect(starfield(page)).toHaveAttribute('data-state', 'running');
  await page.evaluate(() => {
    (document.querySelector('[data-starfield]') as HTMLElement & { __kept?: boolean }).__kept =
      true;
  });
  await clickLink(page, '/en/');
  await clickLink(page, '/en/about/');
  // The same element, not a new one that started over.
  expect(
    await page.evaluate(
      () =>
        (document.querySelector('[data-starfield]') as HTMLElement & { __kept?: boolean }).__kept,
    ),
  ).toBe(true);
  await expect(starfield(page)).toHaveCount(1);
});

test('the stars follow the theme', async ({ page }) => {
  await page.goto('/');
  await expect(starfield(page)).toHaveAttribute('data-state', 'running');
  const color = () => starfield(page).evaluate((element) => getComputedStyle(element).color);
  const before = await color();
  await page.locator('[data-theme-toggle]').click();
  await expect.poll(color).not.toBe(before);
});

test.describe('with prefers-reduced-motion: reduce', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the starfield is one still frame', async ({ page }) => {
    await page.goto('/');
    await expect(starfield(page)).toHaveAttribute('data-state', 'still');
    expect(await hasStars(page)).toBe(true);
  });
});

test('with Data Saver on, the page keeps its plain background', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', { value: { saveData: true } });
  });
  await page.goto('/');
  // Longer than the 1 s fallback for browsers without requestIdleCallback.
  await page.waitForTimeout(1500);
  await expect(starfield(page)).not.toHaveAttribute('data-state');
});
