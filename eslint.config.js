import js from '@eslint/js';
import eslintPluginAstro from 'eslint-plugin-astro';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

// Files in src/ import each other with the @/ alias: no '../', and no './' except a
// component's CSS Module next to it ('./Link.module.css'). Also covers <script> blocks.
const aliasOnly = {
  regex: '^\\.(?!/[^/]+\\.module\\.css$)',
  message: "Import with the @/ alias (for example '@/lib/date').",
};

export default defineConfig(
  globalIgnores(['dist/', '.astro/', 'test-results/', 'playwright-report/']),
  js.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  eslintPluginAstro.configs.recommended,

  // With noUncheckedIndexedAccess, `array[i]!` is the plain way to read a typed array in a loop,
  // and Playwright tests assert what they just found.
  { rules: { '@typescript-eslint/no-non-null-assertion': 'off' } },

  {
    files: ['src/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [aliasOnly] }] },
  },

  // src/lib is plain TypeScript that the components use, never the other way around.
  {
    files: ['src/lib/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            aliasOnly,
            {
              regex: '^@/(components|layouts|pages)/',
              message: 'src/lib must not depend on components, layouts or pages.',
            },
          ],
        },
      ],
    },
  },

  // Keeps files and functions small enough to read; a warning, so it points rather than blocks.
  {
    files: ['src/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'max-lines': ['warn', { max: 150, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', 10],
    },
  },
);
