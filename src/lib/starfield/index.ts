// Runs the card starfield on the canvas that Starfield.astro renders. Loaded on idle by that
// component's script, so it's never on the critical path. Its container persists across
// navigations, so this runs once per visit and the field keeps moving while pages change.
import { drawField } from '@/lib/starfield/draw';
import { createField, drift, type Field, reachOf } from '@/lib/starfield/field';

/** Device pixels per CSS px, at most; more costs fill rate without looking sharper on stars. */
const MAX_DPR = 1.5;
/** After a long pause (a background tab, a debugger) the field moves on by at most this much. */
const MAX_STEP = 0.1;

/**
 * Starts the field on `canvas`, in the `color` of its container (which uses --color-text).
 * With reduced motion the field is one still frame. Sets `data-state` on the container to
 * `running` or `still` once the first frame is drawn, which fades the canvas in.
 * Without Canvas 2D it does nothing, and the page keeps its plain background.
 */
export function startStarfield(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  const container = canvas.parentElement;
  if (!ctx || !container) return;

  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
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

  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    dpr = Math.min(devicePixelRatio, MAX_DPR);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    if (field) field.reach = reachOf(width, height);
    else field = createField(width, height);
    draw();
  }

  // Every color token is a light-dark() value, so read the resolved color, not the property.
  function readColor() {
    color = getComputedStyle(container!).color;
    draw();
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
  new ResizeObserver(resize).observe(canvas);
  // The theme toggle sets data-theme on <html>; without it, the OS preference applies.
  new MutationObserver(readColor).observe(document.documentElement, {
    attributeFilter: ['data-theme'],
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readColor);

  container.dataset.state = still ? 'still' : 'running';
  if (still) return;

  frame = requestAnimationFrame(tick);
  // Pause while the tab is hidden; on return the field continues where it was.
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(frame);
    last = undefined;
    if (!document.hidden) frame = requestAnimationFrame(tick);
  });
}
