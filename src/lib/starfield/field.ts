// The card starfield's stars: where they are, how they drift and how they're projected onto the
// screen. Pure functions over typed arrays, so a frame allocates nothing and the math can be
// tested without a canvas. Spec: "3D background: card starfield" in docs/project-spec.md.

/** Moving and fixed stars on a 1440 × 900 screen; other screens get as many per area. */
const STAR_BASE = 1500;
const FIXED_BASE = 1000;
const BASE_AREA = 1440 * 900;
/** A screen gets at most this many times the base count, so a huge monitor stays cheap. */
const MAX_FACTOR = 2;
export const STAR_MAX = STAR_BASE * MAX_FACTOR;
export const FIXED_MAX = FIXED_BASE * MAX_FACTOR;
/** Depth range; a star nearer than Z_NEAR comes back at Z_FAR. */
export const Z_NEAR = 0.35;
export const Z_FAR = 3;
/** Depth units per second toward the viewer. */
const DRIFT = 0.004;
/** One full roll of the field, in seconds (10 minutes). */
const ROLL_PERIOD = 600;
/** At depth 1, one unit of position is this fraction of the viewport height. */
const SPREAD = 0.6;
/** A star's height in px at depth 1. */
const STAR_HEIGHT = 2.6;
/** Width : height of a star, like a portrait card. */
export const CARD_ASPECT = 0.72;
/** Depth over which a star fades in at the back and out at the front. */
const FADE_BACK = 0.4;
const FADE_FRONT = 0.15;
/** Seconds a star takes to appear (see `reveal`). */
export const FADE_IN = 2.5;
/**
 * Some stars don't last: this share of them fades out (over FADE_OUT seconds) after a life of
 * LIFE to LIFE + LIFE_SPREAD seconds, and after a gap of GAP to GAP + GAP_SPREAD seconds fades in
 * again somewhere else (see `renewField` and `renewFixed`).
 */
const MORTAL = 0.3;
const FADE_OUT = 4;
const LIFE = 10;
const LIFE_SPREAD = 50;
const GAP = 2;
const GAP_SPREAD = 10;

/** How many stars a `width` × `height` screen gets, for `base` stars on the base screen. */
const countFor = (base: number, width: number, height: number) =>
  Math.min(base * MAX_FACTOR, Math.round((base * width * height) / BASE_AREA));

export const starCount = (width: number, height: number) => countFor(STAR_BASE, width, height);
export const fixedCount = (width: number, height: number) => countFor(FIXED_BASE, width, height);

/** When each star appears and disappears (see `reveal`). */
export interface Lifetimes {
  /** When the star starts to fade in, in seconds. */
  appear: Float32Array;
  /** When it starts to fade out, in seconds; Infinity for a star that lasts. */
  vanish: Float32Array;
}

export interface Field extends Lifetimes {
  /** How many of the stars are in use; the arrays hold STAR_MAX. */
  count: number;
  /** Position across and down at depth 1, before the roll. */
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  /** Own brightness, 0.15–1. */
  brightness: Float32Array;
  /** Twinkle phase (radians) and speed (radians per second). */
  phase: Float32Array;
  speed: Float32Array;
  /** How far from the center a position reaches the screen's corners, at depth 1. */
  reach: number;
}

/** How far a position must reach to cover the corners of a `width` × `height` screen. */
export const reachOf = (width: number, height: number) =>
  Math.hypot(width, height) / 2 / (SPREAD * height);

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
    place(field, i, Z_NEAR + random() * (Z_FAR - Z_NEAR), random);
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

/** Whether star `i` has faded out completely at `seconds`, so it can return elsewhere. */
const gone = (stars: Lifetimes, i: number, seconds: number) =>
  seconds > stars.vanish[i]! + FADE_OUT;

/** After a gap, a star that has faded out fades in again at a random spot and depth. */
export function renewField(field: Field, seconds: number, random = Math.random) {
  for (let i = 0; i < field.count; i++) {
    if (!gone(field, i, seconds)) continue;
    place(field, i, Z_NEAR + random() * (Z_FAR - Z_NEAR), random);
    appearAt(field, i, seconds + GAP + random() * GAP_SPREAD, random);
  }
}

/** After a gap, a fixed star that has faded out fades in again at a random spot. */
export function renewFixed(stars: FixedStars, seconds: number, random = Math.random) {
  for (let i = 0; i < stars.count; i++) {
    if (!gone(stars, i, seconds)) continue;
    stars.x[i] = random();
    stars.y[i] = random();
    appearAt(stars, i, seconds + GAP + random() * GAP_SPREAD, random);
  }
}

/** The field's roll at `seconds`, in radians. */
export const rollAt = (seconds: number) => ((seconds % ROLL_PERIOD) / ROLL_PERIOD) * 2 * Math.PI;

/** Px per unit of position at depth `z`, on a screen `height` px tall. */
export const scaleAt = (z: number, height: number) => (SPREAD * height) / z;

/** A star's height in px at depth `z`. */
export const starHeight = (z: number) => STAR_HEIGHT / z;

/** Stars that don't move at all: a still, dimmer layer far behind the moving field. */
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
    stars.height[i] = starHeight(1.2 + random() * (Z_FAR - 1.2));
    stars.opacity[i] = 0.1 + random() * 0.5;
  }
  return stars;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Eases a fade in and out, so a star starts to appear (or disappear) gradually, not at once. */
const smooth = (t: number) => t * t * (3 - 2 * t);

/** How far star `i` is faded in (after `appear`) and not yet out (after `vanish`), 0–1. */
const shown = (stars: Lifetimes, i: number, seconds: number) =>
  smooth(clamp01((seconds - stars.appear[i]!) / FADE_IN)) *
  smooth(clamp01((stars.vanish[i]! + FADE_OUT - seconds) / FADE_OUT));

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
  brightnessOf(field, i, seconds) * shown(field, i, seconds);

/** Hides star `i` at once, until it's revealed again. */
export function hide(stars: Lifetimes, i: number) {
  stars.appear[i] = Infinity;
  stars.vanish[i] = Infinity;
}

/** A point on the screen, in CSS px from its top left corner. */
export interface Point {
  x: number;
  y: number;
}

/** Where star `i` is on a `width` × `height` screen at `seconds`, written to `out`. */
export function screenOf(
  field: Field,
  i: number,
  seconds: number,
  width: number,
  height: number,
  out: Point,
) {
  const scale = scaleAt(field.z[i]!, height);
  const x = field.x[i]! * scale;
  const y = field.y[i]! * scale;
  const roll = rollAt(seconds);
  out.x = width / 2 + x * Math.cos(roll) - y * Math.sin(roll);
  out.y = height / 2 + x * Math.sin(roll) + y * Math.cos(roll);
  return out;
}

/** Puts star `i` at depth `z` where it shows at (`x`, `y`) on the screen at `seconds`. */
export function placeOnScreen(
  field: Field,
  i: number,
  point: Point,
  z: number,
  seconds: number,
  width: number,
  height: number,
) {
  const scale = scaleAt(z, height);
  const dx = point.x - width / 2;
  const dy = point.y - height / 2;
  const roll = rollAt(seconds);
  field.x[i] = (dx * Math.cos(roll) + dy * Math.sin(roll)) / scale;
  field.y[i] = (-dx * Math.sin(roll) + dy * Math.cos(roll)) / scale;
  field.z[i] = z;
}

/** Fixed star `i`'s opacity at `seconds`: its own, times its fade in and out. */
export const fixedOpacityOf = (stars: FixedStars, i: number, seconds: number) =>
  stars.opacity[i]! * shown(stars, i, seconds);
