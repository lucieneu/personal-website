import type { Point } from '@/lib/starfield/projection';

/** An item to draw above the card: its center, height and opacity, and whether it's an outline. */
export interface Item extends Point {
  h: number;
  opacity: number;
  outline: boolean;
}

export const createItem = (): Item => ({ x: 0, y: 0, h: 0, opacity: 0, outline: false });
