// Menu-card mini-glyph fallback: packs whose card art has not shipped yet show
// drawn level strokes (numerals keep their v1 "1 2 3"; letters show "A B C");
// the name mini-pack composes its saved letters into a single drawn row.
import type { Point } from '../engine/types';
import { LETTER_LEVELS, LETTERS_PACK } from '../packs/letters';
import { levelToPath } from '../packs/level';
import { NAME_PACK_ID, namePackFor } from '../packs/name';
import { NUMBERS_PACK, NUMERAL_LEVELS } from '../packs/numbers';

const NUMBER_MINI = NUMERAL_LEVELS.slice(1, 4).map((level) => levelToPath(level));
const LETTER_MINI = LETTER_LEVELS.slice(0, 3).map((level) => levelToPath(level));

/** Placeholder strokes per menu card slot; [] means the generic icon shows. */
export function menuFallbackStrokes(
  packId: string,
  name?: string,
): readonly (readonly (readonly Point[])[])[] {
  if (packId === NUMBERS_PACK.id) {
    return NUMBER_MINI;
  }
  if (packId === LETTERS_PACK.id) {
    return LETTER_MINI;
  }
  if (packId === NAME_PACK_ID) {
    const level = namePackFor(name)?.levels[0];
    return level ? [levelToPath(level)] : [];
  }
  return [];
}
