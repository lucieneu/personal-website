// How stars in the field are projected onto the screen: depth, the field's slow roll and the
// sizes they give. Spec: "3D background: card starfield" in docs/project-spec.md.
import { lerp } from '@/lib/starfield/math';

/** Depth range; a star nearer than Z_NEAR comes back at Z_FAR. */
export const Z_NEAR = 0.35;
export const Z_FAR = 3;
/** One full roll of the field, in seconds (10 minutes). */
const ROLL_PERIOD = 600;
/** At depth 1, one unit of position is this fraction of the viewport height. */
const SPREAD = 0.6;
/** A star's height in px at depth 1. */
const STAR_HEIGHT = 2.6;
/** Width : height of a star, like a portrait card. */
export const CARD_ASPECT = 0.72;

/** Where stars are: position across and down at depth 1 (before the roll), and depth. */
export interface Positions {
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
}

/** A point on the screen, in CSS px from its top left corner. */
export interface Point {
  x: number;
  y: number;
}

/** A random depth in the range, for a star that appears somewhere in the field. */
export const randomDepth = (random: () => number) => lerp(Z_NEAR, Z_FAR, random());

/** How far a position must reach to cover the corners of a `width` × `height` screen. */
export const reachOf = (width: number, height: number) =>
  Math.hypot(width, height) / 2 / (SPREAD * height);

/** The field's roll at `seconds`, in radians. */
export const rollAt = (seconds: number) => ((seconds % ROLL_PERIOD) / ROLL_PERIOD) * 2 * Math.PI;

/** Px per unit of position at depth `z`, on a screen `height` px tall. */
export const scaleAt = (z: number, height: number) => (SPREAD * height) / z;

/** A star's height in px at depth `z`. */
export const starHeight = (z: number) => STAR_HEIGHT / z;

/** Where star `i` is on a `width` × `height` screen at `seconds`, written to `out`. */
export function screenOf(
  stars: Positions,
  i: number,
  seconds: number,
  width: number,
  height: number,
  out: Point,
) {
  const scale = scaleAt(stars.z[i]!, height);
  const x = stars.x[i]! * scale;
  const y = stars.y[i]! * scale;
  const roll = rollAt(seconds);
  out.x = width / 2 + x * Math.cos(roll) - y * Math.sin(roll);
  out.y = height / 2 + x * Math.sin(roll) + y * Math.cos(roll);
  return out;
}

/** Puts star `i` at depth `z` where it shows at `point` on the screen at `seconds`. */
export function placeOnScreen(
  stars: Positions,
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
  stars.x[i] = (dx * Math.cos(roll) + dy * Math.sin(roll)) / scale;
  stars.y[i] = (-dx * Math.sin(roll) + dy * Math.cos(roll)) / scale;
  stars.z[i] = z;
}
