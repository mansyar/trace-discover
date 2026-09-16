// Run planning: the celebration hop plan a pack's levels use. Numerals are
// counted hops (count parsed from the level id); letters hop once per stroke
// (a lift ends a stroke — a hop ends it with a note), capped so word bonuses
// stay short. Everything else keeps the default travel plan (undefined).
import { type HopTimeline, hopTimeline } from '../character/hops';
import { LETTERS_PACK } from '../packs/letters';
import { NUMBERS_PACK } from '../packs/numbers';

const LETTER_HOP_CAP = 4;

/** Letters hop once per stroke, capped at four (E = 4, C = 1, words <= 4). */
function letterHopPlan(levelId: string): HopTimeline | undefined {
  const level = [...LETTERS_PACK.levels, ...LETTERS_PACK.bonuses].find(
    (entry) => entry.id === levelId,
  );
  return level === undefined
    ? undefined
    : hopTimeline(Math.min(LETTER_HOP_CAP, level.strokes.length));
}

/** Counted reward hops for numerals and letters; undefined keeps the default plan. */
export function hopPlanFor(packId: string, levelId: string): HopTimeline | undefined {
  if (packId === NUMBERS_PACK.id) {
    const count = Number.parseInt(levelId.slice('num-'.length), 10);
    return Number.isNaN(count) ? undefined : hopTimeline(count);
  }
  if (packId === LETTERS_PACK.id) {
    return letterHopPlan(levelId);
  }
  return undefined;
}
