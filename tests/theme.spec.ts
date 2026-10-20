// The theme switch: follows the OS until clicked, remembers the choice, and never flashes the
// wrong theme on load or navigation.
import { clickLink, expect, recordViewTransition, test } from './fixtures';

const theme = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.dataset.theme ?? null);

test.describe('in a dark OS', () => {
  test.use({ colorScheme: 'dark' });

  test('the first click switches to light, and the choice is remembered', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('[data-theme-toggle]');
    expect(await theme(page)).toBeNull();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await toggle.click();
    await expect.poll(() => theme(page)).toBe('light');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light');

    // Kept on a client-side navigation and after a reload.
    await clickLink(page, '/en/');
    expect(await theme(page)).toBe('light');
    await expect(page.locator('[data-theme-toggle]')).toHaveAttribute('aria-pressed', 'false');
    await page.reload();
    expect(await theme(page)).toBe('light');
  });
});

test('the stored theme is set before the page is painted', async ({ page }) => {
  // Record the theme at the moment <body> is created, before anything in it can be painted.
  await page.addInitScript(() => {
    localStorage.setItem('theme', 'dark');
    const w = window as unknown as { __themeAtBody?: string };
    new MutationObserver((_, observer) => {
      if (!document.body) return;
      w.__themeAtBody = document.documentElement.dataset.theme ?? 'none';
      observer.disconnect();
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto('/about/');
  expect(
    await page.evaluate(() => (window as unknown as { __themeAtBody?: string }).__themeAtBody),
  ).toBe('dark');
});

test('the theme switch reveals the new theme as a circle', async ({ page }) => {
  await page.goto('/');
  test.skip(
    !(await page.evaluate(() => 'startViewTransition' in document)),
    'no View Transitions API in this browser',
  );
  const before = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const animations = await recordViewTransition(page, 700);
  await page.locator('[data-theme-toggle]').click();
  const running = await animations();

  // One animation on the whole page (the root), none on the card or sidebar on their own.
  expect(running.map((animation) => animation.pseudo)).toEqual(['::view-transition-new(root)']);
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor))
    .not.toBe(before);
  await expect(page.locator('html')).not.toHaveClass(/theme-transition/);
});

test('the toggle works from the keyboard', async ({ page, isMobile }) => {
  test.skip(isMobile, 'no keyboard on phones');
  await page.goto('/');
  const before = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.locator('[data-theme-toggle]').focus();
  await page.keyboard.press('Enter');
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor))
    .not.toBe(before);
  await expect(page.locator('[data-theme-toggle]')).toBeFocused();
});

test.describe('with prefers-reduced-motion: reduce', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the theme switches instantly', async ({ page }) => {
    await page.goto('/');
    const animations = await recordViewTransition(page, 300);
    const before = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.locator('[data-theme-toggle]').click();
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe(
      before,
    );
    expect(await animations()).toEqual([]);
  });
});
