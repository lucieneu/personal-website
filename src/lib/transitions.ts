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
 * A link to the page you're on (the current item in the navigation, the name in the header on
 * the home page) plays no transition: ClientRouter would load the same page again and hand the
 * card off to itself. Such a click only scrolls back to the top. Links with a #hash and clicks
 * that open a new tab or window are left alone. Runs before ClientRouter's own click handler
 * (capture phase), which skips clicks that are already handled. Call it once, from a script on
 * every page.
 */
export function stayOnSamePage() {
  document.addEventListener(
    'click',
    (event) => {
      const link = event.target instanceof Element ? event.target.closest('a') : null;
      if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      if (event.altKey || (link.target && link.target !== '_self')) return;
      const to = new URL(link.href);
      const here = location;
      if (to.origin !== here.origin || to.pathname !== here.pathname) return;
      if (to.search !== here.search || to.hash) return;
      event.preventDefault();
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduced ? 'instant' : 'smooth' });
    },
    { capture: true },
  );
}

/**
 * Lets you click on while a page transition runs. Until the cards have settled (about 0.6 s) the
 * browser sends every click to <html>, so a click on a link would do nothing. Such a click is
 * passed on to the link under the pointer, which starts the next navigation right away (the
 * running transition is skipped). Clicks with a modifier key are left alone. Call it once, from a
 * script on every page.
 */
export function clickThroughTransitions() {
  document.addEventListener('click', (event) => {
    if (event.target !== document.documentElement) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    const link = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')].find((a) => {
      const box = a.getBoundingClientRect();
      const { clientX: x, clientY: y } = event;
      return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
    });
    link?.click();
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
