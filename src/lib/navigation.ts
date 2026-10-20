// The main navigation: its links, and which of them is the current page.
import type { Lang, UiKey } from '../i18n/ui';
import { localePath } from '../i18n/utils';

interface NavLink {
  key: UiKey;
  path: string;
}

// Blog follows in phase 2; Now, Uses and Lab become secondary links below these.
const navLinks: NavLink[] = [
  { key: 'nav.home', path: '' },
  { key: 'nav.projects', path: 'projects' },
  { key: 'nav.about', path: 'about' },
];

/** "page" for the current page, "true" for the section it's in, undefined for the others. */
export type NavState = 'page' | 'true' | undefined;

export interface NavItemData {
  key: UiKey;
  href: string;
  current: NavState;
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

/** The main navigation's links in a language, with the current page marked. */
export function navItems(lang: Lang, pathname: string): NavItemData[] {
  const homeHref = localePath(lang);
  return navLinks.map(({ key, path }) => {
    const href = localePath(lang, path);
    return { key, href, current: navState(href, pathname, homeHref) };
  });
}
