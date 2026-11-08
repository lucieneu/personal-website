// Stars that don't move at all: a still, dimmer layer far behind the moving field.
import { FIXED_MAX, fixedCount } from '@/lib/starfield/counts';
import { fadeOf, isGone, type Lifetimes, reappear } from '@/lib/starfield/lifetimes';
import { lerp } from '@/lib/starfield/math';
import { starHeight, Z_FAR } from '@/lib/starfield/projection';

/** A fixed star is as tall as a moving star at a depth from here to Z_FAR. */
const DEPTH_NEAR = 1.2;

export interface FixedStars extends Lifetimes {
  /** How many of the stars are in use; the arrays hold FIXED_MAX. */
  count: number;
  /** Position as a fraction of the screen's width and height. */
  x: Float32Array;
  y: Float32Array;
  /** Height in px, like a moving star at depth 1.2–3. */
  height: Float32Array;
  /** 0.1–0.6: dimmer than the moving stars. */
  opacity: Float32Array;
}

export function createFixedStars(width: number, height: number, random = Math.random) {
  const stars: FixedStars = {
    count: fixedCount(width, height),
    x: new Float32Array(FIXED_MAX),
    y: new Float32Array(FIXED_MAX),
    height: new Float32Array(FIXED_MAX),
    opacity: new Float32Array(FIXED_MAX),
    appear: new Float32Array(FIXED_MAX),
    vanish: new Float32Array(FIXED_MAX),
  };
  for (let i = 0; i < FIXED_MAX; i++) {
    stars.x[i] = random();
    stars.y[i] = random();
    stars.height[i] = starHeight(lerp(DEPTH_NEAR, Z_FAR, random()));
    stars.opacity[i] = 0.1 + random() * 0.5;
  }
  return stars;
}

/** After a gap, a fixed star that has faded out fades in again at a random spot. */
export function renewFixed(stars: FixedStars, seconds: number, random = Math.random) {
  for (let i = 0; i < stars.count; i++) {
    if (!isGone(stars, i, seconds)) continue;
    stars.x[i] = random();
    stars.y[i] = random();
    reappear(stars, i, seconds, random);
  }
}

/** Fixed star `i`'s opacity at `seconds`: its own, times its fade in and out. */
export const fixedOpacityOf = (stars: FixedStars, i: number, seconds: number) =>
  stars.opacity[i]! * fadeOf(stars, i, seconds);
