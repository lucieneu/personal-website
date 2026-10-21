import js from '@eslint/js';
import eslintPluginAstro from 'eslint-plugin-astro';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

const useAlias = "Import from src/ with the @/ alias (for example '@/lib/date')";

export default defineConfig(
  globalIgnores(['dist/', '.astro/', 'test-results/', 'playwright-report/']),
  js.configs.recommended,
  tseslint.configs.recommended,
  eslintPluginAstro.configs.recommended,

  // Absolute imports: no `../` anywhere.
  {
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ regex: '^\\.\\./', message: useAlias }] }],
    },
  },
  // In src/ not even `./`, except a component's own CSS Module next to it ('./Link.module.css').
  // `src/**` also matches the <script> blocks of .astro files.
  {
    files: ['src/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^\\.(?!/[^/]+\\.module\\.css$)',
              message: `${useAlias}; only a component's own CSS Module is imported with './'.`,
            },
          ],
        },
      ],
    },
  },
);
