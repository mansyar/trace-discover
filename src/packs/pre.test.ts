import { describe, expect, it } from 'vitest';

import { levelToPath, validateLevel } from './level';
import { PRE_BONUS_LEVELS, PRE_LEVELS, PRE_PACK } from './pre';

const PATTERNS = ['line', 'wave', 'arc', 'zigzag'] as const;

function requireLevel(levelId: string) {
  const found = PRE_LEVELS.find((level) => level.id === levelId);
  if (!found) {
    throw new Error(`Missing level ${levelId}`);
  }
  return found;
}

describe('pre-writing levels', () => {
  it('holds twelve slots in order, cycling line/wave/arc/zigzag', () => {
    expect(PRE_LEVELS.map((level) => level.id)).toEqual([
      'pre-1',
      'pre-2',
      'pre-3',
      'pre-4',
      'pre-5',
      'pre-6',
      'pre-7',
      'pre-8',
      'pre-9',
      'pre-10',
      'pre-11',
      'pre-12',
    ]);
    PRE_LEVELS.forEach((level, index) => {
      expect(level.stroke).toBe(PATTERNS[index % 4]);
      expect(level.goalArt).toBe(`/art/goal/${level.id}.png`);
    });
  });

  it('holds three bonus circles unlocking at 4/8/12', () => {
    expect(PRE_BONUS_LEVELS.map((level) => level.id)).toEqual([
      'pre-bonus-1',
      'pre-bonus-2',
      'pre-bonus-3',
    ]);
    for (const bonus of PRE_BONUS_LEVELS) {
      expect(bonus.stroke).toBe('circle');
      expect(bonus.goalArt).toBe(`/art/goal/${bonus.id}.png`);
    }
    expect(PRE_PACK.bonusUnlocks).toEqual([4, 8, 12]);
  });

  it('passes validation and builds a path for every level', () => {
    for (const level of [...PRE_LEVELS, ...PRE_BONUS_LEVELS]) {
      expect(validateLevel(level)).toEqual([]);
      const paths = levelToPath(level);
      expect(paths).toHaveLength(level.strokes.length);
      expect(paths[0]?.length).toBeGreaterThan(2);
    }
  });

  it('keeps the current slot geometry (relabeled 1:1 for migration)', () => {
    // Slot order: dino (1-4), construction (5-8), animals (9-12).
    expect(requireLevel('pre-1').strokes[0]?.[0]).toEqual({ x: 60, y: 430 });
    expect(requireLevel('pre-5').strokes[0]?.[0]).toEqual({ x: 60, y: 400 });
    expect(requireLevel('pre-9').strokes[0]?.[0]).toEqual({ x: 60, y: 460 });
    expect(PRE_BONUS_LEVELS[0]?.strokes[0]?.[0]).toEqual({ x: 215, y: 280 });
    expect(PRE_BONUS_LEVELS[2]?.strokes[0]?.[0]).toEqual({ x: 215, y: 320 });
  });

  it('starts every main slot on the left and ends at its goal', () => {
    for (const level of [...PRE_LEVELS, ...PRE_BONUS_LEVELS]) {
      const lastStroke = level.strokes[level.strokes.length - 1];
      const last = lastStroke?.[lastStroke.length - 1];
      expect(level.goal).toEqual(last);
      if (level.stroke !== 'circle') {
        expect(level.strokes[0]?.[0]?.x).toBe(60);
      }
    }
  });
});
