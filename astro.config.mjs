// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  output: 'static',

  // Dutch is the default and has no prefix; English lives under /en/.
  // Keep the locales in sync with `languages` in src/i18n/ui.ts.
  i18n: {
    defaultLocale: 'nl',
    locales: ['nl', 'en'],
    routing: { prefixDefaultLocale: false },
  },
});
