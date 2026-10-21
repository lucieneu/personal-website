// Tests for the alias-imports rule: on its own (RuleTester), and through the project's ESLint
// config for the files it has to reach (.astro frontmatter and <script> blocks, .mdx imports).
// A rule that silently stops matching would still let `eslint .` pass; these tests would fail.
// Run with `npm run test:lint` (part of `npm run verify`).
import { ESLint, RuleTester } from 'eslint';
import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import rule from './alias-imports.js';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const root = path.resolve(import.meta.dirname, '..');
const file = (name) => path.join(root, name);
const component = file('src/components/atoms/Link.astro');
const testFile = file('tests/navigation.spec.js');
const rootFile = file('astro.config.mjs');

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 'latest' } });

ruleTester.run('alias-imports', rule, {
  valid: [
    { filename: component, code: "import { formatDate } from '@/lib/date';" },
    { filename: component, code: "import { getCollection } from 'astro:content';" },
    { filename: component, code: "import styles from './Link.module.css';" },
    { filename: component, code: "import('@/islands/scene/SceneCanvas');" },
    { filename: component, code: "import.meta.glob('@/content/posts/**/*.mdx');" },
    // Not a plain string: the rule can't tell, so it lets it pass.
    { filename: component, code: 'import(modulePath);' },
    // Outside src/, './' to a file outside src/ is fine.
    { filename: testFile, code: "import { test } from './fixtures';" },
    { filename: rootFile, code: "import config from './playwright.config';" },
  ],
  invalid: [
    {
      filename: component,
      code: "import x from '../../lib/date';",
      errors: [{ messageId: 'parent' }],
    },
    {
      filename: component,
      code: "import List from './List.astro';",
      errors: [{ messageId: 'sameFolder' }],
    },
    // Another component's CSS Module, even in the same folder.
    {
      filename: component,
      code: "import s from './List.module.css';",
      errors: [{ messageId: 'sameFolder' }],
    },
    {
      filename: component,
      code: "export { x } from './x';",
      errors: [{ messageId: 'sameFolder' }],
    },
    { filename: component, code: "export * from '../y';", errors: [{ messageId: 'parent' }] },
    {
      filename: component,
      code: "import('./SceneCanvas');",
      errors: [{ messageId: 'sameFolder' }],
    },
    {
      filename: component,
      code: 'import(`./SceneCanvas`);',
      errors: [{ messageId: 'sameFolder' }],
    },
    {
      filename: component,
      code: "import.meta.glob('../content/*.md');",
      errors: [{ messageId: 'parent' }],
    },
    {
      filename: component,
      code: "import.meta.glob(['@/content/*.md', '!./skip.md']);",
      errors: [{ messageId: 'sameFolder' }],
    },
    {
      filename: testFile,
      code: "import { ui } from '../src/i18n/ui';",
      errors: [{ messageId: 'parent' }],
    },
    {
      filename: rootFile,
      code: "import { ui } from './src/i18n/ui';",
      errors: [{ messageId: 'sameFolder' }],
    },
  ],
});

describe('alias-imports through the project config', () => {
  const eslint = new ESLint({ cwd: root });

  /** The lines where the rule reports a problem when `code` is linted as the file `name`. */
  async function reportedLines(name, code) {
    const [result] = await eslint.lintText(code, { filePath: file(name) });
    return result.messages.filter((m) => m.ruleId === 'local/alias-imports').map((m) => m.line);
  }

  it('checks the frontmatter and <script> blocks of .astro files', async () => {
    const code = [
      '---',
      "import { formatDate } from '../../lib/date';",
      "import { isoDate } from '@/lib/date';",
      '---',
      '',
      '<time>{formatDate}{isoDate}</time>',
      '',
      '<script>',
      "  import('./SceneCanvas');",
      '</script>',
      '',
    ].join('\n');
    assert.deepEqual(await reportedLines('src/components/atoms/Probe.astro', code), [2, 9]);
  });

  it('checks the import lines of .mdx files, not their frontmatter, text or code samples', async () => {
    const code = [
      '---',
      'cover: ../cover.png',
      '---',
      '',
      "import Demo from '../../islands/Demo.tsx';",
      "import Fine from '@/islands/Demo.tsx';",
      '',
      "A sentence about import x from '../y'.",
      '',
      '```js',
      "import Sample from '../in-a-code-sample';",
      '```',
      '',
      "import Sibling from './Sibling.astro';",
      '',
    ].join('\n');
    assert.deepEqual(await reportedLines('src/content/posts/nl/probe.mdx', code), [5, 14]);
  });
});
