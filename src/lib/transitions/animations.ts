// The animations of the card hand-off, with their timings and easings. Web Animations on the page
// itself, so the page stays interactive while they play.

/** A card tilted in perspective, `y` vh down (up when negative) and turned `deg` degrees. */
export const tilted = (y: number, deg: number) =>
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

/** The old card sinks away and fades out; returns the fade, which ends last. */
export function animateOut(old: HTMLElement, origin: string, back: boolean) {
  const sign = back ? -1 : 1;
  const transformOrigin = { transformOrigin: origin };
  old.animate([transformOrigin, { ...transformOrigin, transform: tilted(6 * sign, -6 * sign) }], {
    ...OUT,
    easing: OUT_MOVE,
    id: back ? 'card-out-up' : 'card-out',
  });
  return old.animate([{ opacity: 1 }, { opacity: 0 }], {
    ...OUT,
    easing: OUT_FADE,
    id: 'card-out-fade',
  });
}

/** The new card settles in from above (below on Back). */
export function animateIn(card: HTMLElement, origin: string, back: boolean) {
  const sign = back ? -1 : 1;
  const transformOrigin = { transformOrigin: origin };
  card.animate(
    [
      { ...transformOrigin, transform: tilted(-4 * sign, 6 * sign) },
      { ...transformOrigin, transform: 'none' },
    ],
    { ...IN, easing: IN_MOVE, id: back ? 'card-in-up' : 'card-in' },
  );
  card.animate(IN_FADE, { ...IN, easing: 'linear', id: 'card-in-fade' });
}

/** The footer below the card (phones) fades in with the new card. */
export function animateFooter(footer: Element) {
  footer.animate(IN_FADE, { ...IN, easing: 'linear', id: 'footer-in-fade' });
}

/** The transform that puts the marker `to` where it was `from`: a shift and a scale. */
export const markerTransform = (from: DOMRect, to: DOMRect) =>
  `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;

/** The marker moves from where the old one was (it only shows in the nav island). */
export function animateMarker(marker: Element, from: DOMRect, to: DOMRect) {
  marker.animate(
    [
      { transformOrigin: '0 0', transform: markerTransform(from, to) },
      { transformOrigin: '0 0', transform: 'none' },
    ],
    { ...MARKER, id: 'nav-marker' },
  );
}
