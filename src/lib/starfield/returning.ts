// Section 4 of the card hand-off (docs/project-spec.md, Page transitions): a card outline flows in
// from below the bottom edge and becomes the star that left, next to the new card.
import { brightnessOf, type Field } from '@/lib/starfield/field';
import type { Item } from '@/lib/starfield/item';
import { clamp01, lerp, logLerp, outExpo, quadratic, smooth } from '@/lib/starfield/math';
import { CARD_ASPECT, type Point, screenOf, starHeight } from '@/lib/starfield/projection';

/**
 * A RETURN_HEIGHT px outline, from RETURN_FROM to RETURN_TO seconds, that ends as a star at depth
 * RETURN_DEPTH. In its last RETURN_FADE it fades to that star's brightness. It starts just after
 * the old card begins to leave, as the card's sinking speeds up and the new card starts to
 * arrive, so they read as one movement.
 */
export const RETURN_FROM = 0.12;
export const RETURN_TO = 3.12;
export const RETURN_DEPTH = 1.6;
const RETURN_HEIGHT = 24;
const RETURN_FADE = 0.4;
/** The returning outline is at most this opaque. */
const ITEM_OPACITY = 0.55;
/** The outline starts this many px past the bottom edge, beyond its corners. */
const MARGIN = 6;
/** Above this height (px) the returning item is the outline of an empty card. */
const OUTLINE_FROM = 4;

/** Where the outline goes: to star `star`, from `startX` below the bottom edge. */
export interface Route {
  star: number;
  startX: number;
  /** Back: mirrored top to bottom. */
  back: boolean;
}

const halfDiagonal = (h: number) => Math.hypot(h, h * CARD_ASPECT) / 2;

const point: Point = { x: 0, y: 0 };

/**
 * Writes the returning item into `item`, `elapsed` seconds into the hand-off (`seconds` on the
 * field's clock). Its target is the hidden star's live position, so it ends exactly where the
 * star shows.
 */
export function writeReturn(
  item: Item,
  field: Field,
  route: Route,
  elapsed: number,
  seconds: number,
  width: number,
  height: number,
) {
  const mirror = (y: number) => (route.back ? height - y : y);
  const u = clamp01((elapsed - RETURN_FROM) / (RETURN_TO - RETURN_FROM));
  const e = outExpo(u);
  const target = screenOf(field, route.star, seconds, width, height, point);
  const tx = target.x;
  const ty = mirror(target.y);
  const sx = route.startX;
  const sy = height + halfDiagonal(RETURN_HEIGHT) + MARGIN;
  // A quadratic curve whose control point is 75% of the way from the middle of the straight
  // line to a point low below the target.
  const cx = lerp((sx + tx) / 2, tx, 0.75);
  const cy = lerp((sy + ty) / 2, 0.9 * height, 0.75);
  item.x = quadratic(sx, cx, tx, e);
  item.y = mirror(quadratic(sy, cy, ty, e));
  item.h = logLerp(RETURN_HEIGHT, starHeight(field.z[route.star]!), e);
  const fade = smooth(clamp01((u - (1 - RETURN_FADE)) / RETURN_FADE));
  item.opacity = lerp(ITEM_OPACITY, brightnessOf(field, route.star, seconds), fade);
  item.outline = item.h > OUTLINE_FROM;
}
