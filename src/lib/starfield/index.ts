// Runs the card starfield on the canvases that Starfield.astro renders. Loaded on idle by that
// component's script, so it's never on the critical path. Its container persists across
// navigations, so this runs once per visit and the field keeps moving while pages change.
import { drawField, drawFixed } from '@/lib/starfield/draw';
import { createField, createFixedStars, drift, type Field, reachOf } from '@/lib/starfield/field';

/** Device pixels per CSS px, at most; more costs fill rate without looking sharper on stars. */
const MAX_DPR = 1.5;
/** After a long pause (a background tab, a debugger) the field moves on by at most this much. */
const MAX_STEP = 0.1;

/**
 * Starts the starfield in `container`: the fixed stars on its `[data-fixed]` canvas, drawn once,
 * and the moving field on its `[data-moving]` canvas, in the color of the container (which uses
 * --color-text). With reduced motion the field is one still frame. Sets `data-state` on the
 * container to `running` or `still` once the first frame is drawn, which fades the canvases in.
 * Without Canvas 2D it does nothing, and the page keeps its plain background.
 */
export function startStarfield(container: HTMLElement) {
  const moving = container.querySelector<HTMLCanvasElement>('[data-moving]');
  const fixed = container.querySelector<HTMLCanvasElement>('[data-fixed]');
  const ctx = moving?.getContext('2d');
  const fixedCtx = fixed?.getContext('2d');
  if (!moving || !fixed || !ctx || !fixedCtx) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fixedStars = createFixedStars();
  let width = 0;
  let height = 0;
  let dpr = 1;
  let color = '';
  let field: Field | undefined;
  let seconds = 0;
  let last: number | undefined;
  let frame = 0;

  const draw = () => {
    if (field) drawField(ctx, field, seconds, width, height, dpr, color);
  };
  const drawAll = () => {
    drawFixed(fixedCtx, fixedStars, width, height, dpr, color);
    draw();
  };

  function resize() {
    width = moving!.clientWidth;
    height = moving!.clientHeight;
    dpr = Math.min(devicePixelRatio, MAX_DPR);
    for (const canvas of [moving!, fixed!]) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    if (field) field.reach = reachOf(width, height);
    else field = createField(width, height);
    drawAll();
  }

  // Every color token is a light-dark() value, so read the resolved color, not the property.
  function readColor() {
    color = getComputedStyle(container).color;
    drawAll();
  }

  function tick(now: number) {
    if (last !== undefined) {
      const step = Math.min((now - last) / 1000, MAX_STEP);
      seconds += step;
      drift(field!, step);
    }
    last = now;
    draw();
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
