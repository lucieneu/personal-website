import { describe, expect, it } from 'vitest';
import {
  brightnessOf,
  createField,
  createFixedStars,
  drift,
  FADE_IN,
  fixedCount,
  fixedOpacityOf,
  FIXED_MAX,
  hide,
  opacityOf,
  placeOnScreen,
  reachOf,
  renewField,
  renewFixed,
  reveal,
  rollAt,
  scaleAt,
  screenOf,
  starCount,
  starHeight,
  STAR_MAX,
  Z_FAR,
  Z_NEAR,
} from '@/lib/starfield/field';
import { always, seeded } from '@/lib/starfield/testing';

const WIDTH = 1440;
const HEIGHT = 900;

describe('star counts', () => {
  it('gives the base screen the base counts', () => {
    expect(starCount(WIDTH, HEIGHT)).toBe(1500);
    expect(fixedCount(WIDTH, HEIGHT)).toBe(1000);
  });

  it('scales with the screen area', () => {
    expect(starCount(WIDTH / 2, HEIGHT)).toBe(750);
    expect(fixedCount(WIDTH, HEIGHT / 2)).toBe(500);
  });

  it('stops at twice the base count on a huge screen', () => {
    expect(starCount(10000, 10000)).toBe(STAR_MAX);
    expect(fixedCount(10000, 10000)).toBe(FIXED_MAX);
  });
});

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

  it('reaches the corners of the screen at depth 1', () => {
    expect(reachOf(WIDTH, HEIGHT) * scaleAt(1, HEIGHT)).toBeCloseTo(Math.hypot(WIDTH, HEIGHT) / 2);
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

describe('rollAt', () => {
  it('turns once in ten minutes', () => {
    expect(rollAt(0)).toBe(0);
    expect(rollAt(300)).toBeCloseTo(Math.PI);
    expect(rollAt(600)).toBeCloseTo(0);
    expect(rollAt(750)).toBeCloseTo(rollAt(150));
  });
});

describe('projection', () => {
  it('scales and sizes stars inversely with depth', () => {
    expect(scaleAt(2, HEIGHT)).toBeCloseTo(scaleAt(1, HEIGHT) / 2);
    expect(starHeight(2)).toBeCloseTo(starHeight(1) / 2);
  });

  it('puts a star at the center of the screen when it is at the center of the field', () => {
    const field = createField(WIDTH, HEIGHT, seeded());
    field.x[0] = 0;
    field.y[0] = 0;
    field.z[0] = 1;
    expect(screenOf(field, 0, 123, WIDTH, HEIGHT, { x: 0, y: 0 })).toEqual({
      x: WIDTH / 2,
      y: HEIGHT / 2,
    });
  });

  it('shows a star where placeOnScreen put it, at any time and depth', () => {
    const field = createField(WIDTH, HEIGHT, seeded());
    for (const seconds of [0, 37, 212.5]) {
      placeOnScreen(field, 3, { x: 321, y: 654 }, 1.6, seconds, WIDTH, HEIGHT);
      const out = screenOf(field, 3, seconds, WIDTH, HEIGHT, { x: 0, y: 0 });
      expect(out.x).toBeCloseTo(321, 2);
      expect(out.y).toBeCloseTo(654, 2);
      expect(field.z[3]).toBeCloseTo(1.6);
    }
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

describe('reveal and opacityOf', () => {
  const make = () => {
    const field = createField(WIDTH, HEIGHT, seeded());
    field.z[0] = 1.5;
    return field;
  };

  it('starts every star between start and start + spread', () => {
    const field = make();
    reveal(field, 0, 100, 10, 5, seeded());
    for (let i = 0; i < 100; i++) {
      expect(field.appear[i]).toBeGreaterThanOrEqual(10);
      expect(field.appear[i]).toBeLessThanOrEqual(15);
    }
  });

  it('keeps a star invisible until it appears and fully shown FADE_IN seconds later', () => {
    const field = make();
    reveal(field, 0, 1, 10, 0, always(0.9));
    const halfway = 10 + FADE_IN / 2;
    expect(opacityOf(field, 0, 9)).toBe(0);
    expect(opacityOf(field, 0, 10)).toBe(0);
    expect(opacityOf(field, 0, halfway)).toBeGreaterThan(0);
    expect(opacityOf(field, 0, halfway)).toBeLessThan(brightnessOf(field, 0, halfway));
    expect(opacityOf(field, 0, 10 + FADE_IN)).toBeCloseTo(brightnessOf(field, 0, 10 + FADE_IN));
  });

  it('lets most stars last forever and fades out the mortal ones', () => {
    const field = make();
    reveal(field, 0, 1, 0, 0, always(0.9));
    expect(field.vanish[0]).toBe(Infinity);
    reveal(field, 0, 1, 0, 0, always(0.1));
    expect(field.vanish[0]).toBeLessThan(Infinity);
    expect(opacityOf(field, 0, field.vanish[0]! + 100)).toBe(0);
  });

  it('hides a star at once', () => {
    const field = make();
    reveal(field, 0, 1, -10, 0, always(0.9));
    expect(opacityOf(field, 0, 0)).toBeGreaterThan(0);
    hide(field, 0);
    expect(opacityOf(field, 0, 0)).toBe(0);
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

describe('fixed stars', () => {
  it('puts them on the screen, dimmer than the moving ones', () => {
    const stars = createFixedStars(WIDTH, HEIGHT, seeded());
    expect(stars.count).toBe(fixedCount(WIDTH, HEIGHT));
    for (let i = 0; i < FIXED_MAX; i++) {
      expect(stars.x[i]).toBeGreaterThanOrEqual(0);
      expect(stars.x[i]).toBeLessThanOrEqual(1);
      expect(stars.opacity[i]).toBeGreaterThanOrEqual(0.1);
      expect(stars.opacity[i]).toBeLessThanOrEqual(0.6);
    }
  });

  it('shows a fixed star at its own opacity once it has faded in', () => {
    const stars = createFixedStars(WIDTH, HEIGHT, seeded());
    reveal(stars, 0, 1, 0, 0, always(0.9));
    expect(fixedOpacityOf(stars, 0, 0)).toBe(0);
    expect(fixedOpacityOf(stars, 0, FADE_IN)).toBeCloseTo(stars.opacity[0]!);
  });

  it('renews one that has faded out, somewhere else', () => {
    const stars = createFixedStars(WIDTH, HEIGHT, seeded());
    stars.appear.fill(0);
    stars.vanish.fill(0);
    renewFixed(stars, 100, always(0.25));
    expect(stars.x[0]).toBe(0.25);
    expect(stars.y[0]).toBe(0.25);
    expect(stars.appear[0]).toBeGreaterThan(100);
  });
});
