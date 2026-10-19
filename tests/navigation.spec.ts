// Smoke tests: every page in both languages, client-side navigation with view transitions, and
// the fallbacks (no JavaScript, no View Transitions API, reduced motion).
import {
  clickLink,
  expect,
  isSameDocument,
  langOf,
  markDocument,
  recordViewTransition,
  sitePaths,
  test,
} from './fixtures';

test('every page loads in both languages, with its translation linked', async ({ page }) => {
  const paths = await sitePaths(page);
  expect(paths.filter((path) => langOf(path) === 'nl').length).toBe(paths.length / 2);
  expect(paths).toEqual(
    expect.arrayContaining(['/', '/projects/', '/about/', '/en/', '/en/projects/', '/en/about/']),
  );

  for (const path of paths) {
    const lang = langOf(path);
    const other = lang === 'nl' ? 'en' : 'nl';
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toBeVisible();

    // The language switch, hreflang and canonical all point to existing pages.
    const switchLink = page.locator(`.lang-switch a[hreflang="${other}"]`);
    await expect(switchLink).toHaveAttribute('lang', other);
    const translation = await switchLink.getAttribute('href');
    expect((await page.request.get(translation!)).status(), `${path} → ${translation}`).toBe(200);
    await expect(page.locator(`link[rel="alternate"][hreflang="${other}"]`)).toHaveAttribute(
      'href',
      new RegExp(`${translation}$`),
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(`${path}$`),
    );

    // The current page is marked in the navigation.
    const current = page.locator('.main-nav a[aria-current="page"]');
    if (!path.includes('/projects/') || path.endsWith('/projects/'))
      await expect(current).toHaveCount(1);
  }
});

test('client-side navigation through every page in both languages', async ({ page }) => {
  const paths = await sitePaths(page);
  const projectSlugs = paths
    .filter((path) => langOf(path) === 'nl' && /^\/projects\/.+/.test(path))
    .map((path) => path.split('/')[2]);

  // Home → Projects → each project and back → About → Home, then the same in English.
  const walk = (prefix: string) => [
    `${prefix}/projects/`,
    ...projectSlugs.flatMap((slug) => [`${prefix}/projects/${slug}/`, `${prefix}/projects/`]),
    `${prefix}/about/`,
    `${prefix}/`,
  ];

  await page.goto('/');
  await markDocument(page);
  // The navigation (the sidebar on desktop, the island on phones) stays put.
  const nav = page.locator('.main-nav');
  let previous = { lang: 'nl', box: await nav.boundingBox() };

  for (const href of [...walk(''), '/en/', ...walk('/en')]) {
    await clickLink(page, href);
    expect(await isSameDocument(page), `${href} loaded client-side`).toBe(true);
    await expect(page.locator('html')).toHaveAttribute('lang', langOf(href));
    await expect(page.locator('h1')).toBeVisible();
    // Within a language it doesn't move at all; across languages the centred island may get
    // wider or narrower with its labels, but stays at the same height.
    const box = await nav.boundingBox();
    if (langOf(href) === previous.lang) expect(box).toEqual(previous.box);
    else expect(box?.y).toBe(previous.box?.y);
    previous = { lang: langOf(href), box };
    // Focus moves to the top of the new content, and the new page is announced.
    await expect(page.locator('#content')).toBeFocused();
    await expect(page.locator('.astro-route-announcer')).toHaveText(await page.title());
  }
});

test('page transition: only the card animates, within 350 ms', async ({ page }) => {
  await page.goto('/');
  test.skip(
    !(await page.evaluate(() => 'startViewTransition' in document)),
    'no View Transitions API in this browser',
  );

  const animations = await recordViewTransition(page);
  await clickLink(page, '/projects/');
  const running = await animations();

  const pseudos = running.map((animation) => animation.pseudo);
  expect(pseudos).toEqual(expect.arrayContaining(['::view-transition-group(content-card)']));
  expect(pseudos.filter((pseudo) => pseudo.includes('(sidebar)'))).toEqual([]);
  expect(pseudos.filter((pseudo) => pseudo.includes('(root)'))).toEqual([]);
  expect(Math.max(...running.map((animation) => animation.end))).toBeLessThanOrEqual(350);
});

