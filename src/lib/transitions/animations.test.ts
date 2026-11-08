import { describe, expect, it } from 'vitest';
import { markerTransform, tilted } from '@/lib/transitions/animations';
import { turnOrigin } from '@/lib/transitions/ghost';

const rect = (left: number, top: number, width: number, height: number) =>
  ({ left, top, width, height }) as DOMRect;

describe('tilted', () => {
  it('moves down and turns, in perspective', () => {
    expect(tilted(6, -6)).toBe('perspective(1000px) translateY(6vh) rotateX(-6deg) scale(0.97)');
  });
});

describe('markerTransform', () => {
  it('puts the marker where the old one was', () => {
    expect(markerTransform(rect(10, 20, 100, 40), rect(110, 20, 50, 40))).toBe(
      'translate(-100px, 0px) scale(2, 1)',
    );
  });
});

describe('turnOrigin', () => {
  it('turns around the middle of the screen, measured from the top of the card', () => {
    expect(turnOrigin(100, 800)).toBe('50% 300px');
    expect(turnOrigin(-200, 800)).toBe('50% 600px');
  });
});
