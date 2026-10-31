// Sections 1 and 4 of the card hand-off (docs/project-spec.md, Page transitions): as the old card
// goes, a star near the sidebar flares up and fades out where it is; after it, a card outline
// flows in from below the bottom edge and becomes a star next to the new card. On Back the
// outline is mirrored top to bottom. Pure math on the field's clock; drawn on the canvas above the card.
import {
  brightnessOf,
  CARD_ASPECT,
  FADE_IN,
  type Field,
  hide,
  opacityOf,
  placeOnScreen,
  type Point,
  reveal,
  screenOf,
  starHeight,
} from '@/lib/starfield/field';

/**
 * Section 1: in FLARE seconds the star swells to FLARE_HEIGHT px (in the first FLARE_GROW of
 * that time), brightens by FLARE_BRIGHTER until FLARE_PEAK of the time, then fades out in place.
 */
const FLARE = 0.4;
const FLARE_HEIGHT = 6;
const FLARE_GROW = 0.4;
const FLARE_BRIGHTER = 0.3;
const FLARE_PEAK = 0.3;
/** It's picked at a depth in this range, so it's neither tiny nor already large. */
const LEAVE_NEAR = 0.9;
const LEAVE_FAR = 2.2;
/**
 * Section 4: a RETURN_HEIGHT px outline, from RETURN_FROM to RETURN_TO seconds, that ends as a
 * star at depth RETURN_DEPTH. In its last RETURN_FADE it fades to that star's brightness.
 */
/**
 * It starts just after the old card begins to leave, as the card's sinking speeds up and the new
 * card starts to arrive, so they read as one movement.
 */
const RETURN_FROM = 0.12;
const RETURN_TO = 3.12;
const RETURN_HEIGHT = 24;
const RETURN_DEPTH = 1.6;
const RETURN_FADE = 0.4;
/** The returning outline is at most this opaque. */
const ITEM_OPACITY = 0.55;
/** The outline starts this many px past the bottom edge, beyond its corners. */
const MARGIN = 6;
/** A card further than this from the left edge has the sidebar next to it (desktop). */
const SIDEBAR_FROM = 100;
/** On phones the strip at the side is at least this wide. */
const PHONE_STRIP = 16;
/** Above this height (px) the returning item is the outline of an empty card. */
const OUTLINE_FROM = 4;

/** An item to draw: its center, height and opacity, and whether it's an outline or filled. */
export interface Item extends Point {
  h: number;
  opacity: number;
  outline: boolean;
}

export interface Handoff {
  /** When it started, on the field's clock. */
  start: number;
  /** The star that flares out, and returns elsewhere (its index in the field). */
  star: number;
  /** Back: mirrored, so every y below is measured from the bottom edge instead of the top. */
  back: boolean;
  /** Which way the card is: 1 to the right, -1 to the left. */
  inward: number;
  /** Section 1's star where it was, with its height and opacity. */
  from: Item;
  /** Where section 4's outline starts, below the bottom edge. */
  startX: number;
}

const halfDiagonal = (h: number) => Math.hypot(h, h * CARD_ASPECT) / 2;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (t: number) => t * t * (3 - 2 * t);
/**
 * Ease-out: fastest at the start, while the outline is still near the edge, and slower and slower
 * toward the end, as if it settles far away.
 */
const outExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
/** From `a` to `b` on a log scale, so growing and shrinking look even. */
const logLerp = (a: number, b: number, t: number) => a * (b / a) ** t;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const point = { x: 0, y: 0 };

/**
 * Starts the hand-off on a `width` × `height` screen whose card spans `card` horizontally: picks
 * a star next to the card in the upper half (the lower half on Back) to leave, hides it, and
 * puts it, still hidden, where it will return. Returns nothing if no star fits.
 */
