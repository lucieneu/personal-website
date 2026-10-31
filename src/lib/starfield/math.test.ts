import { describe, expect, it } from 'vitest';
import { clamp01, lerp, logLerp, outExpo, quadratic, smooth } from '@/lib/starfield/math';

describe('math', () => {
  it('clamps to 0–1', () => {
    expect([clamp01(-1), clamp01(0.4), clamp01(2)]).toEqual([0, 0.4, 1]);
  });

  it('interpolates linearly and on a log scale', () => {
    expect(lerp(10, 20, 0.25)).toBe(12.5);
    expect(logLerp(1, 100, 0.5)).toBeCloseTo(10);
    expect(logLerp(24, 3, 0)).toBe(24);
    expect(logLerp(24, 3, 1)).toBeCloseTo(3);
  });

  it('eases in and out between 0 and 1', () => {
    expect([smooth(0), smooth(0.5), smooth(1)]).toEqual([0, 0.5, 1]);
    expect(smooth(0.1)).toBeLessThan(0.1);
  });

  it('eases out: fast at the start, settled at the end', () => {
    expect(outExpo(0)).toBe(0);
    expect(outExpo(1)).toBe(1);
    expect(outExpo(0.1)).toBeGreaterThan(0.4);
    expect(outExpo(0.9) - outExpo(0.8)).toBeLessThan(outExpo(0.1) - outExpo(0));
  });

  it('follows a quadratic Bézier curve', () => {
    expect(quadratic(0, 10, 20, 0)).toBe(0);
    expect(quadratic(0, 10, 20, 1)).toBe(20);
    expect(quadratic(0, 100, 0, 0.5)).toBe(50);
  });
});
