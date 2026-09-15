import { describe, expect, it } from 'vitest';

import { awardPackBadge, completeLevel, completeNumeral, createDefaultSave } from '../save/store';
import type { LevelDef } from './level';
import {
  createPackEntry,
  isPackComplete,
  nextPackLevelId,
  packCompletedCount,
  packLevelIds,
  shouldAwardPackBadge,
} from './pack';

function numeral(levelId: string): LevelDef {
  return {
    goal: { x: 300, y: 430 },
    goalArt: `/art/goal/${levelId}.png`,
    id: levelId,
    stroke: 'line',
    strokes: [
      [
        { x: 60, y: 430 },
        { x: 370, y: 430 },
      ],
    ],
    theme: 'numbers',
  };
}

const NUMERALS = Array.from({ length: 10 }, (_, digit) => numeral(`num-${digit}`));
const PACK = createPackEntry('numbers', 'numbers-badge', '#f3c969', NUMERALS);

function completeAllNumerals(): ReturnType<typeof createDefaultSave> {
  return NUMERALS.reduce((save, level) => completeNumeral(save, level.id), createDefaultSave());
}

describe('createPackEntry', () => {
  it('builds a pack from its ordered levels', () => {
    expect(PACK.id).toBe('numbers');
    expect(PACK.badgeId).toBe('numbers-badge');
    expect(PACK.levels).toHaveLength(10);
    expect(PACK.levels[0]?.id).toBe('num-0');
    expect(PACK.levels[9]?.id).toBe('num-9');
  });

  it('rejects an empty pack', () => {
    expect(() => createPackEntry('numbers', 'numbers-badge', '#f3c969', [])).toThrow(
      /needs at least one level/,
    );
  });
});

describe('packLevelIds', () => {
  it('lists the ten numerals in order', () => {
    expect(packLevelIds(PACK)).toEqual([
      'num-0',
      'num-1',
      'num-2',
      'num-3',
      'num-4',
      'num-5',
      'num-6',
      'num-7',
      'num-8',
      'num-9',
    ]);
  });
});

describe('nextPackLevelId', () => {
  it('advances and wraps around the numerals', () => {
    expect(nextPackLevelId(PACK, 'num-0')).toBe('num-1');
    expect(nextPackLevelId(PACK, 'num-4')).toBe('num-5');
    expect(nextPackLevelId(PACK, 'num-9')).toBe('num-0');
    expect(nextPackLevelId(PACK, 'nope')).toBe('num-0');
  });
});

describe('packCompletedCount', () => {
  it('counts cleared numerals from the save and ignores world levels', () => {
    const save = completeLevel(
      completeNumeral(completeNumeral(createDefaultSave(), 'num-3'), 'num-7'),
      'dino-1',
    );
    expect(packCompletedCount(save, PACK)).toBe(2);
  });
});

describe('isPackComplete', () => {
  it('is true only once all ten numerals are cleared', () => {
    const nine = NUMERALS.slice(0, 9).reduce(
      (save, level) => completeNumeral(save, level.id),
      createDefaultSave(),
    );
    expect(isPackComplete(nine, PACK)).toBe(false);
    expect(isPackComplete(completeAllNumerals(), PACK)).toBe(true);
  });
});

describe('shouldAwardPackBadge', () => {
  it('is true only for a fresh badge on a complete pack', () => {
    expect(shouldAwardPackBadge(createDefaultSave(), PACK)).toBe(false);
    const complete = completeAllNumerals();
    expect(shouldAwardPackBadge(complete, PACK)).toBe(true);
    expect(shouldAwardPackBadge(awardPackBadge(complete), PACK)).toBe(false);
  });
});
