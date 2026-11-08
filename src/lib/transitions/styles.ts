// ClientRouter swaps the <head> with the page, so the copy of the old card would lose the styles
// of its own components (a project's row, say) halfway through falling away. These keep them.

const STYLES = 'link[rel="stylesheet"], style';

/**
 * Keeps the current page's styles that `next` doesn't have, by adding copies to its <head>.
 * ClientRouter keeps an element that's in both heads as it is, so nothing is loaded again.
 * Returns the copies, to remove them (`dropStyles`) once the old card is gone.
 */
export function keepStyles(next: Document) {
  const wanted = [...next.head.querySelectorAll(STYLES)];
  const kept = [...document.head.querySelectorAll(STYLES)]
    .filter((style) => !wanted.some((other) => other.isEqualNode(style)))
    .map((style) => style.cloneNode(true) as Element);
  next.head.append(...kept);
  return kept;
}

/** Removes the styles that `keepStyles` kept, unless the page has them for itself. */
export function dropStyles(kept: Element[]) {
  for (const style of document.head.querySelectorAll(STYLES))
    if (kept.some((copy) => copy.isEqualNode(style))) style.remove();
}
