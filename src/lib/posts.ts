// Blog posts, from src/content/posts/{nl,en}/.
import type { Lang } from '@/i18n/ui';
import { localePath } from '@/i18n/utils';
import { entrySlug, isPublished } from '@/lib/collections';
import { newestFirst } from '@/lib/date';
import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

/** The posts in one language, newest first. Drafts only show up in development. */
export async function getPosts(lang: Lang): Promise<Post[]> {
  const posts = await getCollection('posts', (post) => isPublished(post, lang));
  return newestFirst(posts, (post) => post.data.pubDate);
}

/** The newest posts, for the home page. */
export async function getLatestPosts(lang: Lang, count = 3): Promise<Post[]> {
  return (await getPosts(lang)).slice(0, count);
}

/** getStaticPaths() for the post pages: one page per post, at its slug. */
export async function postPaths(lang: Lang) {
  return (await getPosts(lang)).map((post) => ({
    params: { slug: entrySlug(post) },
    props: { post },
  }));
}

/** The page of a post in a language: /blog/my-post/ or /en/blog/my-post/. */
export function postPath(post: Post, lang: Lang): string {
  return localePath(lang, `blog/${entrySlug(post)}`);
}
