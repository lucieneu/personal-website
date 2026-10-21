import js from '@eslint/js';
import eslintPluginAstro from 'eslint-plugin-astro';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores(['dist/', '.astro/', 'test-results/', 'playwright-report/']),
  js.configs.recommended,
  tseslint.configs.recommended,
  eslintPluginAstro.configs.recommended,

  // Files in src/ import each other with the @/ alias: no '../', and no './' except a
  // component's CSS Module next to it ('./Link.module.css'). Also covers <script> blocks.
  {
    files: ['src/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^\\.(?!/[^/]+\\.module\\.css$)',
              message: "Import with the @/ alias (for example '@/lib/date').",
            },
          ],
        },
      ],
    },
  },
);
