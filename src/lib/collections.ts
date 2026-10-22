// Helpers for the collections whose files live in nl/ and en/ subfolders (projects, posts).
import type { Lang } from '@/i18n/ui';

interface LocalizedEntry {
  id: string;
  data: { draft: boolean };
}

// Ids are '<lang>/<slug>': the subfolder is the language and the file name the slug.
const splitId = (entry: LocalizedEntry) => {
  const [lang = '', ...slug] = entry.id.split('/');
  return { lang, slug: slug.join('/') };
};

/** The slug of an entry, the same in both languages ('nl/my-project' → 'my-project'). */
export function entrySlug(entry: LocalizedEntry): string {
  return splitId(entry).slug;
}

/**
 * Whether an entry shows up in `lang`: it's in that language, and it isn't a draft (drafts only
 * show up in development). Missing translations are caught after the build by
 * src/integrations/check-translations.ts.
 */
export function isPublished(entry: LocalizedEntry, lang: Lang): boolean {
  return splitId(entry).lang === lang && (import.meta.env.DEV || !entry.data.draft);
}
