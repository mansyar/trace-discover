// Turns raw pack JSON (imported from `src/packs/data/*.json`) into a validated
// `PackEntry`. Shape checks live in `parser.ts`; geometry (validateLevel) and
// pack rules (createPackEntry) are composed here, and every problem is labeled
// with its level index and id so load-time failures are actionable.
// `collectPackProblems` is the non-throwing twin used by the authoring CLI;
// both flow through one inspector, so author-time and load-time validation are
// the same code and the pack is parsed exactly once per call site.
import { validateLevel } from './level';
import type { PackEntry } from './pack';
import { createPackEntry, type PackSpec } from './pack';
import { GOAL_ART_PREFIX, parseRawPack, type RawLevel, type RawPack } from './parser';

interface Inspection {
  /** Every problem found; empty means `pack` is present and valid. */
  readonly problems: readonly string[];
  /** The shape-checked pack, when shape validation passed. */
  readonly pack: RawPack | undefined;
}

/**
 * Parses raw pack JSON into a validated pack. Throws when the collector finds
 * any problem — shape errors from `parser.ts`, geometry errors from
 * `validateLevel`, rule errors from `createPackEntry` and the unlock rules.
 */
export function parsePackJson(raw: unknown): PackEntry {
  const { problems, pack } = inspectPack(raw);
  if (problems.length > 0 || pack === undefined) {
    throw new Error(`pack ${jsonId(raw)} is invalid:\n- ${problems.join('\n- ')}`);
  }
  return createPackEntry(buildSpec(pack));
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
 * authoring CLI.
 */
export function collectPackProblems(raw: unknown): string[] {
  return [...inspectPack(raw).problems];
}

/** Shape-checks once, then gathers geometry, unlock, and pack-rule problems. */
function inspectPack(raw: unknown): Inspection {
  let pack: RawPack;
  try {
    pack = parseRawPack(raw, 'pack');
  } catch (error) {
    return { problems: [messageOf(error)], pack: undefined };
  }

  const problems = [
    ...levelProblems(pack.levels, 'pack level'),
    ...levelProblems(pack.bonuses, 'pack bonus level'),
    ...unlockProblems(pack),
  ];

  const lastUnlock = pack.bonusUnlocks[pack.bonusUnlocks.length - 1];
  if (lastUnlock !== undefined && lastUnlock !== pack.levels.length) {
    problems.push(
      `pack: final bonus unlock (${lastUnlock}) must equal the level count (${pack.levels.length})`,
    );
  }

  try {
    createPackEntry(buildSpec(pack));
  } catch (error) {
    problems.push(`pack: ${messageOf(error)}`);
  }

  return { problems, pack };
}

/** Every unlock threshold must be an integer within `1..levelCount`. */
function unlockProblems(pack: RawPack): string[] {
  return pack.bonusUnlocks.flatMap((threshold, index) => {
    if (!Number.isInteger(threshold) || threshold < 1 || threshold > pack.levels.length) {
      return [
        `pack: bonusUnlocks entry ${index} must be an integer within 1..${pack.levels.length}`,
      ];
    }
    return [];
  });
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
