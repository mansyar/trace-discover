// Turns raw pack JSON (imported from `src/packs/data/*.json`) into a validated
// `PackEntry`. Shape checks live in `parser.ts`; geometry (validateLevel) and
// pack rules (createPackEntry) are composed here, and every problem is labeled
// with its level index and id so load-time failures are actionable.
import type { LevelDef } from './level';
import { validateLevel } from './level';
import type { PackEntry } from './pack';
import { createPackEntry, type PackSpec } from './pack';
import { parseRawPack } from './parser';

/** The only bundle path levels may reference art from. */
const GOAL_ART_PREFIX = '/art/goal/';

/**
 * Parses raw pack JSON into a validated pack. Throws on the first problem,
 * labeled with the pack/level id: shape errors from `parser.ts`, geometry
 * errors from `validateLevel`, rule errors from `createPackEntry` and the
 * unlock rule below.
 */
export function parsePackJson(raw: unknown): PackEntry {
  const pack = parseRawPack(raw);
  const spec: PackSpec = {
    badgeId: pack.badgeId,
    bonusUnlocks: pack.bonusUnlocks,
    bonuses: pack.bonuses,
    id: pack.id,
    levels: pack.levels,
    menuFill: pack.menuFill,
  };
  checkLevels(spec.levels, `pack '${pack.id}' level`);
  checkLevels(spec.bonuses, `pack '${pack.id}' bonus level`);
  const lastUnlock = spec.bonusUnlocks?.[spec.bonusUnlocks.length - 1];
  if (lastUnlock !== undefined && lastUnlock !== spec.levels.length) {
    throw new Error(
      `pack '${pack.id}': final bonus unlock (${lastUnlock}) must equal the level count (${spec.levels.length})`,
    );
  }
  try {
    return createPackEntry(spec);
  } catch (error) {
    throw labeled(error, `pack '${pack.id}'`);
  }
}

/**
 * Validates each level's geometry and goalArt path. Problems are reported as
 * `<source> <index> ('<id>'): <problem>` — the validator's own index-based
 * messages (stroke 0 control point 1, ...) ride along after the label.
 */
function checkLevels(levels: readonly LevelDef[], at: string): void {
  levels.forEach((level, index) => {
    const label = `${at} ${index} ('${level.id}')`;
    if (level.goalArt.includes('..')) {
      throw new Error(`${label}: goalArt must not traverse outside ${GOAL_ART_PREFIX}`);
    }
    const problem = validateLevel(level)[0];
    if (problem !== undefined) {
      throw new Error(`${label}: ${problem}`);
    }
  });
}

/** Prefixes a thrown validation error with its pack-level label. */
function labeled(error: unknown, at: string): Error {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(`${at}: ${message}`);
}
