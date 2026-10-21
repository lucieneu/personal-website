// Tests for the mdx-esm processor: which lines of an .mdx file get linted.
// Run with `npm run test:lint` (part of `npm run verify`).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { esmLines } from './mdx-esm.js';

/** The numbers (1-based) of the lines esmLines keeps. */
const keptLines = (lines) =>
  esmLines(lines.join('\n'))
    .split('\n')
    .flatMap((line, index) => (line ? [index + 1] : []));

describe('esmLines', () => {
  it('keeps every line in place, so line numbers match the .mdx file', () => {
    const text = ['import a from "a";', '', '# Title', '', 'Text.'].join('\n');
    assert.equal(esmLines(text).split('\n').length, 5);
  });

  it('keeps import and export statements, also when they span several lines', () => {
    const lines = [
      "import a from '@/a';",
      'import {',
      '  b,',
      "} from '@/b';",
      'export const meta = { draft: false };',
      '',
      '# Title',
    ];
    assert.deepEqual(keptLines(lines), [1, 2, 3, 4, 5]);
  });

  it('ends a statement block at a blank line', () => {
    assert.deepEqual(keptLines(["import a from '@/a';", '', 'Some text.']), [1]);
  });

  it('skips the frontmatter', () => {
    assert.deepEqual(
      keptLines(['---', 'title: x', 'import: y', '---', "import a from '@/a';"]),
      [5],
    );
  });

  it('skips fenced code samples, with ``` or ~~~ and longer fences', () => {
    const lines = [
      '```js',
      "import a from '../a';",
      '```',
      '~~~astro',
      "import b from './b';",
      '~~~',
      '````md',
      '```js',
      "import c from '../c';",
      '```',
      '````',
      "import d from '@/d';",
    ];
    assert.deepEqual(keptLines(lines), [12]);
  });

  it('ignores text that only starts like a statement', () => {
    assert.deepEqual(keptLines(['Importantly, this is text.', 'exported files', 'Import x']), []);
  });
});
