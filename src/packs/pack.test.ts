import { describe, expect, it } from 'vitest';

import type { LevelDef } from './level';
import { createPackEntry } from './pack';

const LEVEL: LevelDef = {
  goal: { x: 370, y: 430 },
  goalArt: '/art/goal/a-1.webp',
  id: 'a-1',
  stroke: 'line',
  strokes: [
    [
      { x: 60, y: 430 },
      { x: 215, y: 430 },
      { x: 370, y: 430 },
    ],
  ],
};

describe('createPackEntry', () => {
  it('builds a pack without bonuses by default', () => {
    const pack = createPackEntry({
      badgeId: 'a-badge',
      id: 'a',
      levels: [LEVEL],
      menuFill: '#fff',
    });
    expect(pack.bonusUnlocks).toEqual([]);
    expect(pack.bonuses).toEqual([]);
    expect(pack.levels).toEqual([LEVEL]);
  });

  it('carries bonus circles and their unlock thresholds', () => {
    const bonus: LevelDef = { ...LEVEL, id: 'a-bonus', stroke: 'circle' };
    const pack = createPackEntry({
      badgeId: 'a-badge',
      bonusUnlocks: [4],
      bonuses: [bonus],
      id: 'a',
      levels: [LEVEL],
      menuFill: '#fff',
    });
    expect(pack.bonuses).toEqual([bonus]);
    expect(pack.bonusUnlocks).toEqual([4]);
  });

  it('rejects a pack without levels', () => {
    expect(() =>
      createPackEntry({ badgeId: 'a-badge', id: 'a', levels: [], menuFill: '#fff' }),
    ).toThrow('Pack a needs at least one level');
  });

  it('rejects mismatched bonus unlock thresholds', () => {
    const bonus: LevelDef = { ...LEVEL, id: 'a-bonus', stroke: 'circle' };
    expect(() =>
      createPackEntry({
        badgeId: 'a-badge',
        bonusUnlocks: [],
        bonuses: [bonus],
        id: 'a',
        levels: [LEVEL],
        menuFill: '#fff',
      }),
    ).toThrow('Pack a needs one unlock threshold per bonus');
  });
});
