// Fails the build when an element's styles depend on the order of the CSS in the build.
// That order follows the order of the component imports, so it changes when imports are
// reordered (by hand or by "Organize imports"). It only matters when two rules from different
// sources set the same property on the same element with the same specificity, typically a
// parent's `class` (for margins) on a child's root element that sets the same property itself.
// This check finds those pairs on every built page. It doesn't follow ancestors, so it may
// report a pair that can't actually meet; it never misses one on an element's own classes.
import {
  appliesTo,
  elementsOf,
  orderConflicts,
  parseCss,
  readableSelector,
  type CssRule,
} from '@/integrations/css-rules';
import type { AstroIntegration } from 'astro';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Every .html file under `dir`. */
async function htmlFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => path.join(entry.parentPath, entry.name));
}

/** The CSS rules a page uses: its inline <style> blocks and linked stylesheets, in order. */
async function pageRules(html: string, root: string, sheets: Map<string, CssRule[]>) {
  const head = html.slice(0, Math.max(0, html.indexOf('<body')));
  const rules: CssRule[] = [];
  for (const [tag, inline] of head.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>|<link\b[^>]*>/g)) {
    if (inline !== undefined) {
      rules.push(...parseCss(inline));
      continue;
    }
    const href = /\bhref="([^"]+)"/.exec(tag)?.[1];
    if (!/\brel="stylesheet"/.test(tag) || !href?.startsWith('/')) continue;
    if (!sheets.has(href))
      sheets.set(href, parseCss(await readFile(path.join(root, href), 'utf8')));
    rules.push(...sheets.get(href)!);
  }
  return rules;
}

const describe = (rule: CssRule, property: string) => {
  const value = rule.declarations.get(property.split(' / ')[0]!)?.value ?? '';
  return `${rule.context ? `${rule.context} ` : ''}${readableSelector(rule.selector)} { ${property.split(' / ')[0]}: ${value} }`;
};

export default function checkCssOrder(): AstroIntegration {
  return {
    name: 'check-css-order',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const sheets = new Map<string, CssRule[]>();
        const problems = new Map<string, Set<string>>();
        let rulesRead = 0;
        let elementsChecked = 0;

        for (const file of await htmlFiles(root)) {
          const html = await readFile(file, 'utf8');
          const page = `/${path.relative(root, file).split(path.sep).join('/')}`.replace(
            /(index)?\.html$/,
            '',
          );
          const rules = await pageRules(html, root, sheets);
          rulesRead += rules.length;
          for (const element of elementsOf(html)) {
            const applying = rules.filter((rule) => appliesTo(rule, element));
            if (new Set(applying.map((rule) => rule.origin)).size < 2) continue;
            elementsChecked++;
            for (const [i, a] of applying.entries()) {
              for (const b of applying.slice(i + 1)) {
                for (const property of orderConflicts(a, b)) {
                  const key = `${describe(a, property)}\n    and ${describe(b, property.split(' / ').at(-1)!)}\n    on <${element.tag}>`;
                  problems.set(key, (problems.get(key) ?? new Set()).add(page));
                }
              }
            }
          }
        }

        // A check that finds nothing to check would pass forever, so that's an error too.
        if (rulesRead === 0 || elementsChecked === 0) {
          throw new Error(
            'check-css-order found no CSS rules or no elements with classes from more than one ' +
              'component. The format of the build output has probably changed; update ' +
              'src/integrations/css-rules.ts.',
          );
        }
        if (problems.size > 0) {
          const list = [...problems].map(([pair, pages]) => {
            const where = [...pages];
            const shown =
              where.slice(0, 3).join(', ') +
              (where.length > 3 ? ` and ${where.length - 3} more` : '');
            return `  ${pair} (${shown})`;
          });
          throw new Error(
            'These rules set the same property on the same element with the same specificity, so ' +
              'the order of the CSS decides which one wins, and reordering imports would change ' +
              `it:\n${list.join('\n')}\nSet the property in only one of the two components (a ` +
              "parent sets the margins around a child, the child doesn't), or give the rule that " +
              'should win a higher specificity.',
          );
        }
        logger.info(
          `No styles depend on the order of the CSS (${elementsChecked} elements with classes from more than one component).`,
        );
      },
    },
  };
}
