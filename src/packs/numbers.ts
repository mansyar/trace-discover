// Numerals 0-9: simplest toddler forms per the track content doc
// (conductor/archive/letters-numbers-pack_20260915/content.md). Authored as
// validated JSON data — see `data/README.md` and `data/numbers.json` for the
// geometry table.
import numbersJson from './data/numbers.json';
import { parsePackJson } from './json';
import type { LevelDef } from './level';
import type { PackEntry } from './pack';

const pack = parsePackJson(numbersJson);

/** Numerals 0-9 in play order. */
export const NUMERAL_LEVELS: readonly LevelDef[] = pack.levels;

/** The numbers pack: numerals 0-9 plus their completion badge. */
export const NUMBERS_PACK: PackEntry = pack;
