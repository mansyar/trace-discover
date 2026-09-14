// Theme progression rules (pure): sticker count, theme completion, badge
// awarding, and bonus unlocking. Reads straight from the save; the shell
// performs the celebration choreography around these gates.
import type { SaveData } from '../save/store';

export function completedCount(save: SaveData, levelIds: readonly string[]): number {
  return levelIds.filter((levelId) => save.completedLevels.includes(levelId)).length;
}

export function isThemeComplete(save: SaveData, levelIds: readonly string[]): boolean {
  return levelIds.every((levelId) => save.completedLevels.includes(levelId));
}

export function shouldAwardBadge(
  save: SaveData,
  themeId: string,
  levelIds: readonly string[],
): boolean {
  return isThemeComplete(save, levelIds) && !save.badges.includes(themeId);
}

export function isBonusOpen(save: SaveData, themeId: string, levelIds: readonly string[]): boolean {
  return isThemeComplete(save, levelIds) && save.badges.includes(themeId);
}

export function bonusLevelId(themeId: string): string {
  return `${themeId}-bonus`;
}
