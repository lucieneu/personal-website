// ESLint processor for .mdx files: lints only their import and export statements (MDX "ESM"),
// so the alias-imports rule sees them too. Everything else becomes a blank line, so reported
// line numbers match the .mdx file. Frontmatter and fenced code blocks are skipped: a code sample
// may well show an import with '../'.
// An ESM block is a line at the start of the file's top level that begins with `import` or
// `export`, up to the next blank line (MDX's own rule).

/** Keeps the lines of the MDX file's ESM blocks and blanks every other line. */
export function esmLines(text) {
  const lines = text.split(/\r?\n/);
  const kept = [];
  let inFrontmatter = lines[0]?.trim() === '---';
  let fence = null;
  let inEsm = false;

  lines.forEach((line, index) => {
    if (inFrontmatter) {
      if (index > 0 && line.trim() === '---') inFrontmatter = false;
      kept.push('');
      return;
    }
    const fenceMark = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (fence) {
      if (fenceMark && fenceMark[0] === fence[0] && fenceMark.length >= fence.length) fence = null;
      kept.push('');
      return;
    }
    if (fenceMark) {
      fence = fenceMark;
      inEsm = false;
      kept.push('');
      return;
    }
    if (line.trim() === '') inEsm = false;
    else if (/^(import|export)\b/.test(line)) inEsm = true;
    kept.push(inEsm ? line : '');
  });
  return kept.join('\n');
}

export default {
  meta: { name: 'mdx-esm' },
  preprocess: (text) => [{ text: esmLines(text), filename: 'esm.mjs' }],
  postprocess: (messages) => messages.flat(),
  supportsAutofix: false,
};
