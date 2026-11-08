// Smoke tests: every page in both languages, client-side navigation with view transitions, and
// the fallbacks (no JavaScript, no View Transitions API, reduced motion).
import {
  clickLink,
  expect,
  isSameDocument,
  langOf,
  languageSwitch,
  mainNav,
  markDocument,
  recordAnimations,
  secondaryNav,
  sitePaths,
  skipLink,
  test,
} from './fixtures';

/** The pages with a link in the navigation, in both languages (Blog only with posts; see blog.spec.ts). */
const navPaths = ['', 'projects/', 'about/', 'now/'].flatMap((path) => [`/${path}`, `/en/${path}`]);

/** A single project or post: /projects/x/, /en/blog/y/. */
const isDetailPage = (path: string) => /^(\/en)?\/(projects|blog)\/[^/]+\/$/.test(path);

test('every page loads in both languages, with its translation linked', async ({ page }) => {
  const paths = await sitePaths(page);
  expect(paths.filter((path) => langOf(path) === 'nl').length).toBe(paths.length / 2);
  expect(paths).toEqual(expect.arrayContaining(navPaths));

  for (const path of paths) {
    const lang = langOf(path);
    const other = lang === 'nl' ? 'en' : 'nl';
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toBeVisible();

    // The language switch, hreflang and canonical all point to existing pages.
    const switchLink = languageSwitch(page).locator(`a[hreflang="${other}"]`);
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

    // The current page is marked in the main or the secondary navigation, whichever is on
    // screen. A project or a post isn't in the navigation; its section is marked instead.
    const current = mainNav(page).or(secondaryNav(page)).locator('a[aria-current="page"]');
    if (!isDetailPage(path)) await expect(current).toHaveCount(1);
  }
});

