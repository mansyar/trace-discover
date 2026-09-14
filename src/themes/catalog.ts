import { ANIMAL_LEVELS, ANIMALS_THEME } from './animals';
import { CONSTRUCTION_LEVELS, CONSTRUCTION_THEME } from './construction';
import { DINO_LEVELS, DINO_THEME } from './dino';
import type { LevelDef, ThemeDef } from './level';

/** One theme's playable content: four ramp levels plus its locked bonus. */
export interface ThemeCatalogEntry {
  theme: ThemeDef;
  mainLevels: readonly LevelDef[];
  bonus: LevelDef;
  /** Menu card fill for this theme. */
  menuFill: string;
}

function entry(theme: ThemeDef, levels: readonly LevelDef[], menuFill: string): ThemeCatalogEntry {
  const bonus = levels.find((level) => level.id === `${theme.id}-bonus`);
  if (!bonus) throw new Error(`Missing bonus level for theme ${theme.id}`);
  return { theme, mainLevels: levels.filter((level) => level !== bonus), bonus, menuFill };
}

const ENTRIES: ThemeCatalogEntry[] = [
  entry(DINO_THEME, DINO_LEVELS, '#8ecae6'),
  entry(CONSTRUCTION_THEME, CONSTRUCTION_LEVELS, '#ffd166'),
  entry(ANIMALS_THEME, ANIMAL_LEVELS, '#90be6d'),
];

/** Theme ids in menu order. */
export function allThemeIds(): string[] {
  return ENTRIES.map((entry) => entry.theme.id);
}

export function themeEntry(themeId: string): ThemeCatalogEntry | undefined {
  return ENTRIES.find((entry) => entry.theme.id === themeId);
}

/** Main level ids, plus the bonus once its theme is complete. */
export function playableLevelIds(entry: ThemeCatalogEntry, bonusOpen: boolean): string[] {
  const ids = entry.mainLevels.map((level) => level.id);
  if (bonusOpen) ids.push(entry.bonus.id);
  return ids;
}

/** Next id in the playable list, wrapping around. Unknown ids restart at the first level. */
export function nextLevelId(
  entry: ThemeCatalogEntry,
  currentId: string,
  bonusOpen: boolean,
): string {
  const ids = playableLevelIds(entry, bonusOpen);
  const next = ids[(ids.indexOf(currentId) + 1) % ids.length];
  return next ?? ids[0] ?? currentId;
}
