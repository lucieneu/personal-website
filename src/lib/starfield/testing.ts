// Helpers for the starfield's unit tests.

/** A repeatable stand-in for Math.random (mulberry32), so a test sees the same stars every run. */
export function seeded(seed = 1) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stand-in for Math.random that always gives `value`. */
export const always = (value: number) => () => value;
