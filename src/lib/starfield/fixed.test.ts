import { describe, expect, it } from 'vitest';
import { FIXED_MAX, fixedCount } from '@/lib/starfield/counts';
import { createFixedStars, fixedOpacityOf, renewFixed } from '@/lib/starfield/fixed';
import { FADE_IN, reveal } from '@/lib/starfield/lifetimes';
import { always, seeded } from '@/lib/starfield/testing';

describe('fixed stars', () => {
  it('puts them on the screen, dimmer than the moving ones', () => {
    const stars = createFixedStars(1440, 900, seeded());
    expect(stars.count).toBe(fixedCount(1440, 900));
    for (let i = 0; i < FIXED_MAX; i++) {
      expect(stars.x[i]).toBeGreaterThanOrEqual(0);
      expect(stars.x[i]).toBeLessThanOrEqual(1);
      expect(stars.opacity[i]).toBeGreaterThanOrEqual(0.1);
      expect(stars.opacity[i]).toBeLessThanOrEqual(0.6);
    }
  });

  it('shows a fixed star at its own opacity once it has faded in', () => {
    const stars = createFixedStars(1440, 900, seeded());
    reveal(stars, 0, 1, 0, 0, always(0.9));
    expect(fixedOpacityOf(stars, 0, 0)).toBe(0);
    expect(fixedOpacityOf(stars, 0, FADE_IN)).toBeCloseTo(stars.opacity[0]!);
  });

  it('renews one that has faded out, somewhere else', () => {
    const stars = createFixedStars(1440, 900, seeded());
    stars.appear.fill(0);
    stars.vanish.fill(0);
    renewFixed(stars, 100, always(0.25));
    expect(stars.x[0]).toBe(0.25);
    expect(stars.y[0]).toBe(0.25);
    expect(stars.appear[0]).toBeGreaterThan(100);
  });
});
