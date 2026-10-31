// Runs the card starfield on the canvases that Starfield.astro renders. Loaded on idle by that
// component's script, so it's never on the critical path. Its container persists across
// navigations, so this runs once per visit and the field keeps moving while pages change.
import { findCanvases, sizeCanvases } from '@/lib/starfield/canvases';
import { drawField, drawFixed, drawItems } from '@/lib/starfield/draw';
import { createField, drift, type Field, renewField } from '@/lib/starfield/field';
import { createFixedStars, type FixedStars, renewFixed } from '@/lib/starfield/fixed';
import { HandoffQueue } from '@/lib/starfield/handoffs';
import { FADE_IN, type Lifetimes, reveal } from '@/lib/starfield/lifetimes';
import { introduce, resizeStars } from '@/lib/starfield/population';
import { goingBack } from '@/lib/transitions/direction';

/** After a long pause (a background tab, a debugger) the field moves on by at most this much. */
const MAX_STEP = 0.1;
/**
 * The fixed stars only change while some fade in or out, which is slow, so their canvas is
 * redrawn on every this-many-th frame (15 times a second at 60 fps; with eased fades and fine
 * opacity steps that changes a star by at most about 2.5% at a time, too little to see).
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
 * On every client-side navigation it plays sections 1 and 4 of the card hand-off on the
 * `[data-handoff]` canvas above the card (not with reduced motion).
 * Without Canvas 2D it does nothing, and the page keeps its plain background.
 */
export function startStarfield(container: HTMLElement) {
  const canvases = findCanvases(container);
  if (!canvases) return;
  const { moving, movingCtx, fixedCtx, overlayCtx } = canvases;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const screen = { width: 0, height: 0 };
  const handoffs = new HandoffQueue();
  let dpr = 1;
  let color = '';
  let field: Field | undefined;
  let fixedStars: FixedStars | undefined;
  let seconds = 0;
  let last: number | undefined;
  let frame = 0;
  let frames = 0;
  let itemsShown = false;

  const drawMoving = () => {
    if (field) drawField(movingCtx, field, seconds, screen.width, screen.height, dpr, color);
  };
  const drawAll = () => {
    if (fixedStars)
      drawFixed(fixedCtx, fixedStars, seconds, screen.width, screen.height, dpr, color);
    drawMoving();
  };

  /** Lets stars `from` up to `to` appear over `spread` seconds from now (0: at once). */
  function appear(stars: Lifetimes, from: number, to: number, spread: number) {
    // At once: already faded in (the canvas itself still fades in on the first frame).
    if (reduced || spread === 0) reveal(stars, from, to, seconds - FADE_IN, 0);
    else reveal(stars, from, to, seconds, spread);
  }

  function resize() {
    screen.width = moving.clientWidth;
    screen.height = moving.clientHeight;
    dpr = sizeCanvases(canvases!);
    if (field && fixedStars) {
      resizeStars(field, fixedStars, screen.width, screen.height, appear);
    } else {
      field = createField(screen.width, screen.height);
      fixedStars = createFixedStars(screen.width, screen.height);
      introduce(field, fixedStars, appear);
    }
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
      renewField(field!, seconds);
      renewFixed(fixedStars!, seconds);
      handoffs.finishDone(field!, seconds);
    }
    last = now;
    // The hand-off items, while there are any; one more frame clears them.
    const count = handoffs.itemsAt(field!, seconds, screen);
    if (overlayCtx && (count || itemsShown))
      drawItems(overlayCtx, handoffs.items, count, dpr, color);
    itemsShown = count > 0;
    if (frames++ % FIXED_EVERY === 0) drawAll();
    else drawMoving();
    frame = requestAnimationFrame(tick);
  }

  readColor();
  resize();
  new ResizeObserver(resize).observe(moving);
  // The theme toggle sets data-theme on <html>.
  new MutationObserver(readColor).observe(document.documentElement, {
    attributeFilter: ['data-theme'],
  });

  container.dataset.state = reduced ? 'still' : 'running';
  if (reduced) return;

  frame = requestAnimationFrame(tick);

  // Sections 1 and 4 start when the new page is swapped in, right before the cards move.
  document.addEventListener('astro:after-swap', () => {
    if (!field || !overlayCtx) return;
    const card = document.getElementById('content')?.getBoundingClientRect();
    if (card) handoffs.start(field, seconds, screen, card, goingBack());
  });

  // Pause while the tab is hidden; on return the field continues where it was.
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(frame);
    last = undefined;
    if (!document.hidden) frame = requestAnimationFrame(tick);
  });
}
