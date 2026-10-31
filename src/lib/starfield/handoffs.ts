// The card hand-offs that are running. A navigation during one starts its own and leaves the
// earlier ones running, up to MAX_HANDOFFS; beyond that the oldest finishes at once.
import type { Field } from '@/lib/starfield/field';
import {
  type CardSpan,
  finishHandoff,
  type Handoff,
  handoffDone,
  itemsAt,
  type Screen,
  startHandoff,
} from '@/lib/starfield/handoff';
import { createItem, type Item } from '@/lib/starfield/item';

export const MAX_HANDOFFS = 4;

export class HandoffQueue {
  private readonly running: Handoff[] = [];
  /** Two items per hand-off, written by `itemsAt` and drawn by the caller. Allocated once. */
  readonly items: Item[] = Array.from({ length: MAX_HANDOFFS * 2 }, createItem);

  /** Starts a hand-off, if a star fits; makes room first when MAX_HANDOFFS are running. */
  start(
    field: Field,
    seconds: number,
    screen: Screen,
    card: CardSpan,
    back: boolean,
    random = Math.random,
  ) {
    if (this.running.length === MAX_HANDOFFS) finishHandoff(field, this.running.shift()!, seconds);
    const handoff = startHandoff(field, seconds, screen, card, back, random);
    if (handoff) this.running.push(handoff);
  }

  /** Finishes the hand-offs that are over. They start in order, so the oldest is done first. */
  finishDone(field: Field, seconds: number) {
    while (this.running.length && handoffDone(this.running[0]!, seconds))
      finishHandoff(field, this.running.shift()!, seconds);
  }

  /** Writes the items of all running hand-offs at `seconds` into `items`; returns how many. */
  itemsAt(field: Field, seconds: number, screen: Screen) {
    let count = 0;
    for (const handoff of this.running)
      count = itemsAt(handoff, field, seconds, screen, this.items, count);
    return count;
  }
}
