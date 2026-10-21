// CSS helpers for the check-css-order build check: they read the built CSS into flat rules and
// tell when two rules from different sources can set the same property on the same element.
// Made for the CSS that Astro builds (minified CSS Modules and its own inline styles), not a full
// CSS parser.

export type Specificity = [ids: number, classes: number, types: number];

/** What a selector's last compound asks of the element itself (`a._link_x[href]` → a, link, href). */
export interface Subject {
  tag: string;
  classes: string[];
  /** Attribute selectors; `value` only for an exact match (`[name="value"]`). */
  attributes: { name: string; value?: string }[];
  /** '' for the element itself, or a pseudo-element such as '::before'. */
  pseudoElement: string;
}

export interface CssRule {
  /** One selector of the rule's selector list. */
  selector: string;
  /** The @media/@supports conditions around the rule; empty at the top level. */
  context: string;
  /** The cascade layer the rule is in; empty when it isn't in one. */
  layer: string;
  declarations: Map<string, { value: string; important: boolean }>;
  specificity: Specificity;
  subject: Subject;
  /** The CSS Module the rule comes from (the hash in its class names), or '' for global CSS. */
  origin: string;
}

/** An element of a built page: its tag, classes and attributes. */
export interface PageElement {
  tag: string;
  classes: Set<string>;
  attributes: Map<string, string>;
}

// A class name from a CSS Module, as Astro builds it: _name_hash_line (`_title_1tqza_26`).
const moduleClass = /\._[\w-]*?_([a-z0-9]+)_\d+(?![\w-])/;

/** The index of the first `char` at or after `from` that isn't inside quotes, or -1. */
function indexOutsideQuotes(text: string, char: string, from: number): number {
  let quote = '';
  for (let i = from; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = '';
    } else if (c === '"' || c === "'") quote = c;
    else if (c === char) return i;
  }
  return -1;
}

