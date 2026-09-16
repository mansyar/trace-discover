// Letters pack: twenty-six uppercase levels (abc-a ... abc-z) plus three
// sequence bonuses (ABC / MOM / ZOO) unlocking at 9/18/26 cleared. Phase 2
// authoring pins the school-style glyph geometry (see the track's content.md).
import { describe, expect, it } from 'vitest';
import { nearestOnPath } from '../engine/path';
import type { Point } from '../engine/types';
import { FIELD_WIDTH } from '../field';
import { LETTER_BONUS_LEVELS, LETTER_LEVELS, LETTERS_PACK, letterLevel } from './letters';
import type { LevelDef } from './level';
import { levelToPath, validateLevel } from './level';
import {
  bonusUnlocked,
  completedCount,
  firstUnlockedBonusId,
  isPackComplete,
  nextPackLevelId,
  type ProgressSave,
  shouldAwardPackBadge,
} from './progress';

const ALPHABET_IDS = 'abcdefghijklmnopqrstuvwxyz'.split('').map((letter) => `abc-${letter}`);

function saveWith(completedLevels: string[], badges: string[] = []): ProgressSave {
  return { badges, completedLevels };
}

function firstLetterIds(count: number): string[] {
  return LETTER_LEVELS.slice(0, count).map((level) => level.id);
}

function byId(id: string): LevelDef {
  const level = LETTER_LEVELS.find((candidate) => candidate.id === id);
  if (!level) {
    throw new Error(`missing level ${id}`);
  }
  return level;
}

/** The final control point of a level's last stroke (the trail's end). */
function lastPoint(level: LevelDef): Point {
  const stroke = level.strokes[level.strokes.length - 1];
  const point = stroke ? stroke[stroke.length - 1] : undefined;
  if (!point) {
    throw new Error(`missing final control point for ${level.id}`);
  }
  return point;
}

describe('letters pack', () => {
  it('lists the twenty-six uppercase letters in A-Z order', () => {
    expect(LETTER_LEVELS.map((level) => level.id)).toEqual(ALPHABET_IDS);
  });

  it('keeps every letter valid, on-content, and ending at its goal', () => {
    for (const level of [...LETTER_LEVELS, ...LETTER_BONUS_LEVELS]) {
      expect(validateLevel(level)).toEqual([]);
      expect(level.goalArt).toBe(`/art/goal/${level.id}.webp`);
      expect(level.goal).toEqual(lastPoint(level));
    }
  });

  it('keeps the locked school-style stroke counts', () => {
    expect(byId('abc-e').strokes).toHaveLength(4);
    expect(byId('abc-t').strokes).toHaveLength(2);
    expect(byId('abc-c').strokes).toHaveLength(1);
  });

  it('defines three multi-stroke sequence bonuses unlocking at 9/18/26', () => {
    expect(LETTER_BONUS_LEVELS.map((level) => level.id)).toEqual([
      'abc-bonus-1',
      'abc-bonus-2',
      'abc-bonus-3',
    ]);
    expect(LETTER_BONUS_LEVELS.every((level) => level.strokes.length >= 2)).toBe(true);
    expect(LETTERS_PACK.bonusUnlocks).toEqual([9, 18, 26]);
  });

  it('exposes the pack entry with its badge and fill', () => {
    expect(LETTERS_PACK.id).toBe('abc');
    expect(LETTERS_PACK.badgeId).toBe('abc-badge');
    expect(LETTERS_PACK.menuFill).toBe('#90be6d');
    expect(LETTERS_PACK.levels).toHaveLength(26);
    expect(LETTERS_PACK.bonuses).toHaveLength(3);
  });
});

