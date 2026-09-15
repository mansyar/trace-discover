// Unified pack progress: one model for every pack — pre-writing and numbers —
// replacing the split theme-progress / pack-progress modules. Reads straight
// from the save's `completedLevels` + `badges` (save v3).
import { describe, expect, it } from 'vitest';
import { NUMBERS_PACK } from './numbers';
import { PRE_LEVELS, PRE_PACK } from './pre';
import {
  bonusUnlocked,
  completedCount,
  isPackComplete,
  nextPackLevelId,
  type ProgressSave,
  shouldAwardPackBadge,
} from './progress';

function saveWith(completedLevels: string[], badges: string[] = []): ProgressSave {
  return { badges, completedLevels };
}

function firstPreIds(count: number): string[] {
  return PRE_LEVELS.slice(0, count).map((level) => level.id);
}

function allNumbersIds(): string[] {
  return NUMBERS_PACK.levels.map((level) => level.id);
}

describe('completedCount', () => {
  it('counts only the pack-level ids present in the save', () => {
    const save = saveWith(['pre-1', 'pre-2', 'num-0', 'pre-bonus-1']);
    expect(completedCount(save, PRE_PACK)).toBe(2);
    expect(completedCount(save, NUMBERS_PACK)).toBe(1);
  });

  it('is zero for a fresh save', () => {
    expect(completedCount(saveWith([]), PRE_PACK)).toBe(0);
  });
});

describe('isPackComplete', () => {
  it('is true only when every main level is complete', () => {
    expect(isPackComplete(saveWith(firstPreIds(12)), PRE_PACK)).toBe(true);
    expect(isPackComplete(saveWith(firstPreIds(11)), PRE_PACK)).toBe(false);
  });

  it('ignores bonuses and other packs', () => {
    const save = saveWith([...firstPreIds(11), 'pre-bonus-1', 'num-0']);
    expect(isPackComplete(save, PRE_PACK)).toBe(false);
  });

  it('works for the numbers pack', () => {
    expect(isPackComplete(saveWith(allNumbersIds()), NUMBERS_PACK)).toBe(true);
  });
});

describe('shouldAwardPackBadge', () => {
  it('awards once when the pack is complete and unbadged', () => {
    expect(shouldAwardPackBadge(saveWith(firstPreIds(12)), PRE_PACK)).toBe(true);
  });

  it('does not re-award when the badge exists', () => {
    expect(shouldAwardPackBadge(saveWith(firstPreIds(12), ['pre-badge']), PRE_PACK)).toBe(false);
  });

  it('does not award while incomplete', () => {
    expect(shouldAwardPackBadge(saveWith(firstPreIds(11)), PRE_PACK)).toBe(false);
  });
});

describe('bonusUnlocked', () => {
  it('unlocks circles at 4 / 8 / 12 completed levels', () => {
    const at = (count: number, index: number): boolean =>
      bonusUnlocked(saveWith(firstPreIds(count)), PRE_PACK, index);
    expect([at(3, 0), at(3, 1), at(3, 2)]).toEqual([false, false, false]);
    expect([at(4, 0), at(4, 1), at(4, 2)]).toEqual([true, false, false]);
    expect([at(7, 0), at(7, 1), at(7, 2)]).toEqual([true, false, false]);
    expect([at(8, 0), at(8, 1), at(8, 2)]).toEqual([true, true, false]);
    expect([at(12, 0), at(12, 1), at(12, 2)]).toEqual([true, true, true]);
  });

  it('is false for out-of-range indexes', () => {
    const save = saveWith(firstPreIds(12));
    expect(bonusUnlocked(save, PRE_PACK, -1)).toBe(false);
    expect(bonusUnlocked(save, PRE_PACK, 3)).toBe(false);
  });

  it('is always false for a pack without circles', () => {
    const save = saveWith(allNumbersIds());
    expect(bonusUnlocked(save, NUMBERS_PACK, 0)).toBe(false);
    expect(bonusUnlocked(save, NUMBERS_PACK, 1)).toBe(false);
  });
});

describe('nextPackLevelId', () => {
  it('advances through the main levels and wraps', () => {
    const save = saveWith([]);
    expect(nextPackLevelId(save, PRE_PACK, 'pre-1')).toBe('pre-2');
    expect(nextPackLevelId(save, PRE_PACK, 'pre-12')).toBe('pre-1');
    expect(nextPackLevelId(save, PRE_PACK, 'unknown')).toBe('pre-1');
  });

  it('includes unlocked circles at the end of the sequence', () => {
    const save = saveWith(firstPreIds(4));
    expect(nextPackLevelId(save, PRE_PACK, 'pre-12')).toBe('pre-bonus-1');
    expect(nextPackLevelId(save, PRE_PACK, 'pre-bonus-1')).toBe('pre-1');
  });

  it('rolls through all circles once the pack is complete', () => {
    const save = saveWith(firstPreIds(12));
    expect(nextPackLevelId(save, PRE_PACK, 'pre-12')).toBe('pre-bonus-1');
    expect(nextPackLevelId(save, PRE_PACK, 'pre-bonus-2')).toBe('pre-bonus-3');
    expect(nextPackLevelId(save, PRE_PACK, 'pre-bonus-3')).toBe('pre-1');
  });

  it('wraps within a pack without circles', () => {
    const save = saveWith([]);
    expect(nextPackLevelId(save, NUMBERS_PACK, 'num-0')).toBe('num-1');
    expect(nextPackLevelId(save, NUMBERS_PACK, 'num-9')).toBe('num-0');
  });
});
