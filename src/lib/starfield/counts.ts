// How many stars a screen gets: as many per area as the base screen, up to a limit.

/** Moving and fixed stars on a 1440 × 900 screen; other screens get as many per area. */
const STAR_BASE = 1500;
const FIXED_BASE = 1000;
const BASE_AREA = 1440 * 900;
/** A screen gets at most this many times the base count, so a huge monitor stays cheap. */
const MAX_FACTOR = 2;
/** The most stars of each kind; the arrays that hold them have this length. */
export const STAR_MAX = STAR_BASE * MAX_FACTOR;
export const FIXED_MAX = FIXED_BASE * MAX_FACTOR;

/** How many stars a `width` × `height` screen gets, for `base` stars on the base screen. */
const countFor = (base: number, width: number, height: number) =>
  Math.min(base * MAX_FACTOR, Math.round((base * width * height) / BASE_AREA));

export const starCount = (width: number, height: number) => countFor(STAR_BASE, width, height);
export const fixedCount = (width: number, height: number) => countFor(FIXED_BASE, width, height);
