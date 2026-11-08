import { describe, expect, it } from 'vitest';
import {
  placeOnScreen,
  type Positions,
  randomDepth,
  reachOf,
  rollAt,
  scaleAt,
  screenOf,
  starHeight,
  Z_FAR,
  Z_NEAR,
} from '@/lib/starfield/projection';
import { always } from '@/lib/starfield/testing';

const WIDTH = 1440;
const HEIGHT = 900;

const stars = (): Positions => ({
  x: new Float32Array(4),
  y: new Float32Array(4),
  z: new Float32Array(4),
});

describe('projection', () => {
  it('reaches the corners of the screen at depth 1', () => {
    expect(reachOf(WIDTH, HEIGHT) * scaleAt(1, HEIGHT)).toBeCloseTo(Math.hypot(WIDTH, HEIGHT) / 2);
  });

  it('turns once in ten minutes', () => {
    expect(rollAt(0)).toBe(0);
    expect(rollAt(300)).toBeCloseTo(Math.PI);
    expect(rollAt(600)).toBeCloseTo(0);
    expect(rollAt(750)).toBeCloseTo(rollAt(150));
  });

  it('scales and sizes stars inversely with depth', () => {
    expect(scaleAt(2, HEIGHT)).toBeCloseTo(scaleAt(1, HEIGHT) / 2);
    expect(starHeight(2)).toBeCloseTo(starHeight(1) / 2);
  });

  it('picks depths across the whole range', () => {
    expect(randomDepth(always(0))).toBe(Z_NEAR);
    expect(randomDepth(always(1))).toBe(Z_FAR);
  });

  it('puts a star at the center of the field in the center of the screen', () => {
    const field = stars();
    field.z[0] = 1;
    expect(screenOf(field, 0, 123, WIDTH, HEIGHT, { x: 0, y: 0 })).toEqual({
      x: WIDTH / 2,
      y: HEIGHT / 2,
    });
  });

  it('shows a star where placeOnScreen put it, at any time and depth', () => {
    const field = stars();
    for (const seconds of [0, 37, 212.5]) {
      placeOnScreen(field, 3, { x: 321, y: 654 }, 1.6, seconds, WIDTH, HEIGHT);
      const out = screenOf(field, 3, seconds, WIDTH, HEIGHT, { x: 0, y: 0 });
      expect(out.x).toBeCloseTo(321, 2);
      expect(out.y).toBeCloseTo(654, 2);
      expect(field.z[3]).toBeCloseTo(1.6);
    }
  });
});
