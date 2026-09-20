// Patterns pack: nine pre-writing motifs — loop, spiral, stairs, each in
// three sizes (small → medium → large) — authored as validated JSON data.
// See `data/README.md` and `data/patterns.json` for the geometry table;
// every level is single-stroke, and the loops close back to their start.

import patternsJson from './data/patterns.json';
import { parsePackJson } from './json';
import type { LevelDef } from './level';
import type { PackEntry } from './pack';

const pack = parsePackJson(patternsJson);

/** The nine pattern levels in play order (size-major, pre-pack convention). */
export const PATTERN_LEVELS: readonly LevelDef[] = pack.levels;

/** The patterns pack: nine motifs plus their completion badge. */
export const PATTERNS_PACK: PackEntry = pack;
