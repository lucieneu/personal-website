// Draws the stars onto a canvas, every star a tiny card: the moving field, turned by its roll,
// and the fixed stars, on a canvas of their own that is redrawn only a few times a second.
import {
  CARD_ASPECT,
  type Field,
  FIXED_MAX,
  type FixedStars,
  fixedOpacityOf,
  opacityOf,
  rollAt,
  scaleAt,
  STAR_MAX,
  starHeight,
} from '@/lib/starfield/field';

/** Below this height (px) a star is a plain rectangle; its rounded corners wouldn't show. */
const ROUND_FROM = 2;
/**
 * Opacity is rounded to this many steps, so all stars of one step are filled in one call
 * instead of one call per star (the main cost on slow devices). The steps (1.5%) are too small
 * to see while a star fades.
 */
const LEVELS = 64;

// Per star, filled before drawing: its step (0 = not drawn) and where it's drawn. Allocated once.
const size = Math.max(STAR_MAX, FIXED_MAX);
const level = new Uint8Array(size);
const left = new Float32Array(size);
const top = new Float32Array(size);
const tall = new Float32Array(size);
// The stars sorted by step (see `fill`).
const order = new Uint16Array(size);
const first = new Uint16Array(LEVELS + 2);
const next = new Uint16Array(LEVELS + 2);

/** Puts star `i` at (`x`, `y`), `h` px tall, at `opacity`; returns its step. */
function plan(i: number, x: number, y: number, h: number, opacity: number) {
  const step = Math.round(opacity * LEVELS);
  level[i] = step;
  left[i] = x - (h * CARD_ASPECT) / 2;
  top[i] = y - h / 2;
  tall[i] = h;
  return step;
}

/** Fills the first `count` planned stars, one call per opacity step up to `highest`. */
function fill(ctx: CanvasRenderingContext2D, count: number, highest: number) {
  // Sort the stars by step (a counting sort): first[step] is where that step's stars start in
  // `order`.
  first.fill(0);
  for (let i = 0; i < count; i++) first[level[i]! + 1]!++;
  for (let step = 1; step <= LEVELS + 1; step++) first[step]! += first[step - 1]!;
  next.set(first);
  for (let i = 0; i < count; i++) order[next[level[i]!]!++] = i;

  for (let step = 1; step <= highest; step++) {
    if (first[step] === first[step + 1]) continue;
    ctx.globalAlpha = step / LEVELS;
    ctx.beginPath();
    for (let k = first[step]!; k < first[step + 1]!; k++) {
      const i = order[k]!;
      const h = tall[i]!;
      if (h < ROUND_FROM) ctx.rect(left[i]!, top[i]!, h * CARD_ASPECT, h);
      else ctx.roundRect(left[i]!, top[i]!, h * CARD_ASPECT, h, h * 0.15);
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function clear(ctx: CanvasRenderingContext2D, color: string) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = color;
}

/**
 * Draws `field` at `seconds` on a canvas of `width` × `height` CSS px, drawn at `dpr` device
 * pixels per CSS px, in `color`.
 */
export function drawField(
  ctx: CanvasRenderingContext2D,
  field: Field,
  seconds: number,
  width: number,
  height: number,
  dpr: number,
  color: string,
) {
  clear(ctx, color);
  // Turn the whole canvas around the screen's center, so each star can be drawn upright.
  const roll = rollAt(seconds);
  const cos = Math.cos(roll) * dpr;
  const sin = Math.sin(roll) * dpr;
  ctx.setTransform(cos, sin, -sin, cos, (width / 2) * dpr, (height / 2) * dpr);

  // A star further out than this is off screen whatever the roll.
  const limit = Math.hypot(width, height) / 2 + 8;
  let highest = 0;
  for (let i = 0; i < field.count; i++) {
    level[i] = 0;
    const z = field.z[i]!;
    const scale = scaleAt(z, height);
    const x = field.x[i]! * scale;
    const y = field.y[i]! * scale;
    if (Math.abs(x) > limit || Math.abs(y) > limit) continue;
    highest = Math.max(highest, plan(i, x, y, starHeight(z), opacityOf(field, i, seconds)));
  }
  fill(ctx, field.count, highest);
}

/**
 * Draws the fixed stars at `seconds` on a canvas like drawField's. They don't move, only fade in
 * and out slowly, so this runs a few times a second (and on a resize or theme change).
 */
export function drawFixed(
  ctx: CanvasRenderingContext2D,
  stars: FixedStars,
  seconds: number,
  width: number,
  height: number,
  dpr: number,
  color: string,
) {
  clear(ctx, color);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  let highest = 0;
  for (let i = 0; i < stars.count; i++) {
    const step = plan(
      i,
      stars.x[i]! * width,
      stars.y[i]! * height,
      stars.height[i]!,
      fixedOpacityOf(stars, i, seconds),
    );
    highest = Math.max(highest, step);
  }
  fill(ctx, stars.count, highest);
}
