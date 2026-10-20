// Dates: written out for a language, in machine-readable form, and sorted.
import type { Lang } from '../i18n/ui';

/**
 * Formats a date for a language, by default as month and year ("oktober 2026").
 * Dates from the content are midnight UTC, so they're formatted in UTC to keep the same day.
 */
export function formatDate(
  date: Date,
  lang: Lang,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long' },
): string {
  return new Intl.DateTimeFormat(lang, { ...options, timeZone: 'UTC' }).format(date);
}

/** The machine-readable date for `<time datetime>`: a day (2026-10-18) or a month (2026-10). */
export function isoDate(date: Date, precision: 'day' | 'month' = 'day'): string {
  return date.toISOString().slice(0, precision === 'day' ? 10 : 7);
}

/** A copy of `items`, newest first, by the date that `dateOf` picks from each item. */
export function newestFirst<T>(items: readonly T[], dateOf: (item: T) => Date): T[] {
  return [...items].sort((a, b) => dateOf(b).getTime() - dateOf(a).getTime());
}
