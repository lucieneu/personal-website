// Fails the build when a page exists in one language but not the other. Every page (including
// every project, post and experiment) has the same path in both languages, so after the build
// each Dutch path needs an English twin under /en/, and the other way around.
// Drafts aren't built in production, so a draft without a translation passes.
import type { AstroIntegration } from 'astro';
import { defaultLang, languages, type Lang } from '../i18n/ui';

const langs = Object.keys(languages) as Lang[];

// Pages that exist once for both languages.
const shared = new Set(['404']);

/** '/en/projects/x/' → ['en', 'projects/x'] and 'projects/x/' → ['nl', 'projects/x'] */
function split(pathname: string): [Lang, string] {
  const path = pathname.replace(/^\/+|\/+$/g, '');
  const [first = '', ...rest] = path.split('/');
  const lang = langs.find((code) => code !== defaultLang && code === first);
  return lang ? [lang, rest.join('/')] : [defaultLang, path];
}

/** ['en', 'projects/x'] → '/en/projects/x/' and ['nl', ''] → '/' */
function join(lang: Lang, path: string): string {
  const parts = [lang === defaultLang ? '' : lang, path].filter(Boolean);
  return `/${parts.map((part) => `${part}/`).join('')}`;
}

export default function checkTranslations(): AstroIntegration {
  return {
    name: 'check-translations',
    hooks: {
      'astro:build:done': ({ pages, logger }) => {
        const found = new Map<string, Set<Lang>>();
        for (const { pathname } of pages) {
          // Endpoints such as robots.txt have a file extension; pages don't.
          if (/\.\w+\/?$/.test(pathname)) continue;
          const [lang, path] = split(pathname);
          if (shared.has(path)) continue;
          found.set(path, (found.get(path) ?? new Set()).add(lang));
        }

        const missing = [...found].flatMap(([path, present]) =>
          langs.filter((code) => !present.has(code)).map((code) => `  ${join(code, path)}`),
        );
        if (missing.length > 0) {
          throw new Error(
            `These pages are missing a translation (every page needs both languages):\n${missing.join('\n')}`,
          );
        }
        logger.info(`All ${found.size} pages exist in ${langs.join(' and ')}.`);
      },
    },
  };
}