/** The index of the `}` that closes the `{` at `open`. */
function closingBrace(css: string, open: number): number {
  let depth = 0;
  let quote = '';
  for (let i = open; i < css.length; i++) {
    const c = css[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = '';
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  return css.length;
}

/** Splits `text` at `separator` where it isn't inside quotes, parentheses or brackets. */
export function splitTopLevel(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote = '';
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = '';
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (depth === 0 && (separator === ' ' ? /\s/.test(c!) : c === separator)) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

/** The last compound of a selector: the part that describes the element the rule styles. */
function lastCompound(selector: string): string {
  let depth = 0;
  let start = 0;
  for (let i = 0; i < selector.length; i++) {
    const c = selector[i]!;
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (depth === 0 && /[\s>+~]/.test(c)) start = i + 1;
  }
  return selector.slice(start);
}

/** Removes what's inside parentheses, so `:not(.x)` doesn't count as asking for `.x`. */
const withoutArguments = (text: string) => text.replace(/\((?:[^()]|\([^()]*\))*\)/g, '()');

export function subjectOf(selector: string): Subject {
  const compound = lastCompound(selector);
  const plain = withoutArguments(compound);
  const pseudoElement =
    /::[\w-]+(?:\(\))?|:(?:before|after|first-line|first-letter)\b/.exec(plain)?.[0] ?? '';
  const attributes = [
    ...plain.matchAll(/\[\s*([\w-]+)\s*(?:([~|^$*]?=)\s*("[^"]*"|'[^']*'|[^\]\s]+)\s*)?\]/g),
  ].map(([, name, operator, value]) => ({
    name: name!.toLowerCase(),
    value: operator === '=' ? value!.replace(/^["']|["']$/g, '') : undefined,
  }));
  return {
    tag: /^[a-zA-Z][\w-]*/.exec(plain)?.[0].toLowerCase() ?? '',
    classes: [...plain.matchAll(/\.([\w-]+)/g)].map((match) => match[1]!),
    attributes,
    pseudoElement,
  };
}

export function specificity(selector: string): Specificity {
  const total: Specificity = [0, 0, 0];
  const add = ([a, b, c]: Specificity) => {
    total[0] += a;
    total[1] += b;
    total[2] += c;
  };
  let rest = selector
    // :where() adds nothing; :is(), :not() and :has() add their most specific argument.
    .replace(/:where\((?:[^()]|\([^()]*\))*\)/g, '')
    .replace(/:(?:is|not|has)\(((?:[^()]|\([^()]*\))*)\)/g, (_, args: string) => {
      const options = splitTopLevel(args, ',').map(specificity);
      add(options.reduce((max, s) => (compare(s, max) > 0 ? s : max), [0, 0, 0]));
      return ' ';
    })
    .replace(
      /::[\w-]+(?:\((?:[^()]|\([^()]*\))*\))?|:(?:before|after|first-line|first-letter)\b/g,
      () => {
        add([0, 0, 1]);
        return ' ';
      },
    )
    .replace(/#[\w-]+/g, () => {
      add([1, 0, 0]);
      return ' ';
    })
    .replace(/\.[\w-]+|\[[^\]]*\]|:[\w-]+(?:\((?:[^()]|\([^()]*\))*\))?/g, () => {
      add([0, 1, 0]);
      return ' ';
    });
  rest = rest.replace(/\*/g, ' ');
  add([0, 0, (rest.match(/(?:^|[\s>+~])[a-zA-Z][\w-]*/g) ?? []).length]);
  return total;
}

const compare = (a: Specificity, b: Specificity) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

function parseDeclarations(body: string): CssRule['declarations'] {
  const declarations: CssRule['declarations'] = new Map();
  for (const declaration of splitTopLevel(body, ';')) {
    const colon = declaration.indexOf(':');
    if (colon < 1) continue;
    const name = declaration.slice(0, colon).trim();
    const raw = declaration.slice(colon + 1).trim();
    const important = /!\s*important$/i.test(raw);
    declarations.set(name.startsWith('--') ? name : name.toLowerCase(), {
      value: raw
        .replace(/!\s*important$/i, '')
        .trim()
        .replace(/\s+/g, ' '),
      important,
    });
  }
  return declarations;
}

/** Reads CSS into flat rules, one per selector, with the @media/@supports/@layer around them. */
export function parseCss(css: string, context = '', layer = ''): CssRule[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules: CssRule[] = [];
  let position = 0;
  while (position < text.length) {
    const open = indexOutsideQuotes(text, '{', position);
    if (open === -1) break;
    const close = closingBrace(text, open);
    // Statements without a block (`@layer astro;`) end at a ';' before the prelude.
    const prelude = text.slice(position, open).split(';').pop()!.trim();
    const body = text.slice(open + 1, close);
    position = close + 1;

    if (/^@(media|supports|container)\b/.test(prelude)) {
      rules.push(...parseCss(body, `${context}${prelude} `, layer));
    } else if (prelude.startsWith('@layer')) {
      const name = prelude.slice('@layer'.length).trim();
      rules.push(...parseCss(body, context, layer ? `${layer}.${name}` : name));
    } else if (!prelude.startsWith('@')) {
      // @keyframes, @font-face and @property don't style elements.
      const declarations = parseDeclarations(body);
      for (const selector of splitTopLevel(prelude, ',')) {
        rules.push({
          selector,
          context: context.trim(),
          layer,
          declarations,
          specificity: specificity(selector),
          subject: subjectOf(selector),
          origin: moduleClass.exec(selector)?.[1] ?? '',
        });
      }
    }
  }
  return rules;
}

/** The elements of a page's <body> that have a class (scripts and styles left out). */
export function elementsOf(html: string): PageElement[] {
  const body = html
    .slice(Math.max(0, html.indexOf('<body')))
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/g, '');
  const elements: PageElement[] = [];
  for (const [, tag, attributeText = ''] of body.matchAll(/<([a-zA-Z][\w-]*)(\s[^<>]*?)?\/?>/g)) {
    const attributes = new Map<string, string>();
    for (const [, name, ...values] of attributeText.matchAll(
      /([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g,
    )) {
      attributes.set(name!.toLowerCase(), values.find((value) => value !== undefined) ?? '');
    }
    const classes = new Set((attributes.get('class') ?? '').split(/\s+/).filter(Boolean));
    if (classes.size > 0) elements.push({ tag: tag!.toLowerCase(), classes, attributes });
  }
  return elements;
}

/** Whether a rule styles this element (or one of its pseudo-elements). Ancestors aren't checked. */
export function appliesTo(rule: CssRule, element: PageElement): boolean {
  const { tag, classes, attributes } = rule.subject;
  if (classes.length === 0 && attributes.length === 0) return false;
  if (tag && tag !== element.tag) return false;
  if (!classes.every((name) => element.classes.has(name))) return false;
  return attributes.every(
    ({ name, value }) =>
      element.attributes.has(name) &&
      (value === undefined || element.attributes.get(name) === value),
  );
}

// Shorthands, and the longhands they set.
const sides = ['top', 'right', 'bottom', 'left'];
const logicalSides: Record<string, string[]> = {
  block: ['top', 'bottom'],
  inline: ['left', 'right'],
  'block-start': ['top'],
  'block-end': ['bottom'],
  'inline-start': ['left'],
  'inline-end': ['right'],
};
const fixedShorthands: Record<string, string[]> = {
  inset: sides,
  gap: ['row-gap', 'column-gap'],
  overflow: ['overflow-x', 'overflow-y'],
  flex: ['flex-grow', 'flex-shrink', 'flex-basis'],
  'flex-flow': ['flex-direction', 'flex-wrap'],
  'border-radius': ['top-left', 'top-right', 'bottom-right', 'bottom-left'].map(
    (corner) => `border-${corner}-radius`,
  ),
};
// Shorthands whose longhands all start with their name (`background-color`).
const prefixShorthands = ['background', 'font', 'transition', 'animation', 'outline', 'list-style'];

/** The longhand properties a property sets (itself, if it isn't a shorthand). */
export function longhands(property: string): string[] {
  if (fixedShorthands[property]) return fixedShorthands[property];
  for (const box of ['margin', 'padding', 'scroll-margin', 'scroll-padding', 'inset']) {
    if (property === box && box !== 'inset') return sides.map((side) => `${box}-${side}`);
    const side = property.startsWith(`${box}-`) ? property.slice(box.length + 1) : '';
    const physical = logicalSides[side];
    if (physical) return physical.map((s) => (box === 'inset' ? s : `${box}-${s}`));
  }
  const border =
    /^border(?:-(top|right|bottom|left|block|inline|block-start|block-end|inline-start|inline-end))?(?:-(width|style|color))?$/.exec(
      property,
    );
  if (border) {
    const [, side, part] = border;
    const physical = side ? (logicalSides[side] ?? [side]) : sides;
    return physical.flatMap((s) =>
      (part ? [part] : ['width', 'style', 'color']).map((p) => `border-${s}-${p}`),
    );
  }
  const place = /^place-(items|content|self)$/.exec(property);
  if (place) return [`align-${place[1]}`, `justify-${place[1]}`];
  return [property];
}

/** Whether setting `a` and setting `b` can change the same longhand property. */
function overlap(a: string, b: string): boolean {
  if (a === b) return true;
  const coversPrefix = (short: string, long: string) =>
    prefixShorthands.includes(short) &&
    long.startsWith(`${short}-`) &&
    long !== 'outline-offset' &&
    !long.startsWith('font-feature') &&
    !long.startsWith('font-variation');
  if (coversPrefix(a, b) || coversPrefix(b, a)) return true;
  if ((a === 'font' && b === 'line-height') || (b === 'font' && a === 'line-height')) return true;
  const longB = new Set(longhands(b));
  return longhands(a).some((property) => longB.has(property));
}

/** The width range (in em) a context applies to, or null when it has other conditions too. */
function widthRange(context: string): [number, number] | null {
  let low = -Infinity;
  let high = Infinity;
  const rest = context.replace(
    /\(\s*(min-width|max-width|width)\s*(:|>=|<=|>|<)\s*([\d.]+)(em|rem|px)?\s*\)/g,
    (_, feature: string, operator: string, amount: string, unit = 'em') => {
      const em = Number(amount) / (unit === 'px' ? 16 : 1);
      if (feature === 'min-width' || operator === '>=' || operator === '>') low = Math.max(low, em);
      else high = Math.min(high, em);
      return '';
    },
  );
  return rest.includes('(') ? null : [low, high];
}

/** Whether two @media/@supports contexts can apply at the same time (true when unsure). */
function contextsOverlap(a: string, b: string): boolean {
  if (a === b) return true;
  const ra = widthRange(a);
  const rb = widthRange(b);
  return !ra || !rb || Math.max(ra[0], rb[0]) < Math.min(ra[1], rb[1]);
}

/** A property's value as a longhand gets it: a one-word shorthand value applies to each. */
function valueFor(property: string, value: string, longhand: string): string {
  if (property === longhand || splitTopLevel(value, ' ').length === 1) return value;
  return `${property}: ${value}`;
}

/**
 * The properties that two rules both set on an element with different values, where only the
 * order of the CSS decides which one wins: different sources, the same specificity, layer and
 * pseudo-element, and @media conditions that can apply together. Rules from the same file keep
 * their order, so they never conflict.
 */
export function orderConflicts(a: CssRule, b: CssRule): string[] {
  if (a.origin === b.origin || a.layer !== b.layer) return [];
  if (a.subject.pseudoElement !== b.subject.pseudoElement) return [];
  if (compare(a.specificity, b.specificity) !== 0 || !contextsOverlap(a.context, b.context))
    return [];
  const conflicts: string[] = [];
  for (const [propertyA, declarationA] of a.declarations) {
    for (const [propertyB, declarationB] of b.declarations) {
      if (declarationA.important !== declarationB.important || !overlap(propertyA, propertyB))
        continue;
      const longB = new Set(longhands(propertyB));
      const shared = longhands(propertyA).filter((p) => longB.has(p));
      const differs =
        shared.length === 0 ||
        shared.some(
          (p) =>
            valueFor(propertyA, declarationA.value, p) !==
            valueFor(propertyB, declarationB.value, p),
        );
      if (differs)
        conflicts.push(propertyA === propertyB ? propertyA : `${propertyA} / ${propertyB}`);
    }
  }
  return conflicts;
}

/** A selector with CSS Module class names shortened to the name in the source (`.title`). */
export const readableSelector = (selector: string) =>
  selector.replace(/\._([\w-]*?)_[a-z0-9]+_\d+(?![\w-])/g, '.$1');
