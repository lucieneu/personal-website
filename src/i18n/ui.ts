// Interface text per language. Components never hard-code text; they read it through t().

// The supported languages. astro.config.mjs builds its i18n routing from these and `defaultLang`.
export const languages = {
  nl: 'Nederlands',
  en: 'English',
} as const;

export type Lang = keyof typeof languages;

export const defaultLang: Lang = 'nl';

/** Open Graph locale per language (`og:locale` uses language_TERRITORY). */
export const ogLocales: Record<Lang, string> = {
  nl: 'nl_NL',
  en: 'en_US',
};

const nl = {
  'site.name': 'Lucien Krijnen',
  // TODO(content): job title, a 1–2 sentence intro and a meta description, supplied by the owner.
  'site.role': 'TODO(content): functietitel',
  'site.intro': 'TODO(content): korte intro van één of twee zinnen.',
  'site.description': 'TODO(content): beschrijving van de site voor zoekmachines.',
  'skip.link': 'Naar inhoud',
  'nav.label': 'Hoofdnavigatie',
  'nav.home': 'Home',
  'nav.projects': 'Projecten',
  'nav.about': 'Over mij',
  'lang.label': 'Taal',
  'theme.dark': 'Donker thema',
  'social.label': 'Elders online',
  'footer.source': 'Broncode van deze site',
  'home.featured': 'Uitgelichte projecten',
  'home.allProjects': 'Alle projecten',
  'projects.title': 'Projecten',
  'projects.description': 'TODO(content): beschrijving van de projectenpagina.',
  'project.back': 'Alle projecten',
  'project.date': 'Datum',
  'project.role': 'Rol',
  'project.stack': 'Gebruikte techniek',
  'project.live': 'Bekijk de site',
  'project.repo': 'Bekijk de code',
  'about.title': 'Over mij',
  'about.description': 'TODO(content): beschrijving van de over-mijpagina.',
  'about.experience': 'Werkervaring',
  'about.skills': 'Vaardigheden',
  'about.present': 'heden',
  'notFound.title': 'Pagina niet gevonden',
  'notFound.text':
    'Deze pagina bestaat niet (meer). Misschien is de link verouderd of zit er een typfout in.',
  'notFound.home': 'Naar de homepage',
} as const;

export type UiKey = keyof typeof nl;

// Typed against the Dutch keys, so a missing English string fails `astro check`.
const en: Record<UiKey, string> = {
  'site.name': 'Lucien Krijnen',
  'site.role': 'TODO(content): job title',
  'site.intro': 'TODO(content): short intro of one or two sentences.',
  'site.description': 'TODO(content): description of the site for search engines.',
  'skip.link': 'Skip to content',
  'nav.label': 'Main navigation',
  'nav.home': 'Home',
  'nav.projects': 'Projects',
  'nav.about': 'About',
  'lang.label': 'Language',
  'theme.dark': 'Dark theme',
  'social.label': 'Elsewhere',
  'footer.source': 'Source code of this site',
  'home.featured': 'Featured projects',
  'home.allProjects': 'All projects',
  'projects.title': 'Projects',
  'projects.description': 'TODO(content): description of the projects page.',
  'project.back': 'All projects',
  'project.date': 'Date',
  'project.role': 'Role',
  'project.stack': 'Stack',
  'project.live': 'Visit the site',
  'project.repo': 'View the code',
  'about.title': 'About me',
  'about.description': 'TODO(content): description of the about page.',
  'about.experience': 'Work experience',
  'about.skills': 'Skills',
  'about.present': 'present',
  'notFound.title': 'Page not found',
  'notFound.text': "This page doesn't exist (anymore). The link may be out of date or have a typo.",
  'notFound.home': 'Go to the home page',
};

export const ui: Record<Lang, Record<UiKey, string>> = { nl, en };
