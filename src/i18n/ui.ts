// Interface text per language. Components never hard-code text; they read it through t().

export const languages = {
  nl: 'Nederlands',
  en: 'English',
} as const;

export type Lang = keyof typeof languages;

export const defaultLang: Lang = 'nl';

const nl = {
  'site.name': 'Lucien Krijnen',
  // TODO(content): job title and a 1–2 sentence intro, supplied by the owner.
  'site.role': 'TODO(content): functietitel',
  'site.intro': 'TODO(content): korte intro van één of twee zinnen.',
  'nav.label': 'Hoofdnavigatie',
  'nav.home': 'Home',
} as const;

export type UiKey = keyof typeof nl;

// Typed against the Dutch keys, so a missing English string fails `astro check`.
const en: Record<UiKey, string> = {
  'site.name': 'Lucien Krijnen',
  'site.role': 'TODO(content): job title',
  'site.intro': 'TODO(content): short intro of one or two sentences.',
  'nav.label': 'Main navigation',
  'nav.home': 'Home',
};

export const ui: Record<Lang, Record<UiKey, string>> = { nl, en };
