// The RSS feed of the blog, one per language: /rss.xml and /en/rss.xml.
import type { Lang } from '@/i18n/ui';
import { localePath, useTranslations } from '@/i18n/utils';
import { getPosts, postPath } from '@/lib/posts';
import { pageTitle } from '@/lib/seo';
import rss from '@astrojs/rss';

/** Where the feed of a language is: '/rss.xml' or '/en/rss.xml'. */
export function feedPath(lang: Lang): string {
  return `${localePath(lang)}rss.xml`;
}

/** The feed's title, as feed readers show it: "Blog · Lucien Krijnen". */
export function feedTitle(lang: Lang): string {
  const t = useTranslations(lang);
  return pageTitle(t('blog.title'), t('site.name'));
}

/** The response of a feed endpoint: every published post in `lang`, newest first. */
export async function postsFeed(lang: Lang, site: URL | undefined): Promise<Response> {
  const t = useTranslations(lang);
  const posts = await getPosts(lang);
  return rss({
    title: feedTitle(lang),
    description: t('blog.description'),
    site: site ?? '',
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      categories: post.data.tags,
      link: postPath(post, lang),
    })),
    customData: `<language>${lang}</language>`,
  });
}
