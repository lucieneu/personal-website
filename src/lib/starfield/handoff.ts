// Sections 1 and 4 of the card hand-off (docs/project-spec.md, Page transitions): as the old card
// goes, a star near the sidebar flares up and fades out where it is; after it, a card outline
// flows in from below the bottom edge and becomes a star next to the new card. On Back the
// outline is mirrored top to bottom. Pure math on the field's clock; drawn on the canvas above the card.
import { FADE_IN, hide, reveal } from '@/lib/starfield/lifetimes';
import { type Field, opacityOf } from '@/lib/starfield/field';
import { FLARE, writeFlare } from '@/lib/starfield/flare';
import type { Item } from '@/lib/starfield/item';
import { lerp } from '@/lib/starfield/math';
import { placeOnScreen, type Point, screenOf, starHeight } from '@/lib/starfield/projection';
import { RETURN_DEPTH, RETURN_FROM, RETURN_TO, writeReturn } from '@/lib/starfield/returning';

/** It's picked at a depth in this range, so it's neither tiny nor already large. */
const LEAVE_NEAR = 0.9;
const LEAVE_FAR = 2.2;
/** A star must be at least this opaque to be picked. */
const LEAVE_OPACITY = 0.3;
/** A card further than this from the left edge has the sidebar next to it (desktop). */
const SIDEBAR_FROM = 100;
/** On phones the strip at the side is at least this wide. */
const PHONE_STRIP = 16;

export interface Screen {
  width: number;
  height: number;
}

/** The horizontal span of the card on the screen. */
export interface CardSpan {
  left: number;
  right: number;
}

export interface Handoff {
  /** When it started, on the field's clock. */
  start: number;
  /** The star that flares out, and returns elsewhere (its index in the field). */
  star: number;
  /** Back: mirrored, so every y is measured from the bottom edge instead of the top. */
  back: boolean;
  /** Which way the card is: 1 to the right, -1 to the left. */
  inward: number;
  /** Section 1's star where it was, with its height and opacity. */
  from: Item;
  /** Where section 4's outline starts, below the bottom edge. */
  startX: number;
}

const point: Point = { x: 0, y: 0 };

/** Desktop: the sidebar column. Phones: a narrow strip at one side, picked at random. */
export function stripBesideCard(card: CardSpan, width: number, random: () => number) {
  const phone = card.left < SIDEBAR_FROM;
  const left = !phone || random() < 0.5;
  const [from, to] = left
    ? [0, Math.max(card.left, PHONE_STRIP)]
    : [Math.min(card.right, width - PHONE_STRIP), width];
  return { phone, left, from, to };
}

/**
 * The star nearest the horizontal `middle` of the strip, in the upper half of the screen and
 * fully shown; -1 if there is none. `mirror` flips y (for Back).
 */
export function starToLeave(
  field: Field,
  seconds: number,
  { width, height }: Screen,
  middle: number,
  mirror: (y: number) => number,
) {
  let star = -1;
  let best = Infinity;
  for (let i = 0; i < field.count; i++) {
    const z = field.z[i]!;
    if (z < LEAVE_NEAR || z > LEAVE_FAR || opacityOf(field, i, seconds) < LEAVE_OPACITY) continue;
    const { x, y } = screenOf(field, i, seconds, width, height, point);
    if (x < 0 || x > width || mirror(y) < 0 || mirror(y) > height / 2) continue;
    if (Math.abs(x - middle) < best) [star, best] = [i, Math.abs(x - middle)];
  }
  return star;
}

/**
 * Starts the hand-off on a `screen` whose card spans `card` horizontally: picks a star next to
 * the card in the upper half (the lower half on Back) to leave, hides it, and puts it, still
 * hidden, where it will return. Returns nothing if no star fits.
 */
export function startHandoff(
  field: Field,
  seconds: number,
  screen: Screen,
  card: CardSpan,
  back: boolean,
  random = Math.random,
): Handoff | undefined {
  const { width, height } = screen;
  const mirror = (y: number) => (back ? height - y : y);
  const { phone, left, from, to } = stripBesideCard(card, width, random);

  const star = starToLeave(field, seconds, screen, (from + to) / 2, mirror);
  if (star < 0) return undefined;

  screenOf(field, star, seconds, width, height, point);
  const inward = left ? 1 : -1;
  const handoff: Handoff = {
    start: seconds,
    star,
    back,
    inward,
    from: {
      x: point.x,
      y: point.y,
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
  handoff.startX = point.x + (phone ? 0 : inward * 0.3 * width);
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
  { width, height }: Screen,
  out: Item[],
  from = 0,
) {
  const elapsed = seconds - handoff.start;
  let count = from;
  if (elapsed < FLARE) writeFlare(out[count++]!, handoff.from, elapsed);
  if (elapsed >= RETURN_FROM)
    writeReturn(out[count++]!, field, handoff, elapsed, seconds, width, height);
  return count;
}