describe('letters formation (content.md)', () => {
  const TOLERANCE = FIELD_WIDTH * 0.12; // session base tolerance: 12% of the field width
  const TOUCH = 10; // px — resampled gaps this small read as an intended junction
  const BOX = { bottom: 660, left: 130, right: 300, top: 280 };

  it('pins the content-doc stroke counts for every letter', () => {
    const counts: Readonly<Record<string, number>> = {
      a: 3,
      b: 3,
      c: 1,
      d: 2,
      e: 4,
      f: 3,
      g: 1,
      h: 3,
      i: 3,
      j: 2,
      k: 3,
      l: 2,
      m: 3,
      n: 3,
      o: 1,
      p: 2,
      q: 2,
      r: 3,
      s: 1,
      t: 2,
      u: 1,
      v: 1,
      w: 1,
      x: 2,
      y: 3,
      z: 1,
    };
    for (const [letter, count] of Object.entries(counts)) {
      expect(byId(`abc-${letter}`).strokes, `abc-${letter} strokes`).toHaveLength(count);
    }
  });

  it('keeps every glyph inside the standard letter box', () => {
    for (const level of LETTER_LEVELS) {
      for (const stroke of level.strokes) {
        for (const point of stroke) {
          expect(point.x, `${level.id} x`).toBeGreaterThanOrEqual(BOX.left);
          expect(point.x, `${level.id} x`).toBeLessThanOrEqual(BOX.right);
          expect(point.y, `${level.id} y`).toBeGreaterThanOrEqual(BOX.top);
          expect(point.y, `${level.id} y`).toBeLessThanOrEqual(BOX.bottom);
        }
      }
    }
  });

  it('keeps inter-stroke proximity clear of the tolerance band', () => {
    for (const level of LETTER_LEVELS) {
      const paths = levelToPath(level);
      for (let i = 0; i < paths.length; i += 1) {
        for (let j = i + 1; j < paths.length; j += 1) {
          const a = paths[i] ?? [];
          const b = paths[j] ?? [];
          let min = Number.POSITIVE_INFINITY;
          for (const point of a) {
            min = Math.min(min, nearestOnPath(b, point.x, point.y).distance);
          }
          for (const point of b) {
            min = Math.min(min, nearestOnPath(a, point.x, point.y).distance);
          }
          const okay = min <= TOUCH || min >= TOLERANCE;
          expect(okay, `${level.id} strokes ${i}/${j} closest approach ${min.toFixed(1)}px`).toBe(
            true,
          );
        }
      }
    }
  });

  it('follows the content-doc formation for the tricky letters', () => {
    const a = byId('abc-a');
    const a1 = a.strokes[0];
    const a2 = a.strokes[1];
    const a3 = a.strokes[2];
    expect(a1?.[0]).toEqual({ x: 215, y: 300 }); // apex first, then down-left
    expect((a1?.[1]?.x ?? 0) < (a1?.[0]?.x ?? 0)).toBe(true);
    expect((a2?.[1]?.x ?? 0) > (a2?.[0]?.x ?? 0)).toBe(true);
    expect(a3?.[0]?.y).toBe(a3?.[1]?.y); // crossbar level
    expect((a3?.[1]?.x ?? 0) > (a3?.[0]?.x ?? 0)).toBe(true);

    const e = byId('abc-e');
    const stem = e.strokes[0];
    expect(stem?.[0]?.y).toBe(300); // stem first, top to bottom
    expect((stem?.[1]?.y ?? 0) > 300).toBe(true);
    for (const bar of e.strokes.slice(1)) {
      expect(bar?.[0]?.y).toBe(bar?.[1]?.y);
      expect((bar?.[1]?.x ?? 0) > (bar?.[0]?.x ?? 0)).toBe(true);
    }

    const t = byId('abc-t');
    expect(t.strokes[0]?.[0]?.y).toBe(t.strokes[0]?.[1]?.y); // top bar first
    const tStem = t.strokes[1];
    expect(tStem?.[0]?.x).toBe(tStem?.[1]?.x);
    expect((tStem?.[1]?.y ?? 0) > (tStem?.[0]?.y ?? 0)).toBe(true);

    const q = byId('abc-q');
    expect(q.strokes[0]?.length).toBeGreaterThan(3); // loop first
    const tail = q.strokes[1];
    expect((tail?.[0]?.y ?? 0) > 450).toBe(true); // tail added low right

    // M and N are school-style multi-stroke: the centre must hang from the
    // top (M) and slant down to the right (N) — the device check found the
    // old single-stroke zigzags read upside down.
    const m = byId('abc-m');
    expect(m.strokes).toHaveLength(3);
    const mVee = m.strokes[1] ?? [];
    expect(mVee[0]).toEqual({ x: 150, y: 300 });
    expect((mVee[1]?.y ?? 0) > 300).toBe(true); // descends to the centre
    expect(mVee[2]?.y).toBe(300); // rises back to the top

    const n = byId('abc-n');
    expect(n.strokes).toHaveLength(3);
    const nSlant = n.strokes[1] ?? [];
    expect((nSlant[1]?.y ?? 0) > (nSlant[0]?.y ?? 0)).toBe(true);
    expect((nSlant[1]?.x ?? 0) > (nSlant[0]?.x ?? 0)).toBe(true); // top-left to bottom-right
  });
});

