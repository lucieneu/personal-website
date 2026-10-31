// Section 1 of the card hand-off (docs/project-spec.md, Page transitions): the star that leaves
// swells, brightens and fades out where it is.
import type { Item } from '@/lib/starfield/item';
import { clamp01, lerp, logLerp, smooth } from '@/lib/starfield/math';

/**
 * In FLARE seconds the star swells to FLARE_HEIGHT px (in the first FLARE_GROW of that time),
 * brightens by FLARE_BRIGHTER until FLARE_PEAK of the time, then fades out in place.
 */
export const FLARE = 0.4;
const FLARE_HEIGHT = 6;
const FLARE_GROW = 0.4;
const FLARE_BRIGHTER = 0.3;
const FLARE_PEAK = 0.3;

/** Writes the flare of a star that was `from`, `elapsed` seconds after it started, into `item`. */
export function writeFlare(item: Item, from: Item, elapsed: number) {
  const p = elapsed / FLARE;
  const peak = Math.min(1, from.opacity + FLARE_BRIGHTER);
  item.x = from.x;
  item.y = from.y;
  item.h = logLerp(from.h, FLARE_HEIGHT, smooth(clamp01(p / FLARE_GROW)));
  item.opacity =
    p < FLARE_PEAK
      ? lerp(from.opacity, peak, smooth(p / FLARE_PEAK))
      : lerp(peak, 0, smooth((p - FLARE_PEAK) / (1 - FLARE_PEAK)));
  item.outline = false;
}
