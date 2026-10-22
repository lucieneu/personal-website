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

/**
 * Whether the blog shows up in `lang` (its pages, the Blog link, the latest posts on the home
 * page, the feed link): only once a post is published. In development drafts count.
 */
export async function hasPosts(lang: Lang): Promise<boolean> {
  return (await getPosts(lang)).length > 0;
}

interface BlogPath {
  params: { slug: string | undefined };
  /** The post on this page; none on the list at /blog/. */
  props: { post: Post | undefined };
}

/**
 * getStaticPaths() for the blog: the list at /blog/ and one page per post at its slug. Without
 * published posts there are no blog pages at all.
 */
export async function blogPaths(lang: Lang): Promise<BlogPath[]> {
  const posts = await getPosts(lang);
  if (posts.length === 0) return [];
  return [
    { params: { slug: undefined }, props: { post: undefined } },
    ...posts.map((post) => ({ params: { slug: entrySlug(post) }, props: { post } })),
  ];
}

/** The page of a post in a language: /blog/my-post/ or /en/blog/my-post/. */
export function postPath(post: Post, lang: Lang): string {
  return localePath(lang, `blog/${entrySlug(post)}`);
}
