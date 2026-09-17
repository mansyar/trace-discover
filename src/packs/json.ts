// Turns raw pack JSON (imported from `src/packs/data/*.json`) into a validated
// `PackEntry`. Shape checks live in `parser.ts`; geometry (validateLevel) and
// pack rules (createPackEntry) are composed here, and every problem is labeled
// with its level index and id so load-time failures are actionable.
// `collectPackProblems` is the non-throwing twin used by the authoring CLI.
import { validateLevel } from './level';
import type { PackEntry } from './pack';
import { createPackEntry, type PackSpec } from './pack';
import { parseRawPack, type RawLevel, type RawPack } from './parser';

/** The only bundle path levels may reference art from. */
const GOAL_ART_PREFIX = '/art/goal/';

/**
 * Parses raw pack JSON into a validated pack. Throws when the collector finds
 * any problem — shape errors from `parser.ts`, geometry errors from
 * `validateLevel`, rule errors from `createPackEntry` and the unlock rule.
 */
export function parsePackJson(raw: unknown): PackEntry {
  const problems = collectPackProblems(raw);
  if (problems.length > 0) {
    throw new Error(`pack ${jsonId(raw)} is invalid:\n- ${problems.join('\n- ')}`);
  }
  return createPackEntry(buildSpec(parseRawPack(raw)));
}

/** Best-effort pack id for error headers: the raw `id` when it is a string. */
function jsonId(raw: unknown): string {
  if (typeof raw === 'object' && raw !== null && 'id' in raw) {
    const id = (raw as { readonly id?: unknown }).id;
    if (typeof id === 'string' && id !== '') {
      return `'${id}'`;
    }
  }
  return '(unknown id)';
}

/**
 * Collects every problem in raw pack JSON as path-labeled strings — `pack: ...`
 * for pack-level problems, `pack level <i> ('<id>'): ...` for level geometry and
 * art paths (bonuses are labeled as levels of the `bonuses` list). Empty for
 * valid packs. Used by `parsePackJson` (throws with the list) and the
 * authoring CLI, so author-time and load-time validation are the same code.
 */
export function collectPackProblems(raw: unknown): string[] {
  let pack: RawPack;
  try {
    pack = parseRawPack(raw, 'pack');
  } catch (error) {
    return [messageOf(error)];
  }

  const problems = [
    ...levelProblems(pack.levels, `pack level`),
    ...levelProblems(pack.bonuses, `pack bonus level`),
  ];

  const lastUnlock = pack.bonusUnlocks[pack.bonusUnlocks.length - 1];
  if (lastUnlock !== undefined && lastUnlock !== pack.levels.length) {
    problems.push(
      `pack: final bonus unlock (${lastUnlock}) must equal the level count (${pack.levels.length})`,
    );
  }

  const spec = buildSpec(pack);
  try {
    createPackEntry(spec);
  } catch (error) {
    problems.push(`pack: ${messageOf(error)}`);
  }

  return problems;
}

function levelProblems(levels: readonly RawLevel[], at: string): string[] {
  const problems: string[] = [];
  levels.forEach((level, index) => {
    const label = `${at} ${index} ('${level.id}')`;
    if (level.goalArt.includes('..')) {
      problems.push(`${label}: goalArt must not traverse outside ${GOAL_ART_PREFIX}`);
    }
    for (const problem of validateLevel(level)) {
      problems.push(`${label}: ${problem}`);
    }
  });
  return problems;
}

function buildSpec(pack: RawPack): PackSpec {
  return {
    badgeId: pack.badgeId,
    bonusUnlocks: pack.bonusUnlocks,
    bonuses: pack.bonuses,
    id: pack.id,
    levels: pack.levels,
    menuFill: pack.menuFill,
  };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
