import { describe, expect, it } from 'vitest';
import { FIXED_MAX, fixedCount, STAR_MAX, starCount } from '@/lib/starfield/counts';

describe('star counts', () => {
  it('gives the base screen the base counts', () => {
    expect(starCount(1440, 900)).toBe(1500);
    expect(fixedCount(1440, 900)).toBe(1000);
  });

  it('scales with the screen area', () => {
    expect(starCount(720, 900)).toBe(750);
    expect(fixedCount(1440, 450)).toBe(500);
  });

  it('stops at twice the base count on a huge screen', () => {
    expect(starCount(10000, 10000)).toBe(STAR_MAX);
    expect(fixedCount(10000, 10000)).toBe(FIXED_MAX);
  });
});
