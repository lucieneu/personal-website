// Page transitions: the card hand-off, animated on the page itself (Web Animations), not in a
// view transition. During a view transition the browser covers the page with a layer that
// catches every click and hover, so the menu wouldn't respond until the cards had settled; here
// the page stays fully interactive. ClientRouter still starts a view transition on every
// navigation, but nothing has a view-transition-name and the root isn't animated
// (src/styles/transitions.css), so it ends right after the swap.

/** A card tilted in perspective, `y` vh down (up when negative) and turned `deg` degrees. */
const tilted = (y: number, deg: number) =>
  `perspective(1000px) translateY(${y}vh) rotateX(${deg}deg) scale(0.97)`;

/** The old card sinks away in 200 ms: movement ease-in, fade ease-out. */
const OUT = { duration: 200, fill: 'forwards' } as const;
const OUT_MOVE = 'cubic-bezier(0.11, 0, 0.5, 0)';
const OUT_FADE = 'cubic-bezier(0.5, 1, 0.89, 1)';
/** The new card settles in from 120 to 620 ms (ease-out), fully visible after 55% of it. */
const IN = { duration: 500, delay: 120, fill: 'backwards' } as const;
const IN_MOVE = 'cubic-bezier(0.33, 1, 0.68, 1)';
const IN_FADE = [{ opacity: 0 }, { opacity: 1, offset: 0.55 }, { opacity: 1 }];
/** The nav island's current-page marker slides to the new item. */
const MARKER = { duration: 300, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' };

/** Each card turns around the middle of the screen, not its own middle (a long card). */
const turnOrigin = (box: DOMRect) => `50% ${Math.round(innerHeight / 2 - box.top)}px`;

/** A copy of the old card, in its place on the screen, that can't be focused or clicked. */
function ghostOf(card: HTMLElement) {
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
  return { ghost, origin: turnOrigin(box) };
}

/**
 * Plays the card hand-off on every navigation (spec: Page transitions): a copy of the old card
 * sinks away and fades out, while the new card settles in from above; on Back it's mirrored. The
 * footer below the card (phones) fades in with the new card, and the nav island's marker slides
 * from the old item to the new one. Nothing plays with reduced motion. Call it once, from a
 * script on every page.
 */
export function cardHandoff() {
  let back = false;
  let ghost: { ghost: HTMLElement; origin: string } | undefined;
  let marker: DOMRect | undefined;

  document.addEventListener('astro:before-preparation', (event) => {
    back = event.direction === 'back';
  });

  document.addEventListener('astro:before-swap', () => {
    ghost = undefined;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // A card from a navigation that's still running: gone at once.
    for (const old of document.querySelectorAll('[data-card-ghost]')) old.remove();
    const card = document.getElementById('content');
    if (!card) return;
    // A card that's still arriving falls away from its place.
    for (const animation of card.getAnimations()) animation.finish();
    ghost = ghostOf(card);
    marker = document.querySelector('[data-nav-marker]')?.getBoundingClientRect();
  });

  // After the swap the new page is scrolled into place (to the top, or back on Back).
  document.addEventListener('astro:after-swap', () => {
    if (!ghost) return;
    const sign = back ? -1 : 1;
    const old = ghost.ghost;
    document.body.append(old);
    const origin = { transformOrigin: ghost.origin };
    old.animate([{ ...origin }, { ...origin, transform: tilted(6 * sign, -6 * sign) }], {
      ...OUT,
      easing: OUT_MOVE,
      id: back ? 'card-out-up' : 'card-out',
    });
    const fade = old.animate([{ opacity: 1 }, { opacity: 0 }], {
      ...OUT,
      easing: OUT_FADE,
      id: 'card-out-fade',
    });
    fade.finished.then(
      () => old.remove(),
      () => old.remove(),
    );

    const card = document.getElementById('content');
    if (card) {
      const from = { transformOrigin: turnOrigin(card.getBoundingClientRect()) };
      card.animate(
        [
          { ...from, transform: tilted(-4 * sign, 6 * sign) },
          { ...from, transform: 'none' },
        ],
        { ...IN, easing: IN_MOVE, id: back ? 'card-in-up' : 'card-in' },
      );
      card.animate(IN_FADE, { ...IN, easing: 'linear', id: 'card-in-fade' });
    }
    document
      .querySelector('[data-page-footer]')
      ?.animate(IN_FADE, { ...IN, easing: 'linear', id: 'footer-in-fade' });

    // The marker moves from where the old one was (it only shows in the nav island).
    const next = document.querySelector('[data-nav-marker]');
    const to = next?.getBoundingClientRect();
    if (next && to?.width && marker?.width) {
      const shift = `translate(${marker.left - to.left}px, ${marker.top - to.top}px)`;
      const scale = `scale(${marker.width / to.width}, ${marker.height / to.height})`;
      next.animate(
        [
          { transformOrigin: '0 0', transform: `${shift} ${scale}` },
          { transformOrigin: '0 0', transform: 'none' },
        ],
        { ...MARKER, id: 'nav-marker' },
      );
    }
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
