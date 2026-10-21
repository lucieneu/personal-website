import js from '@eslint/js';
import eslintPluginAstro from 'eslint-plugin-astro';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import aliasImports from './eslint/alias-imports.js';
import mdxEsm from './eslint/mdx-esm.js';

// This project's own lint rule and processor, in eslint/.
const local = { rules: { 'alias-imports': aliasImports }, processors: { 'mdx-esm': mdxEsm } };

export default defineConfig(
  globalIgnores(['dist/', '.astro/', 'test-results/', 'playwright-report/']),
  js.configs.recommended,
  tseslint.configs.recommended,
  eslintPluginAstro.configs.recommended,

  // Imports from src/ use the @/ alias (eslint/alias-imports.js).
  { plugins: { local }, rules: { 'local/alias-imports': 'error' } },

  // .mdx files: only their import and export lines are linted (eslint/mdx-esm.js). Those imports
  // are used in the MDX body, which the linted part doesn't contain.
  { files: ['**/*.mdx'], processor: 'local/mdx-esm' },
  { files: ['**/*.mdx/*.mjs'], rules: { 'no-unused-vars': 'off', 'no-undef': 'off' } },
);
