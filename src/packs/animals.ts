// Animal outlines pack: eight organic silhouettes — fish, ladybug, duck,
// turtle, bunny, cat, butterfly, elephant — authored as validated JSON data.
// See `data/README.md` and `data/animals.json` for the geometry table; fish,
// ladybug, and butterfly trace as multiple anatomy-driven strokes (each with
// its own start star), the other five as one flowing closed outline.
import animalsJson from './data/animals.json';
import { parsePackJson } from './json';
import type { LevelDef } from './level';
import type { PackEntry } from './pack';

const pack = parsePackJson(animalsJson);

/** The eight animal levels in play order. */
export const ANIMAL_LEVELS: readonly LevelDef[] = pack.levels;

/** The animals pack: eight organic outlines plus their completion badge. */
export const ANIMALS_PACK: PackEntry = pack;
