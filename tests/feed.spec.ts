// The RSS feeds: one per language, linked from every page, listing that language's posts.
import { expect, test } from './fixtures';

for (const { lang, home, feed } of [
  { lang: 'nl', home: '/', feed: '/rss.xml' },
  { lang: 'en', home: '/en/', feed: '/en/rss.xml' },
]) {
  test(`the ${lang} feed lists the ${lang} posts`, async ({ page }) => {
    await page.goto(home);
    await expect(page.locator('link[type="application/rss+xml"]')).toHaveAttribute(
      'href',
      new RegExp(`${feed}$`),
    );

    const response = await page.request.get(feed);
    expect(response.ok()).toBe(true);
    const xml = await response.text();
    expect(xml).toContain(`<language>${lang}</language>`);

    // Every item links to a post page in the same language that exists.
    const links = [...xml.matchAll(/<link>([^<]+)<\/link>/g)].map(
      (match) => new URL(match[1]!).pathname,
    );
    const posts = links.filter((path) => path.includes('/blog/'));
    expect(posts.length).toBeGreaterThan(0);
    for (const path of posts) {
      expect(path.startsWith(`${home}blog/`), path).toBe(true);
      expect((await page.request.get(path)).status(), path).toBe(200);
    }
  });
}