export function startHandoff(
  field: Field,
  seconds: number,
  width: number,
  height: number,
  card: { left: number; right: number },
  back: boolean,
  random = Math.random,
): Handoff | undefined {
  const mirror = (y: number) => (back ? height - y : y);
  // Desktop: the sidebar column. Phones: a narrow strip at one side, picked at random.
  const phone = card.left < SIDEBAR_FROM;
  const left = !phone || random() < 0.5;
  const [from, to] = left
    ? [0, Math.max(card.left, PHONE_STRIP)]
    : [Math.min(card.right, width - PHONE_STRIP), width];
  const middle = (from + to) / 2;

  // The star nearest the middle of that strip, in the upper half and fully shown.
  let star = -1;
  let best = Infinity;
  for (let i = 0; i < field.count; i++) {
    const z = field.z[i]!;
    if (z < LEAVE_NEAR || z > LEAVE_FAR || opacityOf(field, i, seconds) < 0.3) continue;
    const { x, y } = screenOf(field, i, seconds, width, height, point);
    if (x < 0 || x > width || mirror(y) < 0 || mirror(y) > height / 2) continue;
    if (Math.abs(x - middle) < best) [star, best] = [i, Math.abs(x - middle)];
  }
  if (star < 0) return undefined;

  screenOf(field, star, seconds, width, height, point);
  const handoff: Handoff = {
    start: seconds,
    star,
    back,
    inward: left ? 1 : -1,
    from: {
      x: point.x,
      y: mirror(point.y),
      h: starHeight(field.z[star]!),
      opacity: opacityOf(field, star, seconds),
      outline: false,
    },
    startX: 0,
  };
  hide(field, star);

  // Where it returns: 30–70% down the sidebar column, or 10–40% down the strip on a phone.
  point.x = lerp(from, to, 0.3 + 0.4 * random());
  point.y = mirror((phone ? 0.1 + 0.3 * random() : 0.3 + 0.4 * random()) * height);
  placeOnScreen(field, star, point, RETURN_DEPTH, seconds, width, height);
  // Desktop: from below the card, 30% of the width toward it; phones: straight up the strip.
  handoff.startX = point.x + (phone ? 0 : handoff.inward * 0.3 * width);
  return handoff;
}

/** Whether the hand-off is over at `seconds`; then call finishHandoff. */
export const handoffDone = (handoff: Handoff, seconds: number) =>
  seconds - handoff.start >= RETURN_TO;

/** Shows the returning star in its place: at the end, or at once when a new navigation starts. */
export function finishHandoff(field: Field, handoff: Handoff, seconds: number) {
  reveal(field, handoff.star, handoff.star + 1, seconds - FADE_IN, 0);
}

/**
 * Writes the items to draw at `seconds` into `out`, from index `from` on (at most two);
 * returns the index after the last one written.
 */
export function itemsAt(
  handoff: Handoff,
  field: Field,
  seconds: number,
  width: number,
  height: number,
  out: Item[],
  from = 0,
) {
  const mirror = (y: number) => (handoff.back ? height - y : y);
  const t = seconds - handoff.start;
  let count = from;

  // Section 1: swells and brightens in place, then fades out (a filled star throughout).
  if (t < FLARE) {
    const p = t / FLARE;
    const { from } = handoff;
    const peak = Math.min(1, from.opacity + FLARE_BRIGHTER);
    const item = out[count++]!;
    item.x = from.x;
    item.y = mirror(from.y);
    item.h = logLerp(from.h, FLARE_HEIGHT, smooth(clamp01(p / FLARE_GROW)));
    item.opacity =
      p < FLARE_PEAK
        ? lerp(from.opacity, peak, smooth(p / FLARE_PEAK))
        : lerp(peak, 0, smooth((p - FLARE_PEAK) / (1 - FLARE_PEAK)));
    item.outline = false;
  }

  // Section 4: from below the bottom edge, low and rising late, into the star's place. The
  // target is the hidden star's live position, so the item ends exactly where the star shows.
  if (t >= RETURN_FROM) {
    const u = clamp01((t - RETURN_FROM) / (RETURN_TO - RETURN_FROM));
    const e = outExpo(u);
    const target = screenOf(field, handoff.star, seconds, width, height, point);
    const tx = target.x;
    const ty = mirror(target.y);
    const sx = handoff.startX;
    const sy = height + halfDiagonal(RETURN_HEIGHT) + MARGIN;
    // A quadratic curve whose control point is 75% of the way from the middle of the straight
    // line to a point low below the target.
    const cx = lerp((sx + tx) / 2, tx, 0.75);
    const cy = lerp((sy + ty) / 2, 0.9 * height, 0.75);
    const item = out[count++]!;
    item.x = (1 - e) ** 2 * sx + 2 * (1 - e) * e * cx + e * e * tx;
    item.y = mirror((1 - e) ** 2 * sy + 2 * (1 - e) * e * cy + e * e * ty);
    item.h = logLerp(RETURN_HEIGHT, starHeight(field.z[handoff.star]!), e);
    const fade = smooth(clamp01((u - (1 - RETURN_FADE)) / RETURN_FADE));
    item.opacity = lerp(ITEM_OPACITY, brightnessOf(field, handoff.star, seconds), fade);
    item.outline = item.h > OUTLINE_FROM;
  }
  return count;
}
