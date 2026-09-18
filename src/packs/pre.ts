// The pre-writing pack: the canonical 12-slot stroke curriculum plus three
// bonus circles, organized as a real small -> medium -> large ramp. Slots 1-4
// are small (span 140), 5-8 medium (span 230), 9-12 large (span 310); every
// block repeats line, wave, arc, zigzag. Bonus circles unlock at 4/8/12 and
// grow with their block. Authored as validated JSON data — see
// `data/README.md` and `data/pre.json` for the geometry table.
import preJson from './data/pre.json';
import { parsePackJson } from './json';
import type { LevelDef } from './level';
import type { PackEntry } from './pack';

const pack = parsePackJson(preJson);

/** The twelve main pre-writing slots in play order. */
export const PRE_LEVELS: readonly LevelDef[] = pack.levels;

/** The three bonus circles, unlocked one per completed block (4/8/12). */
export const PRE_BONUS_LEVELS: readonly LevelDef[] = pack.bonuses;

/** The pre-writing pack: twelve slots, three circles unlocking at 4/8/12. */
export const PRE_PACK: PackEntry = pack;
