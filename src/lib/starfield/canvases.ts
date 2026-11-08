// The canvases that Starfield.astro renders: the moving stars, the fixed stars and, above the
// card, the hand-off items.

/** Device pixels per CSS px, at most; more costs fill rate without looking sharper on stars. */
const MAX_DPR = 1.5;

export interface Canvases {
  moving: HTMLCanvasElement;
  fixed: HTMLCanvasElement;
  /** Above the card, outside the container (which sits behind the page); optional. */
  overlay?: HTMLCanvasElement;
  movingCtx: CanvasRenderingContext2D;
  fixedCtx: CanvasRenderingContext2D;
  overlayCtx?: CanvasRenderingContext2D;
}

/** The canvases in `container` and the hand-off canvas; nothing without Canvas 2D. */
export function findCanvases(container: HTMLElement): Canvases | undefined {
  const moving = container.querySelector<HTMLCanvasElement>('[data-moving]');
  const fixed = container.querySelector<HTMLCanvasElement>('[data-fixed]');
  const movingCtx = moving?.getContext('2d');
  const fixedCtx = fixed?.getContext('2d');
  if (!moving || !fixed || !movingCtx || !fixedCtx) return undefined;
  const overlay = document.querySelector<HTMLCanvasElement>('[data-handoff]') ?? undefined;
  const overlayCtx = overlay?.getContext('2d') ?? undefined;
  return { moving, fixed, overlay, movingCtx, fixedCtx, overlayCtx };
}

/** Sizes every canvas to its CSS size times the pixel ratio; returns that ratio. */
export function sizeCanvases({ moving, fixed, overlay }: Canvases) {
  const dpr = Math.min(devicePixelRatio, MAX_DPR);
  for (const canvas of [moving, fixed, overlay]) {
    if (!canvas) continue;
    canvas.width = Math.round(moving.clientWidth * dpr);
    canvas.height = Math.round(moving.clientHeight * dpr);
  }
  return dpr;
}
