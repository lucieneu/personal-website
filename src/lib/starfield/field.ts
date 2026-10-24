// The card starfield's stars: where they are, how they drift and how they're projected onto the
// screen. Pure functions over typed arrays, so a frame allocates nothing and the math can be
// tested without a canvas. Spec: "3D background: card starfield" in docs/project-spec.md.

export const STAR_COUNT = 500;
/** Depth range; a star nearer than Z_NEAR comes back at Z_FAR. */
export const Z_NEAR = 0.35;
export const Z_FAR = 3;
/** Depth units per second toward the viewer. */
const DRIFT = 0.02;
/** One full roll of the field, in seconds (2.5 minutes). */
const ROLL_PERIOD = 150;
/** At depth 1, one unit of position is this fraction of the viewport height. */
const SPREAD = 0.6;
/** A star's height in px at depth 1. */
const STAR_HEIGHT = 2.6;
/** Width : height of a star, like a portrait card. */
export const CARD_ASPECT = 0.72;
/** Depth over which a star fades in at the back and out at the front. */
const FADE_BACK = 0.4;
const FADE_FRONT = 0.15;

export interface Field {
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
    x: new Float32Array(STAR_COUNT),
    y: new Float32Array(STAR_COUNT),
    z: new Float32Array(STAR_COUNT),
    brightness: new Float32Array(STAR_COUNT),
    phase: new Float32Array(STAR_COUNT),
    speed: new Float32Array(STAR_COUNT),
    reach: reachOf(width, height),
  };
  for (let i = 0; i < STAR_COUNT; i++) {
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
  for (let i = 0; i < STAR_COUNT; i++) {
    const z = field.z[i]! - DRIFT * seconds;
    if (z < Z_NEAR) place(field, i, Z_FAR, random);
    else field.z[i] = z;
  }
}

/** The field's roll at `seconds`, in radians. */
export const rollAt = (seconds: number) => ((seconds % ROLL_PERIOD) / ROLL_PERIOD) * 2 * Math.PI;

/** Px per unit of position at depth `z`, on a screen `height` px tall. */
export const scaleAt = (z: number, height: number) => (SPREAD * height) / z;

/** A star's height in px at depth `z`. */
export const starHeight = (z: number) => STAR_HEIGHT / z;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Star `i`'s opacity at `seconds`: its brightness, a ±20% twinkle and the fades at both ends. */
export function opacityOf(field: Field, i: number, seconds: number) {
  const z = field.z[i]!;
  const twinkle = 1 + 0.2 * Math.sin(field.phase[i]! + field.speed[i]! * seconds);
  const fade = clamp01((Z_FAR - z) / FADE_BACK) * clamp01((z - Z_NEAR) / FADE_FRONT);
  return clamp01(field.brightness[i]! * twinkle) * fade;
}
