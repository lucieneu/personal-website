// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import { defaultLang, languages } from './src/i18n/ui';

// https://astro.build/config
export default defineConfig({
  output: 'static',

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
