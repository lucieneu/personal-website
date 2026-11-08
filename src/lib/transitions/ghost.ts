// The old card, copied so it can fall away while the new page is already in place.

/** Each card turns around the middle of the screen, not its own middle (a long card). */
export const turnOrigin = (boxTop: number, viewportHeight: number) =>
  `50% ${Math.round(viewportHeight / 2 - boxTop)}px`;

/** A copy of the old card, in its place on the screen, that can't be focused or clicked. */
export function ghostOf(card: HTMLElement) {
  const box = card.getBoundingClientRect();
  const ghost = card.cloneNode(true) as HTMLElement;
  ghost.removeAttribute('id');
  ghost.removeAttribute('tabindex');
  ghost.inert = true;
  ghost.setAttribute('aria-hidden', 'true');
  ghost.dataset.cardGhost = '';
  Object.assign(ghost.style, {
    position: 'fixed',
    top: `${box.top}px`,
    left: `${box.left}px`,
    width: `${box.width}px`,
    margin: '0',
    // Behind the page (the header, the new card) and in front of the starfield, which comes
    // earlier in the page at the same z-index.
    zIndex: '-1',
    pointerEvents: 'none',
  });
  return { ghost, origin: turnOrigin(box.top, innerHeight) };
}

/** Removes copies of old cards that are still around from earlier navigations. */
export function removeGhosts() {
  for (const old of document.querySelectorAll('[data-card-ghost]')) old.remove();
}
