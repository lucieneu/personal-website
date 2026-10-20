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

/** The languages other than `lang`. */
export function otherLangs(lang: Lang): Lang[] {
  return langs.filter((code) => code !== lang);
}

/** One value per language, e.g. `perLang((code) => localePath(code))` for both home pages. */
export function perLang<T>(make: (lang: Lang) => T): Record<Lang, T> {
  return Object.fromEntries(langs.map((code) => [code, make(code)])) as Record<Lang, T>;
}

/** One piece of interface text in every language, the default language first. */
export function inEveryLang(key: UiKey): string[] {
  return langs.map((code) => ui[code][key]);
}

/** The short code the language switch shows: 'NL', 'EN'. */
export function langCode(lang: Lang): string {
  return lang.toUpperCase();
}

/** Whether a path is one of the home pages (`/` or `/en/`). */
export function isHomePath(pathname: string): boolean {
  return splitLocalePath(pathname)[1] === '';
}

/**
 * Where the language versions of a page are. `alternates` is the page in each language (for
 * the hreflang links); the language switch links there too. A page without a translation (the
 * 404 page) has no alternates, and its language switch links to the home pages.
 */
export function languagePaths(pathname: string, translated: boolean) {
  const alternates = translated ? perLang((code) => translatePath(pathname, code)) : undefined;
  return { alternates, targets: alternates ?? perLang((code) => localePath(code)) };
}
