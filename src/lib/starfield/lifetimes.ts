// When stars appear and disappear. Both kinds of star (moving and fixed) fade in one by one, and
// some fade out after a while and return elsewhere.
import { clamp01, smooth } from '@/lib/starfield/math';

/** Seconds a star takes to appear (see `fadeOf`). */
export const FADE_IN = 2.5;
/**
 * Some stars don't last: this share of them fades out (over FADE_OUT seconds) after a life of
 * LIFE to LIFE + LIFE_SPREAD seconds, and after a gap of GAP to GAP + GAP_SPREAD seconds fades in
 * again somewhere else (see `isGone` and `reappear`).
 */
const MORTAL = 0.3;
const FADE_OUT = 4;
const LIFE = 10;
const LIFE_SPREAD = 50;
const GAP = 2;
const GAP_SPREAD = 10;

/** When each star appears and disappears. */
export interface Lifetimes {
  /** When the star starts to fade in, in seconds. */
  appear: Float32Array;
  /** When it starts to fade out, in seconds; Infinity for a star that lasts. */
  vanish: Float32Array;
}

/** Lets star `i` appear at `appear` seconds, and decides whether and when it fades out. */
function appearAt(stars: Lifetimes, i: number, appear: number, random: () => number) {
  stars.appear[i] = appear;
  stars.vanish[i] = random() < MORTAL ? appear + FADE_IN + LIFE + random() * LIFE_SPREAD : Infinity;
}

/**
 * Lets stars `from` up to `to` fade in, each starting at a random moment between `start` and
 * `start + spread` seconds, so they don't all appear at once.
 */
export function reveal(
  stars: Lifetimes,
  from: number,
  to: number,
  start: number,
  spread: number,
  random = Math.random,
) {
  for (let i = from; i < to; i++) appearAt(stars, i, start + random() * spread, random);
}

/** Hides star `i` at once, until it's revealed again. */
export function hide(stars: Lifetimes, i: number) {
  stars.appear[i] = Infinity;
  stars.vanish[i] = Infinity;
}

/** Whether star `i` has faded out completely at `seconds`, so it can return elsewhere. */
export const isGone = (stars: Lifetimes, i: number, seconds: number) =>
  seconds > stars.vanish[i]! + FADE_OUT;

/** After a gap, lets star `i` (which has faded out) fade in again. */
export const reappear = (stars: Lifetimes, i: number, seconds: number, random: () => number) =>
  appearAt(stars, i, seconds + GAP + random() * GAP_SPREAD, random);

/** How far star `i` is faded in (after `appear`) and not yet out (after `vanish`), 0–1. */
export const fadeOf = (stars: Lifetimes, i: number, seconds: number) =>
  smooth(clamp01((seconds - stars.appear[i]!) / FADE_IN)) *
  smooth(clamp01((stars.vanish[i]! + FADE_OUT - seconds) / FADE_OUT));
