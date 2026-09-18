// Shapes pack: eight toddler-first shapes — circle, square, triangle, oval,
// diamond, heart, star, plus — authored as validated JSON data. See
// `data/README.md` and `data/shapes.json` for the geometry table; star and
// plus trace as two strokes, the six closed shapes as one closed loop.
import shapesJson from './data/shapes.json';
import { parsePackJson } from './json';
import type { LevelDef } from './level';
import type { PackEntry } from './pack';

const pack = parsePackJson(shapesJson);

/** The eight shape levels in play order. */
export const SHAPE_LEVELS: readonly LevelDef[] = pack.levels;

/** The shapes pack: eight shapes plus their completion badge. */
export const SHAPES_PACK: PackEntry = pack;
