import { getRelativeLocaleUrl } from 'astro:i18n';
import { defaultLang, languages, ui, type Lang, type UiKey } from './ui';

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

/** Returns `t()`, which looks up interface text for the given language. */
export function useTranslations(lang: Lang) {
  return function t(key: UiKey): string {
    return ui[lang][key];
  };
}

/** Builds a path in the given language, e.g. `localePath('en', 'projects')` → `/en/projects/`. */
export function localePath(lang: Lang, path = ''): string {
  return getRelativeLocaleUrl(lang, path);
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

/** The same page in another language. Every page has the same path in both languages. */
export function translatePath(pathname: string, lang: Lang): string {
  return localePath(lang, splitLocalePath(pathname)[1]);
}

/**
 * Formats a date for the page's language, by default as month and year ("oktober 2026").
 * Dates from the content are midnight UTC, so they're formatted in UTC to keep the same day.
 */
export function formatDate(
  date: Date,
  lang: Lang,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long' },
): string {
  return new Intl.DateTimeFormat(lang, { ...options, timeZone: 'UTC' }).format(date);
}
