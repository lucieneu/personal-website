// Lint rule: import files in src/ with the @/ alias (`@/lib/date`), not with a relative path.
// - `../` is never allowed.
// - `./` is only allowed for a file outside src/ (`./fixtures` in tests/) and for a component's
//   own CSS Module (`./Link.module.css` in Link.astro). Any other file in src/, also one in the
//   same folder, uses @/.
// Checks import and export declarations, dynamic import() and import.meta.glob(), including the
// <script> blocks of .astro files and, through the mdx-esm processor, the imports in .mdx files.
import path from 'node:path';

/** The string a node holds, if it's a plain string literal or a template without expressions. */
function stringOf(node) {
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis[0].value.cooked;
  }
  return undefined;
}

/** `import.meta.glob(...)` */
function isGlobCall(node) {
  const { callee } = node;
  return (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'MetaProperty' &&
    callee.object.meta.name === 'import' &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'glob'
  );
}

export default {
  meta: {
    type: 'problem',
    docs: { description: 'Import from src/ with the @/ alias instead of a relative path.' },
    schema: [],
    messages: {
      parent: "Use the @/ alias (for example '@/lib/date') instead of a path with '../'.",
      sameFolder:
        "Import files in src/ with the @/ alias (for example '@/lib/date'). Only a component's own CSS Module is imported with './' ('{{own}}').",
    },
  },

  create(context) {
    // For a <script> block or an MDX import, this is the .astro or .mdx file itself.
    const file = context.physicalFilename;
    const src = path.join(context.cwd, 'src');
    const own = `./${path.basename(file, path.extname(file))}.module.css`;
    const isInSrc = (spec) => {
      const relative = path.relative(src, path.resolve(path.dirname(file), spec));
      return !relative.startsWith('..') && !path.isAbsolute(relative);
    };

    function check(node, specifier) {
      // Glob patterns may start with '!' to exclude files.
      const spec = specifier?.replace(/^!/, '');
      if (!spec?.startsWith('.')) return;
      if (spec.startsWith('../')) context.report({ node, messageId: 'parent' });
      else if (spec !== own && isInSrc(spec)) {
        context.report({ node, messageId: 'sameFolder', data: { own } });
      }
    }

    const checkSource = (node) => node.source && check(node.source, stringOf(node.source));

    return {
      ImportDeclaration: checkSource,
      ExportNamedDeclaration: checkSource,
      ExportAllDeclaration: checkSource,
      ImportExpression: checkSource,
      CallExpression(node) {
        if (!isGlobCall(node)) return;
        const [patterns] = node.arguments;
        const list = patterns?.type === 'ArrayExpression' ? patterns.elements : [patterns];
        for (const pattern of list) check(pattern, stringOf(pattern));
      },
    };
  },
};
