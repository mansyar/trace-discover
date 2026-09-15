import { describe, expect, it } from 'vitest';

import { levelToPath, validateLevel } from './level';
import { NUMBERS_PACK, NUMERAL_LEVELS } from './numbers';
import { packLevelIds } from './pack';

const STROKE_COUNTS: Record<string, number> = {
  'num-0': 1,
  'num-1': 1,
  'num-2': 1,
  'num-3': 1,
  'num-4': 2,
  'num-5': 1,
  'num-6': 1,
  'num-7': 1,
  'num-8': 2,
  'num-9': 2,
};

function level(levelId: string) {
  const found = NUMERAL_LEVELS.find((entry) => entry.id === levelId);
  if (!found) {
    throw new Error(`Missing numeral level ${levelId}.`);
  }
  return found;
}

function strokeOf(levelId: string, index: number) {
  const stroke = level(levelId).strokes[index];
  if (!stroke) {
    throw new Error(`Missing stroke ${index} on ${levelId}.`);
  }
  const first = stroke[0];
  const last = stroke[stroke.length - 1];
  if (!first || !last) {
    throw new Error(`Stroke ${index} on ${levelId} is empty.`);
  }
  return { first, last, points: stroke };
}

describe('numeral levels', () => {
  it('defines all ten numerals in order with their goal art', () => {
    expect(NUMERAL_LEVELS.map((entry) => entry.id)).toEqual([
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
    for (const entry of NUMERAL_LEVELS) {
      expect(entry.theme).toBe('numbers');
      expect(entry.goalArt).toBe(`/art/goal/${entry.id}.png`);
    }
  });

  it('passes validation and authoring stroke counts for every numeral', () => {
    for (const entry of NUMERAL_LEVELS) {
      expect(validateLevel(entry)).toEqual([]);
      expect(entry.strokes).toHaveLength(STROKE_COUNTS[entry.id] ?? 0);
      const paths = levelToPath(entry);
      expect(paths).toHaveLength(entry.strokes.length);
      expect(paths[0]?.length).toBeGreaterThan(2);
    }
  });

  it('places every goal at the end of the final stroke', () => {
    for (const entry of NUMERAL_LEVELS) {
      const lastStroke = entry.strokes[entry.strokes.length - 1];
      const last = lastStroke?.[lastStroke.length - 1];
      expect(entry.goal).toEqual(last);
    }
  });

  it('draws 1 as a plain top-to-bottom vertical', () => {
    const { first, last, points } = strokeOf('num-1', 0);
    expect(first.y).toBeLessThan(300);
    expect(last.y).toBeGreaterThan(600);
    for (const point of points) {
      expect(Math.abs(point.x - first.x)).toBeLessThanOrEqual(1);
    }
  });

  it('starts 0 and 9 at the top of their loops', () => {
    for (const id of ['num-0', 'num-9']) {
      const { first, points } = strokeOf(id, 0);
      const minY = Math.min(...points.map((point) => point.y));
      expect(first.y).toBe(minY);
      expect(Math.abs(first.x - 215)).toBeLessThanOrEqual(10);
    }
  });

  it('draws 2 with a left-to-right base and 7 with a bar plus down-left diagonal', () => {
    const two = strokeOf('num-2', 0).points;
    const baseFrom = two[two.length - 2];
    const base = two[two.length - 1];
    expect(baseFrom && base && base.x > baseFrom.x).toBe(true);
    const seven = strokeOf('num-7', 0).points;
    expect(seven[0] && seven[1] && seven[0].x < seven[1].x).toBe(true);
    expect(seven[1] && seven[2] && seven[2].x < seven[1].x && seven[2].y > seven[1].y).toBe(true);
  });

  it('draws 4 with a vertical second stroke and 9 with a stem below its loop', () => {
    const stem = strokeOf('num-4', 1);
    expect(Math.abs(stem.first.x - stem.last.x)).toBeLessThanOrEqual(1);
    expect(stem.first.y).toBeLessThan(stem.last.y);
    const tail = strokeOf('num-9', 1);
    expect(Math.abs(tail.first.x - tail.last.x)).toBeLessThanOrEqual(1);
    expect(tail.first.y).toBeGreaterThan(300);
    expect(tail.last.y).toBeGreaterThan(600);
  });

  it('stacks 8 as an upper loop then a lower loop meeting at the waist', () => {
    const upper = strokeOf('num-8', 0).points;
    const lower = strokeOf('num-8', 1).points;
    const upperMax = Math.max(...upper.map((point) => point.y));
    const lowerMin = Math.min(...lower.map((point) => point.y));
    const lowerMax = Math.max(...lower.map((point) => point.y));
    expect(upperMax).toBeLessThan(lowerMax);
    expect(Math.abs(upperMax - lowerMin)).toBeLessThanOrEqual(2);
  });
});

describe('numbers pack', () => {
  it('packs the ten numerals with their badge', () => {
    expect(NUMBERS_PACK.id).toBe('numbers');
    expect(NUMBERS_PACK.badgeId).toBe('numbers-badge');
    expect(packLevelIds(NUMBERS_PACK)).toEqual(NUMERAL_LEVELS.map((entry) => entry.id));
  });
});
