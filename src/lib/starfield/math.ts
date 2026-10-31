// Small math helpers shared by the starfield's modules.

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** From `a` to `b` on a log scale, so growing and shrinking look even. */
export const logLerp = (a: number, b: number, t: number) => a * (b / a) ** t;

/** Eases a fade in and out, so it starts (and ends) gradually, not at once. */
export const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * Ease-out: fastest at the start and slower and slower toward the end, as if it settles far away.
 */
export const outExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));

/** The point at `t` (0–1) on the quadratic Bézier curve from `a` to `b` bent toward `control`. */
export const quadratic = (a: number, control: number, b: number, t: number) =>
  (1 - t) ** 2 * a + 2 * (1 - t) * t * control + t * t * b;
