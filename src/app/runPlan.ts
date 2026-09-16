// Run planning: the celebration hop plan a pack's levels use. Numerals are
// counted hops (count parsed from the level id); letters hop once per stroke
// (a lift ends a stroke — a hop ends it with a note), capped so word bonuses
// stay short. The saved name hops once per glyph stroke (the caller passes the
// stroke count). Everything else keeps the default travel plan (undefined).
import { type HopTimeline, hopTimeline } from '../character/hops';
import { LETTERS_PACK } from '../packs/letters';
import { NAME_PACK_ID } from '../packs/name';
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

/** Counted reward hops for numerals, letters and the name; undefined keeps the default plan. */
export function hopPlanFor(
  packId: string,
  levelId: string,
  strokeCount?: number,
): HopTimeline | undefined {
  if (packId === NUMBERS_PACK.id) {
    const count = Number.parseInt(levelId.slice('num-'.length), 10);
    return Number.isNaN(count) ? undefined : hopTimeline(count);
  }
  if (packId === LETTERS_PACK.id) {
    return letterHopPlan(levelId);
  }
  if (packId === NAME_PACK_ID && strokeCount !== undefined) {
    return hopTimeline(Math.min(LETTER_HOP_CAP, strokeCount));
  }
  return undefined;
}
