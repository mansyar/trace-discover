import { describe, expect, it } from 'vitest';

import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import { DINO_LEVELS, DINO_THEME } from './dino';
import { type LevelDef, levelToPath, validateLevel } from './level';

const VALID: LevelDef = {
  controlPoints: [
    { x: 60, y: 430 },
    { x: 215, y: 430 },
    { x: 370, y: 430 },
  ],
  goal: { x: 370, y: 430 },
  goalArt: '/art/goal/test-1.png',
  id: 'test-1',
  stroke: 'line',
  theme: 'test',
};

describe('validateLevel', () => {
  it('accepts a well-formed level', () => {
    expect(validateLevel(VALID)).toEqual([]);
  });

  it('flags a missing id', () => {
    expect(validateLevel({ ...VALID, id: '' })).toContain('missing id');
  });

  it('flags fewer than two control points', () => {
    expect(validateLevel({ ...VALID, controlPoints: [{ x: 100, y: 100 }] })).toContain(
      'needs at least 2 control points',
    );
  });

  it('flags duplicated consecutive control points', () => {
    const level: LevelDef = {
      ...VALID,
      controlPoints: [
        { x: 60, y: 430 },
        { x: 60, y: 430 },
        { x: 370, y: 430 },
      ],
    };
    expect(validateLevel(level)).toContain('duplicate consecutive control point at index 1');
  });

  it('flags non-finite coordinates', () => {
    const level: LevelDef = {
      ...VALID,
      controlPoints: [
        { x: Number.NaN, y: 430 },
        { x: 370, y: 430 },
      ],
    };
    expect(validateLevel(level)).toContain('non-finite control point at index 0');
  });

  it('flags points outside the field margin', () => {
    const level: LevelDef = {
      ...VALID,
      controlPoints: [
        { x: 5, y: 430 },
        { x: FIELD_WIDTH + 10, y: FIELD_HEIGHT + 10 },
      ],
    };
    const problems = validateLevel(level);
    expect(problems).toContain('control point 0 outside field margin');
    expect(problems).toContain('control point 1 outside field margin');
  });

  it('flags a goal outside the field margin', () => {
    expect(validateLevel({ ...VALID, goal: { x: FIELD_WIDTH + 5, y: 430 } })).toContain(
      'goal outside field margin',
    );
  });
});

describe('levelToPath', () => {
  it('smooths and resamples control points to constant spacing', () => {
    const points = levelToPath(VALID);
    expect(points.length).toBeGreaterThan(2);
    const first = points[0];
    const last = points[points.length - 1];
    expect(first).toEqual({ x: 60, y: 430 });
    expect(last).toEqual({ x: 370, y: 430 });
    const intervals: number[] = [];
    for (let index = 1; index < points.length; index += 1) {
      const from = points[index - 1];
      const to = points[index];
      if (!from || !to) {
        throw new Error('missing point');
      }
      intervals.push(Math.hypot(to.x - from.x, to.y - from.y));
    }
    const firstInterval = intervals[0];
    if (firstInterval === undefined) {
      throw new Error('missing interval');
    }
    expect(firstInterval).toBeCloseTo(8, 0);
    for (const interval of intervals) {
      expect(interval).toBeCloseTo(firstInterval, 6);
    }
  });
});

describe('dino theme', () => {
  it('exposes theme identity', () => {
    expect(DINO_THEME.id).toBe('dino');
    expect(DINO_THEME.character).toBe('dino');
  });

  it('has at least two valid levels', () => {
    expect(DINO_LEVELS.length).toBeGreaterThanOrEqual(2);
    for (const level of DINO_LEVELS) {
      expect(validateLevel(level)).toEqual([]);
      expect(level.theme).toBe('dino');
    }
  });

  it('L1 is a straight left-to-right line', () => {
    const level = DINO_LEVELS[0];
    if (!level) {
      throw new Error('missing L1');
    }
    expect(level.stroke).toBe('line');
    const first = level.controlPoints[0];
    const last = level.controlPoints[level.controlPoints.length - 1];
    if (!first || !last) {
      throw new Error('missing endpoints');
    }
    expect(last.x).toBeGreaterThan(first.x + 200);
  });

  it('L2 is a left-to-right wave', () => {
    const level = DINO_LEVELS[1];
    if (!level) {
      throw new Error('missing L2');
    }
    expect(level.stroke).toBe('wave');
    let previous = Number.NEGATIVE_INFINITY;
    for (const point of level.controlPoints) {
      expect(point.x).toBeGreaterThan(previous);
      previous = point.x;
    }
    const ys = level.controlPoints.map((point) => point.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThanOrEqual(80);
  });
});
