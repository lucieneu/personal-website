import { describe, expect, it } from 'vitest';
import { STAR_MAX, starCount } from '@/lib/starfield/counts';
import { brightnessOf, createField, drift, opacityOf, renewField } from '@/lib/starfield/field';
import { FADE_IN, hide, reveal } from '@/lib/starfield/lifetimes';
import { Z_FAR, Z_NEAR } from '@/lib/starfield/projection';
import { always, seeded } from '@/lib/starfield/testing';

const WIDTH = 1440;
const HEIGHT = 900;

describe('createField', () => {
  const field = createField(WIDTH, HEIGHT, seeded());

  it('uses as many stars as the screen gets, in arrays that can hold the most', () => {
    expect(field.count).toBe(starCount(WIDTH, HEIGHT));
    expect(field.x).toHaveLength(STAR_MAX);
  });

  it('puts every star inside the depth range and the disc that covers the screen there', () => {
    for (let i = 0; i < STAR_MAX; i++) {
      const z = field.z[i]!;
      expect(z).toBeGreaterThanOrEqual(Z_NEAR);
      expect(z).toBeLessThanOrEqual(Z_FAR);
      expect(Math.hypot(field.x[i]!, field.y[i]!)).toBeLessThanOrEqual(field.reach * z + 1e-4);
    }
  });

  it('gives every star a brightness of 0.15–1', () => {
    for (let i = 0; i < STAR_MAX; i++) {
      expect(field.brightness[i]).toBeGreaterThanOrEqual(0.15);
      expect(field.brightness[i]).toBeLessThanOrEqual(1);
    }
  });
});

describe('drift', () => {
  it('moves stars toward the viewer, the same distance in one step as in two halves', () => {
    const once = createField(WIDTH, HEIGHT, seeded());
    const twice = createField(WIDTH, HEIGHT, seeded());
    const before = once.z[0]!;
    drift(once, 2, seeded(2));
    drift(twice, 1, seeded(2));
    drift(twice, 1, seeded(2));
    expect(once.z[0]).toBeLessThan(before);
    expect(twice.z[0]).toBeCloseTo(once.z[0]!, 5);
  });

  it('brings a star that gets too close back at the far end', () => {
    const field = createField(WIDTH, HEIGHT, seeded());
    field.z[0] = Z_NEAR + 0.0001;
    drift(field, 1, seeded(2));
    expect(field.z[0]).toBe(Z_FAR);
  });

  it('leaves the stars beyond the count alone', () => {
    const field = createField(100, 100, seeded());
    field.z[field.count] = Z_NEAR;
    drift(field, 1000, seeded(2));
    expect(field.z[field.count]).toBeCloseTo(Z_NEAR);
  });
});

describe('brightnessOf', () => {
  const field = createField(WIDTH, HEIGHT, seeded());

  it('fades out at both ends of the depth range', () => {
    field.z[0] = Z_NEAR;
    expect(brightnessOf(field, 0, 5)).toBe(0);
    field.z[0] = Z_FAR;
    expect(brightnessOf(field, 0, 5)).toBe(0);
  });

  it('stays within 0–1 in between', () => {
    field.z[0] = 1.5;
    for (const seconds of [0, 1, 2, 3, 4]) {
      expect(brightnessOf(field, 0, seconds)).toBeGreaterThan(0);
      expect(brightnessOf(field, 0, seconds)).toBeLessThanOrEqual(1);
    }
  });
});

describe('opacityOf', () => {
  const make = () => {
    const field = createField(WIDTH, HEIGHT, seeded());
    field.z[0] = 1.5;
    reveal(field, 0, 1, 10, 0, always(0.9));
    return field;
  };

  it('is brightness times the fade in', () => {
    const field = make();
    const halfway = 10 + FADE_IN / 2;
    expect(opacityOf(field, 0, 9)).toBe(0);
    expect(opacityOf(field, 0, halfway)).toBeCloseTo(brightnessOf(field, 0, halfway) * 0.5);
    expect(opacityOf(field, 0, 10 + FADE_IN)).toBeCloseTo(brightnessOf(field, 0, 10 + FADE_IN));
  });

  it('is 0 for a hidden star', () => {
    const field = make();
    hide(field, 0);
    expect(opacityOf(field, 0, 100)).toBe(0);
  });
});

describe('renewField', () => {
  it('leaves stars that are still shown where they are', () => {
    const field = createField(WIDTH, HEIGHT, seeded());
    reveal(field, 0, field.count, 0, 0, always(0.9));
    const x = field.x[0];
    renewField(field, 1000, seeded());
    expect(field.x[0]).toBe(x);
    expect(field.appear[0]).toBe(0);
  });

  it('moves a star that has faded out and lets it appear again after a gap', () => {
    const field = createField(WIDTH, HEIGHT, seeded());
    field.vanish.fill(0);
    field.appear.fill(0);
    renewField(field, 100, seeded(3));
    expect(field.appear[0]).toBeGreaterThanOrEqual(102);
    expect(field.appear[0]).toBeLessThanOrEqual(112);
  });
});
