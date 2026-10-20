// What search engines and link previews read: titles, absolute URLs, language alternates and
// JSON-LD.
import { defaultLang, type Lang } from '../i18n/ui';
import { langs, useTranslations } from '../i18n/utils';
import { socialLinks } from './site';

/** A page title: its parts joined with a middle dot, leaving out empty ones. */
export function pageTitle(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(' · ');
}

/** An absolute URL on the site (`site` from astro.config.mjs), as crawlers expect. */
export function absoluteUrl(path: string, site: URL | undefined): string {
  return new URL(path, site).href;
}

/** The canonical URL of a page: itself, in its own language. None without translations (404). */
export function canonicalUrl(
  alternates: Record<Lang, string> | undefined,
  lang: Lang,
  site: URL | undefined,
): string | undefined {
  return alternates && absoluteUrl(alternates[lang], site);
}

/**
 * The `<link rel="alternate">` targets: each language, plus x-default for the default one.
 * None for a page without translations (404).
 */
export function alternateLinks(
  alternates: Record<Lang, string> | undefined,
  site: URL | undefined,
): { hreflang: string; href: string }[] {
  if (!alternates) return [];
  return [
    ...langs.map((code) => ({ hreflang: code, href: absoluteUrl(alternates[code], site) })),
    { hreflang: 'x-default', href: absoluteUrl(alternates[defaultLang], site) },
  ];
}

/** JSON-LD about me (a schema.org Person) as a string, for the home pages. */
export function personJsonLd(lang: Lang, url: string | undefined): string {
  const t = useTranslations(lang);
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: t('site.name'),
    jobTitle: t('site.role'),
    url,
    sameAs: socialLinks.map((link) => link.href),
  });
}
