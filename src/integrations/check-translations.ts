// Fails the build when a page exists in one language but not the other. Every page (including
// every project, post and experiment) has the same path in both languages, so after the build
// each Dutch path needs an English twin under /en/, and the other way around.
// Drafts aren't built in production, so a draft without a translation passes.
import type { AstroIntegration } from 'astro';
import { joinLocalePath, langs, splitLocalePath } from '../i18n/paths';
import type { Lang } from '../i18n/ui';

// Pages that exist once for both languages.
const shared = new Set(['404']);

export default function checkTranslations(): AstroIntegration {
  return {
    name: 'check-translations',
    hooks: {
      'astro:build:done': ({ pages, logger }) => {
        const found = new Map<string, Set<Lang>>();
        for (const { pathname } of pages) {
          // Endpoints such as robots.txt have a file extension; pages don't.
          if (/\.\w+\/?$/.test(pathname)) continue;
          const [lang, pagePath] = splitLocalePath(pathname);
          const path = pagePath.replace(/\/+$/, '');
          if (shared.has(path)) continue;
          found.set(path, (found.get(path) ?? new Set()).add(lang));
        }

        const missing = [...found].flatMap(([path, present]) =>
          langs
            .filter((code) => !present.has(code))
            .map((code) => `  ${joinLocalePath(code, path)}`),
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
