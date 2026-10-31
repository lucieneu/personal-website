// How many stars there are, and how they appear: all at once or one by one when the page loads,
// and more of them when the window grows.
import { fixedCount, starCount } from '@/lib/starfield/counts';
import type { Field } from '@/lib/starfield/field';
import type { FixedStars } from '@/lib/starfield/fixed';
import type { Lifetimes } from '@/lib/starfield/lifetimes';
import { reachOf } from '@/lib/starfield/projection';

/** On a page load the other stars appear one by one over this many seconds (+ FADE_IN). */
const INTRO = 7;
/** This share of the stars is there from the start, so the first second isn't empty. */
const INTRO_START = 0.15;
/** Stars added by a larger window appear over this many seconds (+ FADE_IN). */
const GROW = 1;

/** Lets stars `from` up to `to` appear over `spread` seconds from now (0: at once). */
export type Appear = (stars: Lifetimes, from: number, to: number, spread: number) => void;

/** A new page load: some stars are there at once, the others appear one by one. */
export function introduce(field: Field, fixed: FixedStars, appear: Appear) {
  for (const stars of [field, fixed]) {
    const head = Math.round(stars.count * INTRO_START);
    appear(stars, 0, head, 0);
    appear(stars, head, stars.count, INTRO);
  }
}

/** A larger window gets more stars, which fade in; a smaller one draws fewer. */
export function resizeStars(
  field: Field,
  fixed: FixedStars,
  width: number,
  height: number,
  appear: Appear,
) {
  field.reach = reachOf(width, height);
  const stars = starCount(width, height);
  const fixedStars = fixedCount(width, height);
  if (stars > field.count) appear(field, field.count, stars, GROW);
  if (fixedStars > fixed.count) appear(fixed, fixed.count, fixedStars, GROW);
  field.count = stars;
  fixed.count = fixedStars;
}
