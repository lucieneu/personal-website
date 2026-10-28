// Page transitions. The card hand-off's animations live in src/styles/transitions.css.

const CARD_NAMES = ['card-a', 'card-b'];

/** How far the card's top is from the top of the screen, in px, for the turn's center. */
const cardTop = (card: HTMLElement) => `${Math.round(card.getBoundingClientRect().top)}px`;

/**
 * Prepares the card hand-off on every navigation. The new page's card gets the other of two view
 * transition names than the current card: with different names the old and new card aren't
 * paired, so each moves from its own place (the old one from where it was scrolled to) instead
 * of the old card jumping to the new card's position first. Both cards' positions on screen are
 * passed to the CSS (`--old-card-top`, `--new-card-top`), so each turns around the middle of the
 * screen, however far the page is scrolled. Call it once, from a script on every page.
 */
export function prepareCardHandoff() {
  document.addEventListener('astro:before-swap', (event) => {
    const current = document.getElementById('content');
    const next = event.newDocument.getElementById('content');
    if (!current || !next) return;
    const name = getComputedStyle(current).viewTransitionName;
    next.style.viewTransitionName = name === CARD_NAMES[0] ? CARD_NAMES[1]! : CARD_NAMES[0]!;
    // On the new <html>: ClientRouter replaces the attributes of <html> with the new page's.
    event.newDocument.documentElement.style.setProperty('--old-card-top', cardTop(current));
  });
  // After the swap the new page is scrolled into place (to the top, or back on Back).
  document.addEventListener('astro:after-swap', () => {
    const card = document.getElementById('content');
    if (card) document.documentElement.style.setProperty('--new-card-top', cardTop(card));
  });
}

/**
 * After a client-side navigation, moves focus to the new content (`#content`), so keyboard and
 * screen reader users start at the top of the page they asked for, as on a full page load.
 * ClientRouter announces the new page title on its own. preventScroll keeps the restored scroll
 * position on Back. Call it once, from a script on every page.
 */
export function focusContentAfterNavigation() {
  document.addEventListener('astro:after-swap', () => {
    document.getElementById('content')?.focus({ preventScroll: true });
  });
}