test('Back plays the transition and restores the scroll position', async ({ page }) => {
  await page.goto('/projects/');
  await markDocument(page);
  // Halfway down; how far the page scrolls depends on the screen size.
  const scrolled = await page.evaluate(() => {
    window.scrollTo(0, Math.round((document.documentElement.scrollHeight - innerHeight) / 2));
    return window.scrollY;
  });
  expect(scrolled).toBeGreaterThan(50);

  // Through the navigation, which is always on screen: clicking a link elsewhere would make
  // Playwright scroll it into view first and change the position to restore.
  await clickLink(page, '/about/');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  await page.goBack();
  await page.waitForURL('**/projects/');
  expect(await isSameDocument(page)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrolled);
});

test.describe('on a phone', () => {
  test.beforeEach(({ isMobile }) => test.skip(!isMobile, 'the nav island is the mobile layout'));

  test('the nav island stays on top of the content and never covers the footer', async ({
    page,
  }) => {
    await page.goto('/projects/');
    await markDocument(page);
    const island = page.locator('.main-nav');
    await expect(island).toBeInViewport();
    expect(await island.evaluate((el) => getComputedStyle(el).position)).toBe('fixed');

    // Halfway down the list a project card is under the island; a tap still reaches the island.
    await page.evaluate(() => window.scrollTo(0, 400));
    await clickLink(page, '/about/');
    expect(await isSameDocument(page)).toBe(true);

    // At the very bottom the footer stays clear of the island.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const footer = await page
      .locator('footer[data-placement="page"]')
      .getByRole('link')
      .last()
      .boundingBox();
    const islandBox = await island.boundingBox();
    expect(footer!.y + footer!.height).toBeLessThan(islandBox!.y);
  });
});

test.describe('with prefers-reduced-motion: reduce', () => {
  test.use({ reducedMotion: 'reduce' });

  test('pages change without animation', async ({ page }) => {
    await page.goto('/');
    const animations = await recordViewTransition(page);
    await clickLink(page, '/projects/');
    const moving = (await animations()).filter((animation) => animation.end > 0);
    expect(moving).toEqual([]);
  });
});

test.describe('without the View Transitions API', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // @ts-expect-error: removing the API on purpose, to test the fallback
      delete Document.prototype.startViewTransition;
    });
  });

  test('navigation still works client-side, without errors', async ({ page }) => {
    await page.goto('/');
    expect(await page.evaluate(() => 'startViewTransition' in document)).toBe(false);
    await markDocument(page);
    for (const href of [
      '/projects/',
      '/projects/this-website/',
      '/en/projects/this-website/',
      '/en/about/',
    ]) {
      await clickLink(page, href);
      await expect(page.locator('html')).toHaveAttribute('lang', langOf(href));
    }
    expect(await isSameDocument(page)).toBe(true);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('links load pages normally and the theme toggle is hidden', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-theme-toggle]')).toBeHidden();
    await page.locator('.main-nav a[href="/projects/"]').click();
    await page.waitForURL('**/projects/');
    await expect(page.locator('h1')).toHaveText('Projecten');
    await page.locator('.lang-switch a[hreflang="en"]').click();
    await page.waitForURL('**/en/projects/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});

test('the skip link is the first focusable element and jumps to the content', async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(
    browserName === 'webkit' || isMobile,
    'Tab skips links in WebKit by default; no Tab on phones',
  );
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skipLink = page.locator('.skip-link');
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('#content')).toBeFocused();
});

test.describe('404', () => {
  // The browser logs the 404 response of the page itself as a console error.
  test.use({ allowedConsoleErrors: [/404/] });

  test('unknown paths get the bilingual 404 page', async ({ page }) => {
    for (const path of ['/does-not-exist/', '/en/does-not-exist/']) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
      await expect(page.locator('h1')).toHaveText('Pagina niet gevonden');
      await expect(page.locator('section[lang="en"] h2')).toHaveText('Page not found');
      await expect(page.locator('main a[href="/"]')).toBeVisible();
      await expect(page.locator('main a[href="/en/"]')).toBeVisible();
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    }
  });
});
