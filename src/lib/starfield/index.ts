// Runs the card starfield on the canvases that Starfield.astro renders. Loaded on idle by that
// component's script, so it's never on the critical path. Its container persists across
// navigations, so this runs once per visit and the field keeps moving while pages change.
import { drawField, drawFixed } from '@/lib/starfield/draw';
import {
  createField,
  createFixedStars,
  drift,
  FADE_IN,
  type Field,
  fixedCount,
  type FixedStars,
  reachOf,
  renewField,
  renewFixed,
  reveal,
  starCount,
} from '@/lib/starfield/field';

/** Device pixels per CSS px, at most; more costs fill rate without looking sharper on stars. */
const MAX_DPR = 1.5;
/** After a long pause (a background tab, a debugger) the field moves on by at most this much. */
const MAX_STEP = 0.1;
/** On a page load the stars appear one by one over this many seconds (+ FADE_IN). */
const INTRO = 7;
/** Stars added by a larger window appear over this many seconds (+ FADE_IN). */
const GROW = 1;
/**
 * The fixed stars only change while some fade in or out, which is slow, so their canvas is
 * redrawn on every this-many-th frame (15 times a second at 60 fps).
 */
const FIXED_EVERY = 4;

/**
 * Starts the starfield in `container`: the fixed stars on its `[data-fixed]` canvas, redrawn a
 * few times a second, and the moving field on its `[data-moving]` canvas, in the color of the
 * container (which uses --color-text). The number of stars follows the screen's area. On a page
 * load (not on a client-side navigation: the container persists) the stars fade in one by one,
 * and from then on some fade out and return elsewhere. With reduced motion the field is one
 * still frame, with every star at once. Sets `data-state` on the container to `running` or `still`
 * once the first frame is drawn, which fades the canvases in.
 * Without Canvas 2D it does nothing, and the page keeps its plain background.
 */
export function startStarfield(container: HTMLElement) {
  const moving = container.querySelector<HTMLCanvasElement>('[data-moving]');
  const fixed = container.querySelector<HTMLCanvasElement>('[data-fixed]');
  const ctx = moving?.getContext('2d');
  const fixedCtx = fixed?.getContext('2d');
  if (!moving || !fixed || !ctx || !fixedCtx) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let color = '';
  let field: Field | undefined;
  let fixedStars: FixedStars | undefined;
  let seconds = 0;
  let last: number | undefined;
  let frame = 0;

  const draw = () => {
    if (field) drawField(ctx, field, seconds, width, height, dpr, color);
  };
  const drawAll = () => {
    if (fixedStars) drawFixed(fixedCtx, fixedStars, seconds, width, height, dpr, color);
    draw();
  };

  /** Lets stars `from` up to `to` appear over `spread` seconds from now (0: at once). */
  function appear(stars: Field | FixedStars, from: number, to: number, spread: number) {
    // At once: already faded in (the canvas itself still fades in on the first frame).
    if (reduced || spread === 0) reveal(stars, from, to, seconds - FADE_IN, 0);
    else reveal(stars, from, to, seconds, spread);
  }

  function resize() {
    width = moving!.clientWidth;
    height = moving!.clientHeight;
    dpr = Math.min(devicePixelRatio, MAX_DPR);
    for (const canvas of [moving!, fixed!]) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    if (!field || !fixedStars) {
      field = createField(width, height);
      fixedStars = createFixedStars(width, height);
      appear(field, 0, field.count, INTRO);
      appear(fixedStars, 0, fixedStars.count, INTRO);
    } else {
      // A larger window gets more stars, which fade in; a smaller one draws fewer.
      field.reach = reachOf(width, height);
      const stars = starCount(width, height);
      const fixedStarsNow = fixedCount(width, height);
      if (stars > field.count) appear(field, field.count, stars, GROW);
      if (fixedStarsNow > fixedStars.count)
        appear(fixedStars, fixedStars.count, fixedStarsNow, GROW);
      field.count = stars;
      fixedStars.count = fixedStarsNow;
    }
    drawAll();
  }

  // Every color token is a light-dark() value, so read the resolved color, not the property.
  function readColor() {
    color = getComputedStyle(container).color;
    drawAll();
  }

  let frames = 0;
  function tick(now: number) {
    if (last !== undefined) {
      const step = Math.min((now - last) / 1000, MAX_STEP);
      seconds += step;
      drift(field!, step);
      renewField(field!, seconds);
      renewFixed(fixedStars!, seconds);
    }
    last = now;
    if (frames++ % FIXED_EVERY === 0) drawAll();
    else draw();
    frame = requestAnimationFrame(tick);
  }

  readColor();
  resize();
  new ResizeObserver(resize).observe(moving);
  // The theme toggle sets data-theme on <html>; without it, the OS preference applies.
  new MutationObserver(readColor).observe(document.documentElement, {
    attributeFilter: ['data-theme'],
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readColor);

  container.dataset.state = reduced ? 'still' : 'running';
  if (reduced) return;

  frame = requestAnimationFrame(tick);
  // Pause while the tab is hidden; on return the field continues where it was.
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(frame);
    last = undefined;
    if (!document.hidden) frame = requestAnimationFrame(tick);
  });
}
