import { describe, expect, it } from 'vitest';
import {
  FADE_IN,
  fadeOf,
  hide,
  isGone,
  type Lifetimes,
  reappear,
  reveal,
} from '@/lib/starfield/lifetimes';
import { always, seeded } from '@/lib/starfield/testing';

const stars = (): Lifetimes => ({ appear: new Float32Array(100), vanish: new Float32Array(100) });

describe('reveal', () => {
  it('starts every star between start and start + spread', () => {
    const s = stars();
    reveal(s, 0, 100, 10, 5, seeded());
    for (let i = 0; i < 100; i++) {
      expect(s.appear[i]).toBeGreaterThanOrEqual(10);
      expect(s.appear[i]).toBeLessThanOrEqual(15);
    }
  });

  it('lets most stars last forever and gives the mortal ones a time to fade out', () => {
    const s = stars();
    reveal(s, 0, 1, 0, 0, always(0.9));
    expect(s.vanish[0]).toBe(Infinity);
    reveal(s, 0, 1, 0, 0, always(0.1));
    expect(s.vanish[0]).toBeGreaterThan(FADE_IN);
    expect(s.vanish[0]).toBeLessThan(Infinity);
  });
});

describe('fadeOf', () => {
  it('keeps a star invisible until it appears and fully shown FADE_IN seconds later', () => {
    const s = stars();
    reveal(s, 0, 1, 10, 0, always(0.9));
    expect(fadeOf(s, 0, 9)).toBe(0);
    expect(fadeOf(s, 0, 10)).toBe(0);
    expect(fadeOf(s, 0, 10 + FADE_IN / 2)).toBeCloseTo(0.5);
    expect(fadeOf(s, 0, 10 + FADE_IN)).toBe(1);
  });

  it('fades a mortal star out for good', () => {
    const s = stars();
    reveal(s, 0, 1, 0, 0, always(0.1));
    expect(fadeOf(s, 0, s.vanish[0]!)).toBe(1);
    expect(fadeOf(s, 0, s.vanish[0]! + 100)).toBe(0);
  });

  it('hides a star at once', () => {
    const s = stars();
    reveal(s, 0, 1, -10, 0, always(0.9));
    expect(fadeOf(s, 0, 0)).toBe(1);
    hide(s, 0);
    expect(fadeOf(s, 0, 0)).toBe(0);
  });
});

describe('isGone and reappear', () => {
  it('is gone only once it has faded out completely', () => {
    const s = stars();
    reveal(s, 0, 1, 0, 0, always(0.1));
    expect(isGone(s, 0, s.vanish[0]!)).toBe(false);
    expect(isGone(s, 0, s.vanish[0]! + 100)).toBe(true);
  });

  it('never is for a star that lasts', () => {
    const s = stars();
    reveal(s, 0, 1, 0, 0, always(0.9));
    expect(isGone(s, 0, 1e9)).toBe(false);
  });

  it('lets it fade in again after a gap of 2–12 seconds', () => {
    const s = stars();
    reappear(s, 0, 100, always(0.9));
    expect(s.appear[0]).toBeCloseTo(100 + 2 + 0.9 * 10);
    reappear(s, 0, 100, always(0));
    expect(s.appear[0]).toBe(102);
  });
});
