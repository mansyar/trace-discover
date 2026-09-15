// Zero-text packs (numerals now, letters later): an ordered level list plus a
// completion badge. Pure progression rules read straight from the save; the
// pack screen performs the celebration choreography around these gates.
import type { SaveData } from '../save/store';
import type { LevelDef } from './level';

/** One pack: an ordered level sequence (e.g. numerals 0-9) + completion badge. */
export interface PackEntry {
  id: string;
  badgeId: string;
  /** Ordered levels, e.g. num-0 ... num-9. */
  levels: readonly LevelDef[];
  /** Menu card fill for this pack. */
  menuFill: string;
}

export function createPackEntry(
  id: string,
  badgeId: string,
  menuFill: string,
  levels: readonly LevelDef[],
): PackEntry {
  if (levels.length === 0) throw new Error(`Pack ${id} needs at least one level`);
  return { id, badgeId, levels, menuFill };
}

/** Ordered level ids in the pack. */
export function packLevelIds(entry: PackEntry): string[] {
  return entry.levels.map((level) => level.id);
}

/** Next id in the pack, wrapping around. Unknown ids restart at the first level. */
export function nextPackLevelId(entry: PackEntry, currentId: string): string {
  const ids = packLevelIds(entry);
  const next = ids[(ids.indexOf(currentId) + 1) % ids.length];
  return next ?? ids[0] ?? currentId;
}

/** Numerals cleared so far. */
export function packCompletedCount(save: SaveData, entry: PackEntry): number {
  return entry.levels.filter((level) => save.completedLevels.includes(level.id)).length;
}

export function isPackComplete(save: SaveData, entry: PackEntry): boolean {
  return entry.levels.every((level) => save.completedLevels.includes(level.id));
}

export function shouldAwardPackBadge(save: SaveData, entry: PackEntry): boolean {
  return isPackComplete(save, entry) && !save.badges.includes(entry.badgeId);
}
