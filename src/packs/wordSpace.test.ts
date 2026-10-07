// Space-aware word rows (track tablet-fit_20261006): the row composer is the
// one place where tablet geometry may legitimately grow, because it clamps
// scale at a single letter's authored size. These specs pin that contract
// across the three modules that share it — the box builder (`word.ts`), the
// runtime name level (`name.ts`) and the sequence bonuses (`letters.ts`) — and
// lock the two phone references byte-identical to today.
import { describe, expect, it } from 'vitest';
import { FIELD_SPACES, type FieldSpace } from '../field';
import { bonusRunLevel, LETTER_BONUS_LEVELS, LETTER_LEVELS } from './letters';
import { buildNameLevel, NAME_BOX, NAME_BOX_LANDSCAPE, nameGlyphScale } from './name';
import { WIDE_WORD_BOX, wordRowBox } from './word';

const PHONE_PORTRAIT = FIELD_SPACES['phone-portrait'];
const PHONE_LANDSCAPE = FIELD_SPACES['phone-landscape'];
const TABLET_PORTRAIT = FIELD_SPACES['tablet-portrait'];
const TABLET_LANDSCAPE = FIELD_SPACES['tablet-landscape'];
const SLATE_PORTRAIT = FIELD_SPACES['slate-portrait'];
const SLATE_LANDSCAPE = FIELD_SPACES['slate-landscape'];

const ALL_SPACES: readonly FieldSpace[] = [
  PHONE_PORTRAIT,
  PHONE_LANDSCAPE,
  TABLET_PORTRAIT,
  TABLET_LANDSCAPE,
  SLATE_PORTRAIT,
  SLATE_LANDSCAPE,
];

function boundsOf(strokes: readonly (readonly { x: number; y: number }[])[]) {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const stroke of strokes) {
    for (const point of stroke) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
  }
  return { maxX, maxY, minX, minY };
}

describe('wordRowBox', () => {
  it('reproduces the shipped phone boxes exactly', () => {
    expect(wordRowBox(PHONE_PORTRAIT)).toEqual(NAME_BOX);
    expect(wordRowBox(PHONE_LANDSCAPE)).toEqual(NAME_BOX_LANDSCAPE);
    expect(wordRowBox(PHONE_LANDSCAPE)).toEqual(WIDE_WORD_BOX);
  });

  it('gives every space 40-unit side margins and a band centred inside it', () => {
    for (const space of ALL_SPACES) {
      const box = wordRowBox(space);
      expect(box.left, space.id).toBe(40);
      expect(box.right, space.id).toBe(space.width - 40);
      const centreY = (box.top + box.bottom) / 2;
      expect(centreY, space.id).toBeGreaterThan(0);
      expect(centreY, space.id).toBeLessThan(space.height);
      expect(box.top, space.id).toBeLessThan(box.bottom);
    }
  });

  it('keeps the shipped vertical placement fractions in the tablet boxes', () => {
    // Portrait rows sit slightly below centre (470/860); landscape rows centred (215/430).
    expect((wordRowBox(TABLET_PORTRAIT).top + wordRowBox(TABLET_PORTRAIT).bottom) / 2).toBeCloseTo(
      (TABLET_PORTRAIT.height / 860) * 470,
      6,
    );
    expect(
      (wordRowBox(TABLET_LANDSCAPE).top + wordRowBox(TABLET_LANDSCAPE).bottom) / 2,
    ).toBeCloseTo(TABLET_LANDSCAPE.height / 2, 6);
  });
});

