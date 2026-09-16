// Letters pack: twenty-six uppercase levels (abc-a ... abc-z) plus three
// sequence bonuses (ABC / MOM / ZOO) unlocking at 9/18/26 cleared. Phase 1
// wires the pack on provisional skeleton geometry; Phase 2 authors the final
// school-style glyphs (see the track's content.md).
import { describe, expect, it } from 'vitest';
import type { Point } from '../engine/types';
import { LETTER_BONUS_LEVELS, LETTER_LEVELS, LETTERS_PACK } from './letters';
import type { LevelDef } from './level';
import { validateLevel } from './level';
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
      expect(level.goalArt).toBe(`/art/goal/${level.id}.png`);
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
