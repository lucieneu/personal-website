// Page transitions: the card hand-off, animated on the page itself (Web Animations), not in a
// view transition. During a view transition the browser covers the page with a layer that
// catches every click and hover, so the menu wouldn't respond until the cards had settled; here
// the page stays fully interactive. ClientRouter still starts a view transition on every
// navigation, but nothing has a view-transition-name and the root isn't animated
// (src/styles/transitions.css), so it ends right after the swap.
import { animateFooter, animateIn, animateMarker, animateOut } from '@/lib/transitions/animations';
import { goingBack, trackDirection } from '@/lib/transitions/direction';
import { ghostOf, removeGhosts, turnOrigin } from '@/lib/transitions/ghost';
import { dropStyles, keepStyles } from '@/lib/transitions/styles';

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Plays the card hand-off on every navigation (spec: Page transitions): a copy of the old card
 * sinks away and fades out, while the new card settles in from above; on Back it's mirrored. The
 * footer below the card (phones) fades in with the new card, and the nav island's marker slides
 * from the old item to the new one. Nothing plays with reduced motion. Call it once, from a
 * script on every page.
 */
export function cardHandoff() {
  let ghost: { ghost: HTMLElement; origin: string } | undefined;
  let styles: Element[] = [];
  let marker: DOMRect | undefined;

  trackDirection();

  document.addEventListener('astro:before-swap', (event) => {
    ghost = undefined;
    if (reducedMotion()) return;
    // A card from a navigation that's still running: gone at once.
    removeGhosts();
    const card = document.getElementById('content');
    if (!card) return;
    // A card that's still arriving falls away from its place.
    for (const animation of card.getAnimations()) animation.finish();
    ghost = ghostOf(card);
    styles = keepStyles(event.newDocument);
    marker = document.querySelector('[data-nav-marker]')?.getBoundingClientRect();
  });

  // After the swap the new page is scrolled into place (to the top, or back on Back).
  document.addEventListener('astro:after-swap', () => {
    if (!ghost) return;
    const back = goingBack();
    const old = ghost.ghost;
    document.body.append(old);

    const kept = styles;
    const done = () => {
      old.remove();
      // Unless a newer navigation has taken them over for its own copy.
      if (styles === kept) dropStyles(kept);
    };
    animateOut(old, ghost.origin, back).finished.then(done, done);

    const card = document.getElementById('content');
    if (card) animateIn(card, turnOrigin(card.getBoundingClientRect().top, innerHeight), back);
    const footer = document.querySelector('[data-page-footer]');
    if (footer) animateFooter(footer);

    const next = document.querySelector('[data-nav-marker]');
    const to = next?.getBoundingClientRect();
    if (next && to?.width && marker?.width) animateMarker(next, marker, to);
  });
}