describe('letters bonus sequences (content.md)', () => {
  const SLOTS = [
    { max: 140, min: 50 },
    { max: 260, min: 170 },
    { max: 380, min: 290 },
  ];

  function bonusById(id: string): LevelDef {
    const level = LETTER_BONUS_LEVELS.find((candidate) => candidate.id === id);
    if (!level) {
      throw new Error(`missing bonus ${id}`);
    }
    return level;
  }

  it('pins the content-doc stroke counts for the words', () => {
    // ABC = A(3) + B(3) + C(1); MOM = M(3) + O(1) + M(3); ZOO = three single-stroke letters.
    expect(LETTER_BONUS_LEVELS.map((level) => level.strokes.length)).toEqual([7, 7, 3]);
  });

  it('lays each word out left to right in generous slots', () => {
    const lettersPerWord: readonly (readonly [number, number])[][] = [
      [
        [0, 2],
        [3, 5],
        [6, 6],
      ],
      [
        [0, 2],
        [3, 3],
        [4, 6],
      ],
      [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
    ];
    LETTER_BONUS_LEVELS.forEach((level, wordIndex) => {
      const wordLetters = lettersPerWord[wordIndex] ?? [];
      wordLetters.forEach(([from, to], letterIndex) => {
        const slot = SLOTS[letterIndex];
        if (!slot) {
          throw new Error('missing slot');
        }
        const points = level.strokes.slice(from, to + 1).flat();
        for (const point of points) {
          expect(point.x, `${level.id} letter ${letterIndex} x`).toBeGreaterThanOrEqual(slot.min);
          expect(point.x, `${level.id} letter ${letterIndex} x`).toBeLessThanOrEqual(slot.max);
        }
        const ys = points.map((point) => point.y);
        const height = Math.max(...ys) - Math.min(...ys);
        expect(height, `${level.id} letter ${letterIndex} height`).toBeGreaterThanOrEqual(300);
      });
    });
  });

  it('follows the content-doc formation for the words', () => {
    const abc = bonusById('abc-bonus-1');
    const a1 = abc.strokes[0];
    expect(a1?.[0]).toEqual({ x: 95, y: 300 }); // A apex first, then down-left
    expect((a1?.[1]?.x ?? 0) < 95).toBe(true);
    const aBar = abc.strokes[2];
    expect(aBar?.[0]?.y).toBe(aBar?.[1]?.y); // crossbar level
    const bStem = abc.strokes[3];
    expect(bStem?.[0]?.x).toBe(bStem?.[1]?.x); // B stem first, top to bottom
    expect((bStem?.[1]?.y ?? 0) > (bStem?.[0]?.y ?? 0)).toBe(true);
    const c = abc.strokes[6];
    expect((c?.[0]?.x ?? 0) > (c?.[1]?.x ?? 999)).toBe(true); // C starts top-right

    const mom = bonusById('abc-bonus-2');
    expect(mom.strokes.map((stroke) => stroke.length)).toEqual([2, 3, 2, 13, 2, 3, 2]);

    const zoo = bonusById('abc-bonus-3');
    const z = zoo.strokes[0];
    expect(z?.[0]).toEqual({ x: 55, y: 300 });
    expect(z?.[1]).toEqual({ x: 135, y: 300 }); // Z top bar left to right first
    const o2 = zoo.strokes[2] ?? [];
    expect(o2[0]).toEqual(o2[o2.length - 1]); // loop closes
  });
});

describe('letters progress', () => {
  it('completes at twenty-six cleared letters and awards the badge once', () => {
    expect(completedCount(saveWith(firstLetterIds(5)), LETTERS_PACK)).toBe(5);
    expect(isPackComplete(saveWith(firstLetterIds(25)), LETTERS_PACK)).toBe(false);
    expect(isPackComplete(saveWith(firstLetterIds(26)), LETTERS_PACK)).toBe(true);
    expect(shouldAwardPackBadge(saveWith(firstLetterIds(26)), LETTERS_PACK)).toBe(true);
    expect(shouldAwardPackBadge(saveWith(firstLetterIds(26), ['abc-badge']), LETTERS_PACK)).toBe(
      false,
    );
  });

  it('unlocks the sequence bonuses at 9 / 18 / 26 cleared', () => {
    const at = (count: number, index: number): boolean =>
      bonusUnlocked(saveWith(firstLetterIds(count)), LETTERS_PACK, index);
    expect([at(8, 0), at(9, 0), at(17, 1), at(18, 1), at(25, 2), at(26, 2)]).toEqual([
      false,
      true,
      false,
      true,
      false,
      true,
    ]);
  });

  it('wraps letter order and rolls into the unlocked bonuses', () => {
    expect(nextPackLevelId(saveWith([]), LETTERS_PACK, 'abc-a')).toBe('abc-b');
    expect(nextPackLevelId(saveWith([]), LETTERS_PACK, 'abc-z')).toBe('abc-a');
    const unlocked = saveWith(firstLetterIds(9));
    expect(nextPackLevelId(unlocked, LETTERS_PACK, 'abc-z')).toBe('abc-bonus-1');
    expect(nextPackLevelId(unlocked, LETTERS_PACK, 'abc-bonus-1')).toBe('abc-a');
    expect(firstUnlockedBonusId(saveWith(firstLetterIds(8)), LETTERS_PACK)).toBeNull();
    expect(firstUnlockedBonusId(saveWith(firstLetterIds(9)), LETTERS_PACK)).toBe('abc-bonus-1');
  });
});

describe('letterLevel guard', () => {
  it('rejects a glyph with no control points', () => {
    expect(() => letterLevel('abc-x', 'line', [])).toThrow('needs at least one control point');
  });
});
