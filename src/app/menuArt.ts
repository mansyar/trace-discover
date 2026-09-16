// Menu-card mini-glyph fallback: packs whose card art has not shipped yet show
// drawn level strokes (numerals keep their v1 "1 2 3"; letters show "A B C").
import type { Point } from '../engine/types';
import { LETTER_LEVELS, LETTERS_PACK } from '../packs/letters';
import { levelToPath } from '../packs/level';
import { NUMBERS_PACK, NUMERAL_LEVELS } from '../packs/numbers';

const NUMBER_MINI = NUMERAL_LEVELS.slice(1, 4).map((level) => levelToPath(level));
const LETTER_MINI = LETTER_LEVELS.slice(0, 3).map((level) => levelToPath(level));

/** Placeholder strokes per menu card slot; [] means the generic icon shows. */
export function menuFallbackStrokes(packId: string): readonly (readonly (readonly Point[])[])[] {
  if (packId === NUMBERS_PACK.id) {
    return NUMBER_MINI;
  }
  if (packId === LETTERS_PACK.id) {
    return LETTER_MINI;
  }
  return [];
}
