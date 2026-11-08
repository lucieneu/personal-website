import { describe, expect, it } from 'vitest';
import { fixedCount, starCount } from '@/lib/starfield/counts';
import { createField } from '@/lib/starfield/field';
import { createFixedStars } from '@/lib/starfield/fixed';
import { type Appear, introduce, resizeStars } from '@/lib/starfield/population';
import { seeded } from '@/lib/starfield/testing';

/** Records what was asked to appear: [stars, from, to, spread]. */
function recorder() {
  const calls: [unknown, number, number, number][] = [];
  const appear: Appear = (stars, from, to, spread) => calls.push([stars, from, to, spread]);
  return { calls, appear };
}

describe('introduce', () => {
  it('shows 15% of each kind at once and lets the rest appear one by one', () => {
    const field = createField(1440, 900, seeded());
    const fixed = createFixedStars(1440, 900, seeded());
    const { calls, appear } = recorder();
    introduce(field, fixed, appear);
    expect(calls).toEqual([
      [field, 0, 225, 0],
      [field, 225, 1500, 7],
      [fixed, 0, 150, 0],
      [fixed, 150, 1000, 7],
    ]);
  });
});

describe('resizeStars', () => {
  const make = () => ({
    field: createField(1440, 900, seeded()),
    fixed: createFixedStars(1440, 900, seeded()),
  });

  it('adds stars, which appear over a second, when the window grows', () => {
    const { field, fixed } = make();
    const { calls, appear } = recorder();
    resizeStars(field, fixed, 2160, 900, appear);
    expect(field.count).toBe(starCount(2160, 900));
    expect(fixed.count).toBe(fixedCount(2160, 900));
    expect(calls).toEqual([
      [field, 1500, 2250, 1],
      [fixed, 1000, 1500, 1],
    ]);
  });

  it('draws fewer stars, without any appearing, when the window shrinks', () => {
    const { field, fixed } = make();
    const { calls, appear } = recorder();
    resizeStars(field, fixed, 720, 900, appear);
    expect(field.count).toBe(750);
    expect(calls).toEqual([]);
  });
});
