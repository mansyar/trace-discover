// Run planning: the celebration hop plan a pack's levels use. Numerals are
// counted hops (count parsed from the level id); every other pack runs the
// default travel plan for now — letters gain per-stroke hops in this track's
// reward phase (letters-pack_20260916).
import { type HopTimeline, hopTimeline } from '../character/hops';
import { NUMBERS_PACK } from '../packs/numbers';

/** Counted reward hops for numerals; undefined keeps the default plan. */
export function hopPlanFor(packId: string, levelId: string): HopTimeline | undefined {
  if (packId !== NUMBERS_PACK.id) {
    return undefined;
  }
  const count = Number.parseInt(levelId.slice('num-'.length), 10);
  return Number.isNaN(count) ? undefined : hopTimeline(count);
}
