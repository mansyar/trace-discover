import { describe, expect, it } from 'vitest';
import type { Point } from '../engine/types';
import type { LevelDef } from './level';
import { levelToPath, validateLevel } from './level';
import { PRE_BONUS_LEVELS, PRE_LEVELS, PRE_PACK } from './pre';

/** The single stroke of a one-stroke level (all pre-writing slots are). */
function strokeOf(level: LevelDef): readonly Point[] {
  const stroke = level.strokes[0];
  if (!stroke) {
    throw new Error(`missing stroke for ${level.id}`);
  }
  return stroke;
}

function spanX(level: LevelDef): number {
  const xs = strokeOf(level).map((p) => p.x);
  return Math.max(...xs) - Math.min(...xs);
}

function spanY(level: LevelDef): number {
  const ys = strokeOf(level).map((p) => p.y);
  return Math.max(...ys) - Math.min(...ys);
}

/** Zigzag downward points: larger y than both neighbours. */
function teeth(level: LevelDef): number {
  const stroke = strokeOf(level);
  let count = 0;
  for (let i = 1; i < stroke.length - 1; i += 1) {
    const prev = stroke[i - 1];
    const current = stroke[i];
    const next = stroke[i + 1];
    if (prev && current && next && current.y > prev.y && current.y > next.y) {
      count += 1;
    }
  }
  return count;
}

/** Polyline length of the resampled path (engine measurement). */
function pathLength(level: LevelDef): number {
  const points = levelToPath(level)[0];
  if (!points) {
    throw new Error(`missing path for ${level.id}`);
  }
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (a && b) {
      total += Math.hypot(b.x - a.x, b.y - a.y);
    }
  }
  return total;
}

function byId(levels: readonly LevelDef[], id: string): LevelDef {
  const level = levels.find((candidate) => candidate.id === id);
  if (!level) {
    throw new Error(`missing level ${id}`);
  }
  return level;
}

const PRE_1 = byId(PRE_LEVELS, 'pre-1');
const PRE_2 = byId(PRE_LEVELS, 'pre-2');
const PRE_3 = byId(PRE_LEVELS, 'pre-3');
const PRE_4 = byId(PRE_LEVELS, 'pre-4');
const PRE_5 = byId(PRE_LEVELS, 'pre-5');
const PRE_6 = byId(PRE_LEVELS, 'pre-6');
const PRE_7 = byId(PRE_LEVELS, 'pre-7');
const PRE_8 = byId(PRE_LEVELS, 'pre-8');
const PRE_9 = byId(PRE_LEVELS, 'pre-9');
const PRE_10 = byId(PRE_LEVELS, 'pre-10');
const PRE_11 = byId(PRE_LEVELS, 'pre-11');
const PRE_12 = byId(PRE_LEVELS, 'pre-12');

describe('pre-writing pack ramp', () => {
  it('keeps the twelve slots in play order with the pattern cycle', () => {
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
    const cycle = ['line', 'wave', 'arc', 'zigzag'];
    PRE_LEVELS.forEach((level, index) => {
      expect(level.stroke).toBe(cycle[index % 4]);
    });
  });

  it('keeps every level valid, on-content, and ending at its goal', () => {
    for (const level of [...PRE_LEVELS, ...PRE_BONUS_LEVELS]) {
      expect(validateLevel(level)).toEqual([]);
      expect(level.goalArt).toBe(`/art/goal/${level.id}.png`);
      const stroke = strokeOf(level);
      const last = stroke[stroke.length - 1];
      expect(level.goal).toEqual(last);
    }
  });

  it('ramps the straight line across the three blocks', () => {
    expect(spanX(PRE_1)).toBe(140);
    expect(spanX(PRE_5)).toBe(230);
    expect(spanX(PRE_9)).toBe(310);
    expect(pathLength(PRE_1)).toBeCloseTo(140, 0);
    expect(pathLength(PRE_5)).toBeCloseTo(230, 0);
    expect(pathLength(PRE_9)).toBeCloseTo(310, 0);
  });

  it('ramps the wave height across the three blocks', () => {
    expect(spanY(PRE_2)).toBe(25);
    expect(spanY(PRE_6)).toBe(55);
    expect(spanY(PRE_10)).toBe(85);
    expect(spanX(PRE_2)).toBe(140);
    expect(spanX(PRE_6)).toBe(230);
    expect(spanX(PRE_10)).toBe(310);
  });

  it('ramps the arc rise across the three blocks', () => {
    const rise = (level: LevelDef): number => {
      const start = strokeOf(level)[0];
      if (!start) {
        throw new Error('missing start');
      }
      return start.y - Math.min(...strokeOf(level).map((p) => p.y));
    };
    expect(rise(PRE_3)).toBe(70);
    expect(rise(PRE_7)).toBe(110);
    expect(rise(PRE_11)).toBe(160);
  });

  it('ramps zigzag teeth and depth across the three blocks', () => {
    expect(teeth(PRE_4)).toBe(2);
    expect(teeth(PRE_8)).toBe(3);
    expect(teeth(PRE_12)).toBe(4);
    expect(spanY(PRE_4)).toBe(45);
    expect(spanY(PRE_8)).toBe(50);
    expect(spanY(PRE_12)).toBe(55);
  });

  it('grows the bonus circles with the blocks', () => {
    const circles: Array<[LevelDef, number]> = [
      [byId(PRE_BONUS_LEVELS, 'pre-bonus-1'), 150],
      [byId(PRE_BONUS_LEVELS, 'pre-bonus-2'), 200],
      [byId(PRE_BONUS_LEVELS, 'pre-bonus-3'), 260],
    ];
    for (const [circle, diameter] of circles) {
      const stroke = strokeOf(circle);
      const first = stroke[0];
      if (!first) {
        throw new Error('missing circle start');
      }
      expect(first).toEqual(stroke[stroke.length - 1]);
      expect(first.y).toBe(Math.min(...stroke.map((p) => p.y)));
      expect(first.x).toBe(215);
      expect(spanX(circle)).toBe(diameter);
      expect(spanY(circle)).toBe(diameter);
    }
  });

  it('centers every stroke on the field axis', () => {
    for (const level of [...PRE_LEVELS, ...PRE_BONUS_LEVELS]) {
      const xs = strokeOf(level).map((p) => p.x);
      expect((Math.min(...xs) + Math.max(...xs)) / 2).toBe(215);
    }
  });

  it('defines three bonus circles unlocking at 4/8/12', () => {
    expect(PRE_BONUS_LEVELS.map((level) => level.id)).toEqual([
      'pre-bonus-1',
      'pre-bonus-2',
      'pre-bonus-3',
    ]);
    expect(PRE_BONUS_LEVELS.every((level) => level.stroke === 'circle')).toBe(true);
    expect(PRE_PACK.bonusUnlocks).toEqual([4, 8, 12]);
  });

  it('exposes the pack entry with its badge and fill', () => {
    expect(PRE_PACK.id).toBe('pre');
    expect(PRE_PACK.badgeId).toBe('pre-badge');
    expect(PRE_PACK.menuFill).toBe('#8ecae6');
    expect(PRE_PACK.levels).toHaveLength(12);
    expect(PRE_PACK.bonuses).toHaveLength(3);
  });
});
