// Letters: the alphabet pack — 26 uppercase levels traced in alphabet-song
// order plus three sequence bonuses (ABC / MOM / ZOO) unlocking at 9/18/26
// cleared. Geometry is authored as validated JSON data (`data/abc.json`; see
// `data/README.md`) and this module is a thin loader plus the shared glyph and
// wide-row helpers the name composer and landscape layout rely on.
import type { Point, StrokePattern } from '../engine/types';
import { LANDSCAPE_FIELD_HEIGHT, LANDSCAPE_FIELD_WIDTH, type Orientation } from '../field';
import letterJson from './data/abc.json';
import { parsePackJson } from './json';
import type { LevelDef } from './level';
import type { PackEntry } from './pack';
import { composeWordRow, WIDE_WORD_BOX, type WordGlyph } from './word';

const pack = parsePackJson(letterJson);

/** The twenty-six uppercase letters in play order (A → Z). */
export const LETTER_LEVELS: readonly LevelDef[] = pack.levels;

/** The three sequence bonuses — ABC / MOM / ZOO — unlocking at 9/18/26. */
export const LETTER_BONUS_LEVELS: readonly LevelDef[] = pack.bonuses;

/** Builds a level whose goal is the final control point of its last stroke. */
export function letterLevel(
  id: string,
  stroke: StrokePattern,
  strokes: readonly (readonly Point[])[],
): LevelDef {
  const lastStroke = strokes[strokes.length - 1];
  const goal = lastStroke ? lastStroke[lastStroke.length - 1] : undefined;
  if (!goal) {
    throw new Error(`letter level ${id} needs at least one control point`);
  }
  return { goal, goalArt: `/art/goal/${id}.webp`, id, stroke, strokes };
}

/** Word spelling per sequence bonus, used when recomposing wide rows. */
const BONUS_WORDS: Readonly<Record<string, string>> = {
  'abc-bonus-1': 'ABC',
  'abc-bonus-2': 'MOM',
  'abc-bonus-3': 'ZOO',
};

const BONUS_GAP = 30;

/** Glyph lookup shared by the name composer and the wide bonus rows. */
export function letterGlyph(char: string): WordGlyph {
  const level = LETTER_LEVELS.find((entry) => entry.id === `abc-${char.toLowerCase()}`);
  if (level === undefined) {
    throw new Error(`no letter glyph for "${char}"`);
  }
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  for (const stroke of level.strokes) {
    for (const point of stroke) {
      left = Math.min(left, point.x);
      right = Math.max(right, point.x);
    }
  }
  return { left, right, strokes: level.strokes };
}

/**
 * Run level for a sequence bonus: the portrait field keeps the authored slots;
 * the wide field recomposes the word as a full-size row via the shared
 * composer so ABC / MOM / ZOO fill the landscape box.
 */
export function bonusRunLevel(level: LevelDef, orientation: Orientation): LevelDef | null {
  const word = BONUS_WORDS[level.id];
  if (word === undefined) {
    return null;
  }
  if (orientation === 'portrait') {
    return level;
  }
  const glyphs = [...word].map(letterGlyph);
  const { strokes } = composeWordRow(glyphs, WIDE_WORD_BOX, BONUS_GAP);
  const goal = strokes[strokes.length - 1]?.at(-1) ?? {
    x: LANDSCAPE_FIELD_WIDTH / 2,
    y: LANDSCAPE_FIELD_HEIGHT / 2,
  };
  return { ...level, goal, strokes };
}

/** The letters pack: twenty-six uppercase letters plus three sequence bonuses. */
export const LETTERS_PACK: PackEntry = pack;
