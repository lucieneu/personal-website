// The blog: hidden until a post is published; then listed, linked and in an RSS feed per
// language. Which of the two applies depends on the build, so the tests check whichever it is.
import { expect, mainNav, sitePaths, test } from './fixtures';

for (const { lang, home, blog, feed } of [
  { lang: 'nl', home: '/', blog: '/blog/', feed: '/rss.xml' },
  { lang: 'en', home: '/en/', blog: '/en/blog/', feed: '/en/rss.xml' },
]) {
  test(`${lang}: the blog shows up only with published posts`, async ({ page }) => {
    const paths = await sitePaths(page);
    const posts = paths.filter((path) => path.startsWith(blog) && path !== blog);
    const shown = paths.includes(blog);
    expect(posts.length > 0, 'a blog page exactly when there are posts').toBe(shown);

    await page.goto(home);
    await expect(mainNav(page).locator(`a[href="${blog}"]`)).toHaveCount(shown ? 1 : 0);
    await expect(page.locator(`main a[href="${blog}"]`)).toHaveCount(shown ? 1 : 0);
    const feedLink = page.locator('link[type="application/rss+xml"]');
    if (!shown) {
      await expect(feedLink).toHaveCount(0);
      expect((await page.request.get(blog)).status()).toBe(404);
      return;
    }

    // The feed is linked from every page and lists exactly the posts in this language.
    await expect(feedLink).toHaveAttribute('href', new RegExp(`${feed}$`));
    const response = await page.request.get(feed);
    expect(response.ok()).toBe(true);
    const xml = await response.text();
    expect(xml).toContain(`<language>${lang}</language>`);
    const items = [...xml.matchAll(/<item>.*?<link>([^<]+)<\/link>/gs)].map(
      (match) => new URL(match[1]!).pathname,
    );
    expect(items.sort()).toEqual(posts.sort());
  });
}
