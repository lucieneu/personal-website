// Draws the field onto a canvas: every star a tiny card, the whole field turned by its roll.
import {
  CARD_ASPECT,
  type Field,
  opacityOf,
  rollAt,
  scaleAt,
  STAR_COUNT,
  starHeight,
} from '@/lib/starfield/field';

/** Below this height (px) a star is a plain rectangle; its rounded corners wouldn't show. */
const ROUND_FROM = 2;

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
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Turn the whole canvas around the screen's center, so each star can be drawn upright.
  const roll = rollAt(seconds);
  const cos = Math.cos(roll) * dpr;
  const sin = Math.sin(roll) * dpr;
  ctx.setTransform(cos, sin, -sin, cos, (width / 2) * dpr, (height / 2) * dpr);
  ctx.fillStyle = color;

  // A star further out than this is off screen whatever the roll.
  const limit = Math.hypot(width, height) / 2 + 8;
  for (let i = 0; i < STAR_COUNT; i++) {
    const z = field.z[i]!;
    const scale = scaleAt(z, height);
    const x = field.x[i]! * scale;
    const y = field.y[i]! * scale;
    if (Math.abs(x) > limit || Math.abs(y) > limit) continue;

    const opacity = opacityOf(field, i, seconds);
    if (opacity <= 0) continue;
    const h = starHeight(z);
    const w = h * CARD_ASPECT;
    ctx.globalAlpha = opacity;
    if (h < ROUND_FROM) {
      ctx.fillRect(x - w / 2, y - h / 2, w, h);
    } else {
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y - h / 2, w, h, h * 0.15);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
