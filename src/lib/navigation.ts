// The navigation: its links, and which of them is the current page.
import type { Lang, UiKey } from '@/i18n/ui';
import { localePath } from '@/i18n/utils';

export interface NavLink {
  key: UiKey;
  path: string;
  /** Only in the desktop sidebar: on phones the nav island leaves it out (Home: the name links there). */
  desktopOnly?: boolean;
}

const allMainLinks: NavLink[] = [
  { key: 'nav.home', path: '' },
  { key: 'nav.projects', path: 'projects' },
  { key: 'nav.blog', path: 'blog' },
  { key: 'nav.about', path: 'about' },
];

/**
 * The main navigation: in the sidebar on desktop, in the nav island on phones. Blog only once
 * there are posts (see hasPosts() in posts.ts).
 */
export function mainLinks(showBlog: boolean): NavLink[] {
  return (
    allMainLinks
      .filter((link) => showBlog || link.key !== 'nav.blog')
      // Four links don't fit the island on one row, so with Blog the island leaves out Home: the
      // name in the mobile header links there too. Without Blog it keeps three links.
      .map((link) => (link.key === 'nav.home' ? { ...link, desktopOnly: showBlog } : link))
  );
}

/** The secondary links: below the main navigation on desktop, in the footer on phones. */
export const secondaryLinks: NavLink[] = [{ key: 'nav.now', path: 'now' }];

/** "page" for the current page, "true" for the section it's in, undefined for the others. */
export type NavState = 'page' | 'true' | undefined;

export interface NavItemData {
  key: UiKey;
  href: string;
  current: NavState;
  desktopOnly: boolean;
}

/** '/projects/' → '/projects', and '/' stays '/'. */
export function withoutTrailingSlash(path: string): string {
  return path.replace(/\/+$/, '') || '/';
}

/**
 * Whether `href` is the current page (`pathname`), the section the current page is in (a
 * project under Projects) or neither. The home page is never a section, or it would contain
 * every page.
 */
export function navState(href: string, pathname: string, homeHref: string): NavState {
  const target = withoutTrailingSlash(href);
  const current = withoutTrailingSlash(pathname);
  if (target === current) return 'page';
  const isHome = target === withoutTrailingSlash(homeHref);
  if (!isHome && current.startsWith(`${target}/`)) return 'true';
  return undefined;
}

/** Navigation links in a language, with the current page marked. */
export function navItems(links: NavLink[], lang: Lang, pathname: string): NavItemData[] {
  const homeHref = localePath(lang);
  return links.map(({ key, path, desktopOnly = false }) => {
    const href = localePath(lang, path);
    return { key, href, current: navState(href, pathname, homeHref), desktopOnly };
  });
}
