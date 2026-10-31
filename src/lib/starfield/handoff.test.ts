import { describe, expect, it } from 'vitest';
import {
  createField,
  type Field,
  opacityOf,
  placeOnScreen,
  reveal,
  screenOf,
  starHeight,
} from '@/lib/starfield/field';
import {
  finishHandoff,
  handoffDone,
  type Item,
  itemsAt,
  startHandoff,
} from '@/lib/starfield/handoff';
import { always, seeded } from '@/lib/starfield/testing';

const WIDTH = 1440;
const HEIGHT = 900;
const CARD = { left: 300, right: 1100 };
const NOW = 100;

const newItems = (): Item[] =>
  Array.from({ length: 2 }, () => ({ x: 0, y: 0, h: 0, opacity: 0, outline: false }));

/** A field with one star, fully shown at (`x`, `y`) on the screen. */
function fieldWithStar(x: number, y: number): Field {
  const field = createField(WIDTH, HEIGHT, seeded());
  field.count = 1;
  placeOnScreen(field, 0, { x, y }, 1.5, NOW, WIDTH, HEIGHT);
  reveal(field, 0, 1, NOW - 10, 0, always(0.9));
  return field;
}

describe('startHandoff', () => {
  it('picks the star in the sidebar column, hides it and records where it was', () => {
    const field = fieldWithStar(150, 200);
    const handoff = startHandoff(field, NOW, WIDTH, HEIGHT, CARD, false, always(0.5));
    expect(handoff).toBeDefined();
    expect(handoff!.star).toBe(0);
    expect(handoff!.inward).toBe(1);
    expect(handoff!.from.x).toBeCloseTo(150, 2);
    expect(handoff!.from.y).toBeCloseTo(200, 2);
    expect(handoff!.from.h).toBeCloseTo(starHeight(1.5));
    expect(opacityOf(field, 0, NOW)).toBe(0);
  });

  it('finds nothing when no star is in the upper half', () => {
    const field = fieldWithStar(150, 800);
    expect(startHandoff(field, NOW, WIDTH, HEIGHT, CARD, false, always(0.5))).toBeUndefined();
    expect(opacityOf(field, 0, NOW)).toBeGreaterThan(0);
  });

  it('looks in the lower half on Back', () => {
    const field = fieldWithStar(150, 800);
    const handoff = startHandoff(field, NOW, WIDTH, HEIGHT, CARD, true, always(0.5));
    expect(handoff?.back).toBe(true);
  });

  it('ignores a star that is too faint, too near or too far', () => {
    const field = fieldWithStar(150, 200);
    field.z[0] = 0.5;
    expect(startHandoff(field, NOW, WIDTH, HEIGHT, CARD, false, always(0.5))).toBeUndefined();
  });

  it('on a phone, leaves at one side or the other, picked at random', () => {
    const phoneCard = { left: 16, right: WIDTH - 16 };
    const left = startHandoff(
      fieldWithStar(8, 200),
      NOW,
      WIDTH,
      HEIGHT,
      phoneCard,
      false,
      always(0.1),
    );
    const right = startHandoff(
      fieldWithStar(WIDTH - 8, 200),
      NOW,
      WIDTH,
      HEIGHT,
      phoneCard,
      false,
      always(0.9),
    );
    expect(left?.inward).toBe(1);
    expect(right?.inward).toBe(-1);
  });
});

describe('itemsAt', () => {
  const start = () => {
    const field = fieldWithStar(150, 200);
    const handoff = startHandoff(field, NOW, WIDTH, HEIGHT, CARD, false, always(0.5))!;
    return { field, handoff };
  };

  it('starts with only the flare, at the star, still a filled star', () => {
    const { field, handoff } = start();
    const items = newItems();
    expect(itemsAt(handoff, field, NOW, WIDTH, HEIGHT, items)).toBe(1);
    expect(items[0]!.x).toBeCloseTo(150, 2);
    expect(items[0]!.y).toBeCloseTo(200, 2);
    expect(items[0]!.outline).toBe(false);
  });

  it('adds the returning outline, below the bottom edge, once the old card has begun to leave', () => {
    const { field, handoff } = start();
    const items = newItems();
    expect(itemsAt(handoff, field, NOW + 0.2, WIDTH, HEIGHT, items)).toBe(2);
    expect(items[1]!.y).toBeGreaterThan(HEIGHT / 2);
    expect(items[1]!.outline).toBe(true);
  });

  it('ends with only the returning item, where the hidden star will show', () => {
    const { field, handoff } = start();
    const items = newItems();
    const end = NOW + 3.12;
    expect(itemsAt(handoff, field, end, WIDTH, HEIGHT, items)).toBe(1);
    const target = screenOf(field, 0, end, WIDTH, HEIGHT, { x: 0, y: 0 });
    expect(items[0]!.x).toBeCloseTo(target.x, 1);
    expect(items[0]!.y).toBeCloseTo(target.y, 1);
    expect(items[0]!.outline).toBe(false);
  });

  it('writes after the items already there', () => {
    const { field, handoff } = start();
    expect(itemsAt(handoff, field, NOW, WIDTH, HEIGHT, newItems(), 1)).toBe(2);
  });

  it('mirrors the outline top to bottom on Back', () => {
    const field = fieldWithStar(150, 800);
    const handoff = startHandoff(field, NOW, WIDTH, HEIGHT, CARD, true, always(0.5))!;
    const items = newItems();
    itemsAt(handoff, field, NOW + 0.2, WIDTH, HEIGHT, items);
    expect(items[1]!.y).toBeLessThan(HEIGHT / 2);
  });
});

describe('finishing', () => {
  it('is done after the outline has arrived, and then shows the star at once', () => {
    const field = fieldWithStar(150, 200);
    const handoff = startHandoff(field, NOW, WIDTH, HEIGHT, CARD, false, always(0.5))!;
    expect(handoffDone(handoff, NOW + 3)).toBe(false);
    expect(handoffDone(handoff, NOW + 3.12)).toBe(true);
    finishHandoff(field, handoff, NOW + 3.12);
    expect(opacityOf(field, 0, NOW + 3.12)).toBeGreaterThan(0);
  });
});