describe('name rows per space', () => {
  it('reaches the letter cap for short names on every tablet space', () => {
    for (const space of [TABLET_PORTRAIT, TABLET_LANDSCAPE, SLATE_PORTRAIT, SLATE_LANDSCAPE]) {
      expect(nameGlyphScale('ABCDE', space), space.id).toBe(1);
    }
  });

  it('grows a long name markedly on a portrait tablet space', () => {
    const phone = nameGlyphScale('ABCDEFG', PHONE_PORTRAIT);
    const tablet = nameGlyphScale('ABCDEFG', TABLET_PORTRAIT);
    expect(phone).toBeLessThan(0.4);
    expect(tablet).toBeGreaterThan(0.9);
    expect(tablet).toBeGreaterThan(phone * 2);
  });

  it('fills the landscape tablet row at full letter size for a long name', () => {
    expect(nameGlyphScale('ABCDEFG', TABLET_LANDSCAPE)).toBe(1);
    expect(nameGlyphScale('ABCDEFG', SLATE_LANDSCAPE)).toBe(1);
  });

  it('never draws a name larger than a single letter (the cap holds)', () => {
    for (const space of ALL_SPACES) {
      for (const name of ['JO', 'AVA', 'AIRA', 'ABCDEFG']) {
        expect(nameGlyphScale(name, space), `${space.id}/${name}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('leaves the portrait and landscape phone rows deep-equal to today', () => {
    for (const name of ['JO', 'AVA', 'ABCDEFG']) {
      expect(nameGlyphScale(name, 'portrait')).toBe(nameGlyphScale(name, PHONE_PORTRAIT));
      expect(nameGlyphScale(name, 'landscape')).toBe(nameGlyphScale(name, PHONE_LANDSCAPE));
      expect(buildNameLevel(name, 'portrait')).toEqual(buildNameLevel(name, PHONE_PORTRAIT));
      const wide = buildNameLevel(name, PHONE_LANDSCAPE);
      expect(wide).toEqual(buildNameLevel(name, 'landscape'));
      // The shipped landscape row still composes inside its authored box.
      const bounds = boundsOf(wide.strokes);
      expect(bounds.minX, name).toBeGreaterThanOrEqual(NAME_BOX_LANDSCAPE.left);
      expect(bounds.maxX, name).toBeLessThanOrEqual(NAME_BOX_LANDSCAPE.right);
      expect((bounds.minY + bounds.maxY) / 2, name).toBeCloseTo(
        (NAME_BOX_LANDSCAPE.top + NAME_BOX_LANDSCAPE.bottom) / 2,
        6,
      );
    }
  });

  it('composes the name inside the tablet row box, centred on the band', () => {
    for (const space of [TABLET_PORTRAIT, TABLET_LANDSCAPE, SLATE_PORTRAIT, SLATE_LANDSCAPE]) {
      const level = buildNameLevel('ABCDEFG', space);
      const box = wordRowBox(space);
      const bounds = boundsOf(level.strokes);
      expect(bounds.minX, space.id).toBeGreaterThanOrEqual(box.left);
      expect(bounds.maxX, space.id).toBeLessThanOrEqual(box.right);
      expect(bounds.minY, space.id).toBeGreaterThanOrEqual(0);
      expect(bounds.maxY, space.id).toBeLessThanOrEqual(space.height);
      expect((bounds.minY + bounds.maxY) / 2, space.id).toBeCloseTo((box.top + box.bottom) / 2, 6);
      expect(level.goal).toEqual(level.strokes[level.strokes.length - 1]?.at(-1));
    }
  });
});

describe('sequence bonus rows per space', () => {
  it('keeps portrait bonuses authored and returns null for non-bonuses', () => {
    for (const level of LETTER_BONUS_LEVELS) {
      expect(bonusRunLevel(level, 'portrait')).toBe(level);
      expect(bonusRunLevel(level, PHONE_PORTRAIT)).toBe(level);
    }
    const letter = LETTER_LEVELS[0] as (typeof LETTER_LEVELS)[number];
    expect(bonusRunLevel(letter, PHONE_PORTRAIT)).toBeNull();
    expect(bonusRunLevel(letter, TABLET_PORTRAIT)).toBeNull();
  });

  it('leaves the phone landscape rows deep-equal to today', () => {
    for (const level of LETTER_BONUS_LEVELS) {
      expect(bonusRunLevel(level, PHONE_LANDSCAPE)).toEqual(bonusRunLevel(level, 'landscape'));
      expect(bonusRunLevel(level, PHONE_PORTRAIT)).toEqual(bonusRunLevel(level, 'portrait'));
    }
  });

  it('draws the tablet rows inside the tablet box, wider than the portrait slots', () => {
    const span = (strokes: readonly (readonly { x: number; y: number }[])[]): number => {
      const bounds = boundsOf(strokes);
      return bounds.maxX - bounds.minX;
    };
    for (const space of [TABLET_PORTRAIT, TABLET_LANDSCAPE, SLATE_PORTRAIT, SLATE_LANDSCAPE]) {
      const box = wordRowBox(space);
      for (const level of LETTER_BONUS_LEVELS) {
        const row = bonusRunLevel(level, space);
        if (!row) {
          throw new Error(`missing ${space.id} row for ${level.id}`);
        }
        const bounds = boundsOf(row.strokes);
        expect(bounds.minX, `${space.id}/${level.id}`).toBeGreaterThanOrEqual(box.left);
        expect(bounds.maxX, `${space.id}/${level.id}`).toBeLessThanOrEqual(box.right);
        expect(bounds.minY, `${space.id}/${level.id}`).toBeGreaterThanOrEqual(0);
        expect(bounds.maxY, `${space.id}/${level.id}`).toBeLessThanOrEqual(space.height);
        expect(span(row.strokes), `${space.id}/${level.id}`).toBeGreaterThan(span(level.strokes));
        expect((bounds.minY + bounds.maxY) / 2, `${space.id}/${level.id}`).toBeCloseTo(
          (box.top + box.bottom) / 2,
          6,
        );
      }
    }
  });
});
