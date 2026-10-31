// The moving stars: where they are and how they drift. Pure functions over typed arrays, so a
// frame allocates nothing and the math can be tested without a canvas. Spec: "3D background:
// card starfield" in docs/project-spec.md.
import { STAR_MAX, starCount } from '@/lib/starfield/counts';
import { fadeOf, isGone, type Lifetimes, reappear } from '@/lib/starfield/lifetimes';
import { clamp01 } from '@/lib/starfield/math';
import { type Positions, randomDepth, reachOf, Z_FAR, Z_NEAR } from '@/lib/starfield/projection';

/** Depth units per second toward the viewer. */
const DRIFT = 0.004;
/** Depth over which a star fades in at the back and out at the front. */
const FADE_BACK = 0.4;
const FADE_FRONT = 0.15;

export interface Field extends Lifetimes, Positions {
  /** How many of the stars are in use; the arrays hold STAR_MAX. */
  count: number;
  /** Own brightness, 0.15–1. */
  brightness: Float32Array;
  /** Twinkle phase (radians) and speed (radians per second). */
  phase: Float32Array;
  speed: Float32Array;
  /** How far from the center a position reaches the screen's corners, at depth 1. */
  reach: number;
}

/** Puts star `i` at depth `z`, at a random spot that's on screen at that depth (or will be). */
function place(field: Field, i: number, z: number, random: () => number) {
  // Uniform over a disc that covers the screen at this depth, so stars are spread evenly.
  const radius = field.reach * z * Math.sqrt(random());
  const angle = random() * 2 * Math.PI;
  field.x[i] = radius * Math.cos(angle);
  field.y[i] = radius * Math.sin(angle);
  field.z[i] = z;
}

export function createField(width: number, height: number, random = Math.random): Field {
  const field: Field = {
    count: starCount(width, height),
    x: new Float32Array(STAR_MAX),
    y: new Float32Array(STAR_MAX),
    z: new Float32Array(STAR_MAX),
    brightness: new Float32Array(STAR_MAX),
    phase: new Float32Array(STAR_MAX),
    speed: new Float32Array(STAR_MAX),
    appear: new Float32Array(STAR_MAX),
    vanish: new Float32Array(STAR_MAX),
    reach: reachOf(width, height),
  };
  for (let i = 0; i < STAR_MAX; i++) {
    place(field, i, randomDepth(random), random);
    field.brightness[i] = 0.15 + random() * 0.85;
    field.phase[i] = random() * 2 * Math.PI;
    // One twinkle every 2–6 seconds.
    field.speed[i] = (2 * Math.PI) / (2 + random() * 4);
  }
  return field;
}

/** Moves every star `seconds` closer; a star that gets too close comes back far away. */
export function drift(field: Field, seconds: number, random = Math.random) {
  for (let i = 0; i < field.count; i++) {
    const z = field.z[i]! - DRIFT * seconds;
    if (z < Z_NEAR) place(field, i, Z_FAR, random);
    else field.z[i] = z;
  }
}

/** After a gap, a star that has faded out fades in again at a random spot and depth. */
export function renewField(field: Field, seconds: number, random = Math.random) {
  for (let i = 0; i < field.count; i++) {
    if (!isGone(field, i, seconds)) continue;
    place(field, i, randomDepth(random), random);
    reappear(field, i, seconds, random);
  }
}

/**
 * Star `i`'s opacity at `seconds` once it's fully shown: its brightness, a ±20% twinkle and the
 * fades at both ends of the depth range.
 */
export function brightnessOf(field: Field, i: number, seconds: number) {
  const z = field.z[i]!;
  const twinkle = 1 + 0.2 * Math.sin(field.phase[i]! + field.speed[i]! * seconds);
  const fade = clamp01((Z_FAR - z) / FADE_BACK) * clamp01((z - Z_NEAR) / FADE_FRONT);
  return clamp01(field.brightness[i]! * twinkle) * fade;
}

/** Star `i`'s opacity at `seconds`: its brightness, times its fade in and out. */
export const opacityOf = (field: Field, i: number, seconds: number) =>
  brightnessOf(field, i, seconds) * fadeOf(field, i, seconds);
