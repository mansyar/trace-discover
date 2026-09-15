// Content packs: an ordered level list, optional bonus circles unlocked by
// progress, and a completion badge. Pure data — progression rules live in
// `progress.ts` and read straight from the save.
import type { LevelDef } from './level';

/** One pack: ordered main levels + optional bonus circles + a completion badge. */
export interface PackEntry {
  readonly badgeId: string;
  /** Completed main-level counts at which each bonus unlocks (parallel to `bonuses`). */
  readonly bonusUnlocks: readonly number[];
  /** Bonus circles unlocked by progress; may be empty. */
  readonly bonuses: readonly LevelDef[];
  readonly id: string;
  /** Ordered main levels, e.g. `pre-1` ... `pre-12` or `num-0` ... `num-9`. */
  readonly levels: readonly LevelDef[];
  /** Menu card fill for this pack. */
  readonly menuFill: string;
}

/** Authoring shape accepted by `createPackEntry`. */
export interface PackSpec {
  readonly badgeId: string;
  readonly bonusUnlocks?: readonly number[];
  readonly bonuses?: readonly LevelDef[];
  readonly id: string;
  readonly levels: readonly LevelDef[];
  readonly menuFill: string;
}

export function createPackEntry(spec: PackSpec): PackEntry {
  const bonuses = spec.bonuses ?? [];
  const bonusUnlocks = spec.bonusUnlocks ?? [];
  if (spec.levels.length === 0) {
    throw new Error(`Pack ${spec.id} needs at least one level`);
  }
  if (bonusUnlocks.length !== bonuses.length) {
    throw new Error(`Pack ${spec.id} needs one unlock threshold per bonus`);
  }
  return {
    badgeId: spec.badgeId,
    bonusUnlocks,
    bonuses,
    id: spec.id,
    levels: spec.levels,
    menuFill: spec.menuFill,
  };
}
