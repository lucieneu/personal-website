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
  // On a first view the stars fade in one by one, so the first ones take a moment.
  await expect.poll(() => hasStars(page)).toBe(true);
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

/**
 * Records, every frame for `ms` milliseconds from now, whether the hand-off canvas (the two
 * stars of the card hand-off, above the card) has anything on it. Await the result.
 */
const recordHandoff = (page: import('@playwright/test').Page, ms = 4200) =>
  page.evaluate((duration) => {
    const w = window as unknown as { __handoff: Promise<boolean[]> };
    w.__handoff = new Promise((resolve) => {
      const canvas = document.querySelector<HTMLCanvasElement>('[data-handoff]')!;
      const frames: boolean[] = [];
      const until = performance.now() + duration;
      const sample = () => {
        const { data } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
        frames.push(data.some((value, i) => i % 4 === 3 && value > 0));
        if (performance.now() < until) requestAnimationFrame(sample);
        else resolve(frames);
      };
      requestAnimationFrame(sample);
    });
  }, ms);
const handoffFrames = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __handoff: Promise<boolean[]> }).__handoff);

test('on a navigation one star leaves and one returns, above the card, and then it is clear', async ({
  page,
}) => {
  await page.goto('/');
  await expect(starfield(page)).toHaveAttribute('data-state', 'running');
  await expect(page.locator('[data-handoff]')).toHaveCSS('pointer-events', 'none');
  await recordHandoff(page);
  await clickLink(page, '/projects/');
  const frames = await handoffFrames(page);
  // Drawn during the hand-off (about three seconds), and cleared again at the end.
  expect(frames.filter(Boolean).length).toBeGreaterThan(10);
  expect(frames.at(-1)).toBe(false);
});

test.describe('with prefers-reduced-motion: reduce', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the starfield is one still frame', async ({ page }) => {
    await page.goto('/');
    await expect(starfield(page)).toHaveAttribute('data-state', 'still');
    // With reduced motion every star is there at once, without the intro.
    expect(await hasStars(page)).toBe(true);
  });

  test('a navigation plays no hand-off stars', async ({ page }) => {
    await page.goto('/');
    await expect(starfield(page)).toHaveAttribute('data-state', 'still');
    await recordHandoff(page, 800);
    await clickLink(page, '/projects/');
    expect((await handoffFrames(page)).some(Boolean)).toBe(false);
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

test('a phone gets as many stars per area as a desktop, not the same number', async ({ page }) => {
  const lit = () =>
    page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>('[data-starfield] [data-fixed]')!;
      const { data } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
      let pixels = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i]! > 0) pixels++;
      return pixels / (canvas.width * canvas.height);
    });
  // With reduced motion every star is there at once (no intro), and stays put.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(starfield(page)).toHaveAttribute('data-state', 'still');
  const desktop = await lit();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(starfield(page)).toHaveAttribute('data-state', 'still');
  // The same count would make the phone about 4× as dense.
  const ratio = (await lit()) / desktop;
  expect(ratio).toBeGreaterThan(0.75);
  expect(ratio).toBeLessThan(1.33);
});
