import { test as base, expect, type Page } from '@playwright/test';

/**
 * `test` with one addition: every test fails when the page logs a console error or throws.
 * Messages matching `allowedConsoleErrors` (set per test with test.use) are ignored.
 */
export const test = base.extend<{ allowedConsoleErrors: RegExp[]; consoleErrors: string[] }>({
  allowedConsoleErrors: [[], { option: true }],
  consoleErrors: [
    async ({ page, allowedConsoleErrors }, use) => {
      const errors: string[] = [];
      const allowed = (text: string) => allowedConsoleErrors.some((pattern) => pattern.test(text));
      page.on('console', (message) => {
        if (message.type() === 'error' && !allowed(message.text())) errors.push(message.text());
      });
      page.on('pageerror', (error) => errors.push(error.message));
      await use(errors);
      expect(errors, 'console errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Every page of the site, both languages, from the sitemap (so new pages are tested too). */
export async function sitePaths(page: Page): Promise<string[]> {
  const response = await page.request.get('/sitemap-0.xml');
  expect(response.ok()).toBe(true);
  const xml = await response.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]!).pathname);
}

/** The language a path belongs to: English under /en/, Dutch everywhere else. */
export const langOf = (path: string) => (path.startsWith('/en/') || path === '/en' ? 'en' : 'nl');

/**
 * Marks the current document, so a test can tell a client-side navigation (the mark stays)
 * from a full page load (the mark is gone).
 */
export async function markDocument(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { __sameDocument: boolean }).__sameDocument = true;
  });
}

export async function isSameDocument(page: Page) {
  return page.evaluate(
    () => (window as unknown as { __sameDocument?: boolean }).__sameDocument === true,
  );
}

/** Clicks the link to `href` on the current page and waits until the new page is in place. */
export async function clickLink(page: Page, href: string) {
  // ClientRouter fires astro:page-load once the new page is swapped in and its scripts ran.
  await page.evaluate(() => {
    (window as unknown as { __pageLoaded: Promise<void> }).__pageLoaded = new Promise((resolve) =>
      document.addEventListener('astro:page-load', () => resolve(), { once: true }),
    );
  });
  await page.locator(`a[href="${href}"]`).first().click();
  await page.waitForURL((url) => url.pathname === href);
  await page.evaluate(() => (window as unknown as { __pageLoaded: Promise<void> }).__pageLoaded);
}

interface ViewTransitionAnimation {
  pseudo: string;
  name: string;
  /** When the animation ends, in ms after it started (delay + duration). */
  end: number;
}

/**
 * Starts recording the view transition animations that run in the next `ms` milliseconds.
 * Await the returned promise after triggering the transition.
 */
export async function recordViewTransition(
  page: Page,
  ms = 800,
): Promise<() => Promise<ViewTransitionAnimation[]>> {
  await page.evaluate((duration) => {
    const seen = new Map<string, ViewTransitionAnimation>();
    const until = performance.now() + duration;
    const w = window as unknown as { __vtAnimations: Promise<ViewTransitionAnimation[]> };
    w.__vtAnimations = new Promise((resolve) => {
      const sample = () => {
        for (const animation of document.getAnimations()) {
          const effect = animation.effect as KeyframeEffect | null;
          const pseudo = effect?.pseudoElement ?? '';
          if (!pseudo.startsWith('::view-transition')) continue;
          const name = (animation as CSSAnimation).animationName ?? 'script';
          const end = Number(effect?.getComputedTiming().endTime ?? 0);
          seen.set(`${pseudo}|${name}`, { pseudo, name, end });
        }
        if (performance.now() < until) requestAnimationFrame(sample);
        else resolve([...seen.values()]);
      };
      requestAnimationFrame(sample);
    });
  }, ms);
  return () =>
    page.evaluate(
      () =>
        (window as unknown as { __vtAnimations: Promise<ViewTransitionAnimation[]> })
          .__vtAnimations,
    );
}
