import { describe, expect, it } from 'vitest';
import { createField, type Field } from '@/lib/starfield/field';
import { HandoffQueue, MAX_HANDOFFS } from '@/lib/starfield/handoffs';
import { reveal } from '@/lib/starfield/lifetimes';
import { placeOnScreen } from '@/lib/starfield/projection';
import { always, seeded } from '@/lib/starfield/testing';

const SCREEN = { width: 1440, height: 900 };
const CARD = { left: 300, right: 1100 };
const NOW = 100;

/** A field with `count` fully shown stars next to the sidebar, one above the other. */
function fieldWithStars(count: number): Field {
  const field = createField(SCREEN.width, SCREEN.height, seeded());
  field.count = count;
  field.brightness.fill(1);
  for (let i = 0; i < count; i++)
    placeOnScreen(field, i, { x: 150, y: 50 + i * 20 }, 1.5, NOW, SCREEN.width, SCREEN.height);
  reveal(field, 0, count, NOW - 10, 0, always(0.9));
  return field;
}

describe('HandoffQueue', () => {
  it('has nothing to draw until a hand-off starts', () => {
    const queue = new HandoffQueue();
    expect(queue.itemsAt(fieldWithStars(1), NOW, SCREEN)).toBe(0);
  });

  it('draws a hand-off from its start and none after it is finished', () => {
    const field = fieldWithStars(1);
    const queue = new HandoffQueue();
    queue.start(field, NOW, SCREEN, CARD, false, always(0.5));
    expect(queue.itemsAt(field, NOW, SCREEN)).toBe(1);
    queue.finishDone(field, NOW + 10);
    expect(queue.itemsAt(field, NOW + 10, SCREEN)).toBe(0);
  });

  it('keeps earlier hand-offs running when another starts', () => {
    const field = fieldWithStars(2);
    const queue = new HandoffQueue();
    queue.start(field, NOW, SCREEN, CARD, false, always(0.5));
    queue.start(field, NOW + 0.2, SCREEN, CARD, false, always(0.5));
    // The first is in its flare and its outline, the second only in its flare.
    expect(queue.itemsAt(field, NOW + 0.2, SCREEN)).toBe(3);
  });

  it('finishes the oldest at once when too many are running', () => {
    const field = fieldWithStars(MAX_HANDOFFS + 1);
    const queue = new HandoffQueue();
    for (let i = 0; i <= MAX_HANDOFFS; i++)
      queue.start(field, NOW, SCREEN, CARD, false, always(0.5));
    // The first flare is over by now; each of the other hand-offs has a flare and an outline.
    expect(queue.itemsAt(field, NOW + 0.2, SCREEN)).toBe(MAX_HANDOFFS * 2);
  });
});
