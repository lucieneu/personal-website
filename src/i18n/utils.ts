import { getRelativeLocaleUrl } from 'astro:i18n';
import { defaultLang, languages, ui, type Lang, type UiKey } from './ui';

function isLang(value: string): value is Lang {
  // Not `in`: that also matches inherited keys such as 'constructor'.
  return Object.hasOwn(languages, value);
}

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