test('client-side navigation through every page in both languages', async ({ page }) => {
  // Many navigations, each with the card hand-off; without a GPU (WebKit in CI) that's slow.
  test.slow();
  const paths = await sitePaths(page);
  const slugsIn = (section: string) =>
    paths
      .filter(
        (path) => langOf(path) === 'nl' && isDetailPage(path) && path.startsWith(`/${section}/`),
      )
      .map((path) => path.split('/')[2]);

  // Home → Projects → each project and back → Blog → each post and back → About → Now →
  // Home, then the same in English.
  const section = (prefix: string, name: string) => [
    `${prefix}/${name}/`,
    ...slugsIn(name).flatMap((slug) => [`${prefix}/${name}/${slug}/`, `${prefix}/${name}/`]),
  ];
  const walk = (prefix: string) => [
    ...section(prefix, 'projects'),
    // The blog only exists once a post is published.
    ...(paths.includes('/blog/') ? section(prefix, 'blog') : []),
    `${prefix}/about/`,
    `${prefix}/now/`,
    `${prefix}/`,
  ];

  await page.goto('/');
  await markDocument(page);
  // The navigation (the sidebar on desktop, the island on phones) stays put.
  const nav = mainNav(page);
  let previous = { lang: 'nl', box: await nav.boundingBox() };

  for (const href of [...walk(''), '/en/', ...walk('/en')]) {
    await clickLink(page, href);
    expect(await isSameDocument(page), `${href} loaded client-side`).toBe(true);
    await expect(page.locator('html')).toHaveAttribute('lang', langOf(href));
    // By role: the copy of the old card that falls away is hidden from assistive technology.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
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

test('page transition: the card is handed off, settled within 650 ms', async ({ page }) => {
  await page.goto('/');
  const animations = await recordAnimations(page);
  await clickLink(page, '/projects/');
  const running = await animations();

  // A copy of the old card falls out and the new card drops in, on the page itself. The
  // browser's view transition animates nothing, so its layer over the page (which catches
  // every click and hover) is gone right after the swap.
  expect(running.map((animation) => animation.name)).toEqual(
    expect.arrayContaining(['card-out', 'card-out-fade', 'card-in', 'card-in-fade']),
  );
  expect(running.filter((animation) => animation.pseudo)).toEqual([]);
  const settled = Math.max(...running.map((animation) => animation.end));
  expect(Math.round(settled)).toBeLessThanOrEqual(650);
});

test('the old card keeps its own styles while it falls away, and they go afterwards', async ({
  page,
}) => {
  const styles = () =>
    page.evaluate(() =>
      [...document.head.querySelectorAll('link[rel="stylesheet"], style')]
        .map((style) => style.outerHTML)
        .sort(),
    );
  await page.goto('/about/');
  const aboutStyles = await styles();

  // The project rows' styles aren't on the About page; without them the copy of the old card
  // would show its images at full width.
  await page.goto('/projects/');
  const imageWidth = () =>
    page
      .locator('#content img')
      .first()
      .evaluate((image) => image.clientWidth);
  const before = await imageWidth();
  await page.evaluate(() => {
    document.addEventListener(
      'astro:after-swap',
      () => {
        const image = document.querySelector<HTMLImageElement>('[data-card-ghost] img');
        (window as unknown as { __ghostImage: number }).__ghostImage = image?.clientWidth ?? -1;
      },
      { once: true },
    );
  });
  await clickLink(page, '/about/');
  expect(
    await page.evaluate(() => (window as unknown as { __ghostImage: number }).__ghostImage),
  ).toBe(before);
  await expect.poll(styles).toEqual(aboutStyles);
});

test('a link to the page you are on plays no transition, it only scrolls back up', async ({
  page,
}) => {
  await page.goto('/projects/');
  await markDocument(page);
  await page.evaluate(() => {
    window.scrollTo(0, Math.round((document.documentElement.scrollHeight - innerHeight) / 2));
    // Fired by every client-side navigation, before the new page is fetched.
    document.addEventListener('astro:before-preparation', () => {
      document.documentElement.dataset.navigated = '';
    });
  });

  // The current item in the navigation, which is always on screen.
  const animations = await recordAnimations(page, 600);
  await mainNav(page).locator('a[href="/projects/"]').click();
  expect(await animations()).toEqual([]);
  await expect(page.locator('html')).not.toHaveAttribute('data-navigated');
  expect(await isSameDocument(page)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test('the navigation responds while a transition is still running', async ({ page, isMobile }) => {
  await page.goto('/projects/');
  await markDocument(page);
  // The navigation is always on screen; the second link is where it was before the first click.
  const home = mainNav(page).locator('a[href="/"]');
  const next = await home.boundingBox();
  await mainNav(page).locator('a[href="/about/"]').click();
  // 60 ms into the hand-off: after the swap (the browser's own view transition is over), long
  // before the cards have settled (620 ms).
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .some((animation) => animation.id === 'card-in' && Number(animation.currentTime) > 60),
  );
  const x = next!.x + next!.width / 2;
  const y = next!.y + next!.height / 2;
  if (!isMobile) {
    await page.mouse.move(x, y);
    expect(await home.evaluate((link) => link.matches(':hover'))).toBe(true);
  }
  await page.mouse.click(x, y);
  await page.waitForURL((url) => url.pathname === '/');
  expect(await isSameDocument(page)).toBe(true);
});

test('Back plays the mirrored transition and restores the scroll position', async ({ page }) => {
  await page.goto('/projects/');
  await markDocument(page);
  // Halfway down; how far the page scrolls depends on the screen size.
  const scrolled = await page.evaluate(() => {
    window.scrollTo(0, Math.round((document.documentElement.scrollHeight - innerHeight) / 2));
    return window.scrollY;
  });
  expect(scrolled).toBeGreaterThan(50);

  // Through the navigation, which is always on screen: clicking a link elsewhere would make
  // Playwright scroll it into view first and change the position to restore. Recording the
  // animations also waits until the transition is over, so Back doesn't cut it short.
  let animations = await recordAnimations(page);
  await clickLink(page, '/about/');
  await animations();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  animations = await recordAnimations(page);
  await page.goBack();
  await page.waitForURL('**/projects/');
  const names = (await animations()).map((animation) => animation.name);
  expect(names).toEqual(expect.arrayContaining(['card-out-up', 'card-in-up']));
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
    const island = mainNav(page);
    await expect(island).toBeInViewport();
    expect(await island.evaluate((el) => getComputedStyle(el).position)).toBe('fixed');

    // Halfway down the list a project card is under the island; a tap still reaches the island.
    await page.evaluate(() => window.scrollTo(0, 400));
    await clickLink(page, '/about/');
    expect(await isSameDocument(page)).toBe(true);

    // At the very bottom the footer stays clear of the island.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const footer = await page.getByRole('contentinfo').getByRole('link').last().boundingBox();
    const islandBox = await island.boundingBox();
    expect(footer!.y + footer!.height).toBeLessThan(islandBox!.y);
  });
});

test.describe('with prefers-reduced-motion: reduce', () => {
  test.use({ reducedMotion: 'reduce' });

  test('pages change without animation', async ({ page }) => {
    await page.goto('/');
    const animations = await recordAnimations(page);
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
    await mainNav(page).locator('a[href="/projects/"]').click();
    await page.waitForURL('**/projects/');
    await expect(page.locator('h1')).toHaveText('Projecten');
    await languageSwitch(page).locator('a[hreflang="en"]').click();
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
  await expect(skipLink(page)).toBeFocused();
  await expect(skipLink(page)).toBeInViewport();
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
