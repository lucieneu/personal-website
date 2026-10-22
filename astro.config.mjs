// @ts-check
// Astro loads this file through Vite with tsconfig paths turned on, so the @/ alias works here
// (and in the files it imports) like everywhere else.
import { defaultLang, languages } from '@/i18n/ui';
import checkTranslations from '@/integrations/check-translations';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  output: 'static',

  // The production URL, used for canonical URLs, hreflang links, Open Graph and the sitemap.
  // The custom domain is set in wrangler.jsonc.
  site: 'https://reller.nl',

  integrations: [
    mdx(),
    // Lists both language versions of every page; the 404 page is left out automatically.
    sitemap({
      i18n: {
        defaultLocale: defaultLang,
        locales: Object.fromEntries(Object.keys(languages).map((lang) => [lang, lang])),
      },
    }),
    checkTranslations(),
  ],

  // Code blocks get both a light and a dark theme as CSS variables, without a default color;
  // global.css picks one with light-dark(), so code follows the theme toggle too.
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    },
  },

  // Loads the next page on hover, so it's usually there before the click.
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },

  // Dutch is the default and has no prefix; English lives under /en/.
  // The languages are defined once, in src/i18n/ui.ts.
  i18n: {
    defaultLocale: defaultLang,
    locales: Object.keys(languages),
    routing: { prefixDefaultLocale: false },
  },

  // Self-hosted from the installed Fontsource packages (no requests to a font CDN):
  // one variable woff2 file per font, Latin subset only.
  // The `local` provider is used because the `npm` provider fails to read files from
  // node_modules on Windows in Astro 7.4 (it tries to fetch() a file:// URL).
  // TODO(decision): the font isn't chosen yet; this is the proposal (Inter Variable + JetBrains Mono).
  fonts: [
    {
      name: 'Inter Variable',
      cssVariable: '--font-inter',
      provider: fontProviders.local(),
      options: {
        variants: [
          {
            src: ['@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'],
            weight: '100 900',
            style: 'normal',
          },
        ],
      },
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      name: 'JetBrains Mono Variable',
      cssVariable: '--font-jetbrains-mono',
      provider: fontProviders.local(),
      options: {
        variants: [
          {
            src: [
              '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2',
            ],
            weight: '100 800',
            style: 'normal',
          },
        ],
      },
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
});
