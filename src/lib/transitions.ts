// Custom view transition animations. The keyframes live in src/styles/transitions.css.
import type { TransitionDirectionalAnimations } from 'astro';

// The old content fades out (150 ms); the new content fades in and slides up 8 px (250 ms) once
// the old content is nearly gone. 100 ms delay + 250 ms keeps the whole transition at 350 ms.
const pair = {
  old: { name: 'content-out', duration: '150ms', easing: 'ease-in', fillMode: 'both' },
  new: {
    name: 'content-in',
    duration: '250ms',
    delay: '100ms',
    easing: 'ease-out',
    fillMode: 'both',
  },
};

/** The card's content crossfades the same way forwards and back. */
export const contentFade: TransitionDirectionalAnimations = {
  forwards: pair,
  backwards: pair,
};
