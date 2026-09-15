// Unified pack progress: one model for every pack — pre-writing and numbers —
// replacing the split theme-progress / pack-progress modules. Reads straight
// from the save (`completedLevels` + `badges`, save v3): the pack owns
// progression, the skin owns none of it.
import type { PackEntry } from './pack';

/** The slice of save data progression reads: completed level ids + earned badges. */
export interface ProgressSave {
  readonly badges: readonly string[];
  readonly completedLevels: readonly string[];
}

/** Main levels of the pack cleared so far (bonuses do not count). */
export function completedCount(save: ProgressSave, pack: PackEntry): number {
  return pack.levels.filter((level) => save.completedLevels.includes(level.id)).length;
}

/** True when every main level of the pack is complete (bonuses excluded). */
export function isPackComplete(save: ProgressSave, pack: PackEntry): boolean {
  return completedCount(save, pack) === pack.levels.length;
}

/** True while the pack is complete and its badge has not been earned yet. */
export function shouldAwardPackBadge(save: ProgressSave, pack: PackEntry): boolean {
  return isPackComplete(save, pack) && !save.badges.includes(pack.badgeId);
}

/** True when the circle at `index` is open: completed count >= its threshold. */
export function bonusUnlocked(save: ProgressSave, pack: PackEntry, index: number): boolean {
  const threshold = pack.bonusUnlocks[index];
  if (threshold === undefined) return false;
  return completedCount(save, pack) >= threshold;
}

/** Play order for a pack: main levels first, then circles once unlocked. */
function playOrderIds(save: ProgressSave, pack: PackEntry): string[] {
  const ids = pack.levels.map((level) => level.id);
  pack.bonuses.forEach((bonus, index) => {
    if (bonusUnlocked(save, pack, index)) ids.push(bonus.id);
  });
  return ids;
}

/** Next id in the pack, wrapping around; unknown ids restart at the first level. */
export function nextPackLevelId(save: ProgressSave, pack: PackEntry, currentId: string): string {
  const ids = playOrderIds(save, pack);
  const next = ids[(ids.indexOf(currentId) + 1) % ids.length];
  return next ?? ids[0] ?? currentId;
}
