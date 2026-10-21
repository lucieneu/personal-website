// Language helpers that don't need Astro, so the build check in src/integrations/ can use them
// too (astro:i18n doesn't exist yet when astro.config.mjs loads). Components import them through
// src/i18n/utils.ts.
import { defaultLang, languages, type Lang } from '@/i18n/ui';

export function isLang(value: string): value is Lang {
  // Not `in`: that also matches inherited keys such as 'constructor'.
  return Object.hasOwn(languages, value);
}

/** Every supported language, Dutch first. */
export const langs = Object.keys(languages) as Lang[];

/** Narrows `Astro.currentLocale` to a supported language, falling back to Dutch. */
export function getLang(locale: string | undefined): Lang {
  return locale !== undefined && isLang(locale) ? locale : defaultLang;
}

/**
 * Splits a URL path into its language and the path within that language:
 * `/en/projects/` → `['en', 'projects/']`, `/projects/` → `['nl', 'projects/']`.
 * Dutch has no prefix, so only the other languages are recognized as a first segment.
 */
export function splitLocalePath(pathname: string): [Lang, string] {
  const path = pathname.replace(/^\/+/, '');
  const [first = '', ...rest] = path.split('/');
  if (first !== defaultLang && isLang(first)) return [first, rest.join('/')];
  return [defaultLang, path];
}

/**
 * The other way around, for messages: `['en', 'projects/x']` → `/en/projects/x/`,
 * `['nl', '']` → `/`. Pages use localePath() from utils.ts, which follows the Astro config.
 */
export function joinLocalePath(lang: Lang, path: string): string {
  const parts = [lang === defaultLang ? '' : lang, path.replace(/^\/+|\/+$/g, '')].filter(Boolean);
  return `/${parts.map((part) => `${part}/`).join('')}`;
}
