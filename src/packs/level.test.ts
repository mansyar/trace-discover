import { describe, expect, it } from 'vitest';

import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import { type LevelDef, levelToPath, validateLevel } from './level';

const VALID: LevelDef = {
  goal: { x: 370, y: 430 },
  goalArt: '/art/goal/test-1.webp',
  id: 'test-1',
  stroke: 'line',
  strokes: [
    [
      { x: 60, y: 430 },
      { x: 215, y: 430 },
      { x: 370, y: 430 },
    ],
  ],
};

describe('validateLevel', () => {
  it('accepts a well-formed level', () => {
    expect(validateLevel(VALID)).toEqual([]);
  });

  it('flags a missing id', () => {
    expect(validateLevel({ ...VALID, id: '' })).toContain('missing id');
  });

  it('flags a level without strokes', () => {
    expect(validateLevel({ ...VALID, strokes: [] })).toContain('needs at least one stroke');
  });

  it('flags a stroke with fewer than two control points', () => {
    expect(validateLevel({ ...VALID, strokes: [[{ x: 100, y: 100 }]] })).toContain(
      'stroke 0 needs at least 2 control points',
    );
  });

  it('flags duplicated consecutive control points per stroke', () => {
    const level: LevelDef = {
      ...VALID,
      strokes: [
        [
          { x: 60, y: 430 },
          { x: 215, y: 430 },
        ],
        [
          { x: 60, y: 430 },
          { x: 60, y: 430 },
          { x: 370, y: 430 },
        ],
      ],
    };
    expect(validateLevel(level)).toContain(
      'stroke 1 duplicate consecutive control point at index 1',
    );
  });

  it('flags non-finite coordinates per stroke', () => {
    const level: LevelDef = {
      ...VALID,
      strokes: [
        [
          { x: 60, y: 430 },
          { x: 370, y: 430 },
        ],
        [
          { x: Number.NaN, y: 430 },
          { x: 370, y: 430 },
        ],
      ],
    };
    expect(validateLevel(level)).toEqual(['stroke 1 non-finite control point at index 0']);
  });

  it('flags points outside the field margin per stroke', () => {
    const level: LevelDef = {
      ...VALID,
      strokes: [
        [
          { x: 5, y: 430 },
          { x: 370, y: 430 },
        ],
        [
          { x: 60, y: 430 },
          { x: FIELD_WIDTH + 10, y: FIELD_HEIGHT + 10 },
        ],
      ],
    };
    const problems = validateLevel(level);
    expect(problems).toContain('stroke 0 control point 0 outside field margin');
    expect(problems).toContain('stroke 1 control point 1 outside field margin');
  });

  it('flags a goal outside the field margin', () => {
    expect(validateLevel({ ...VALID, goal: { x: FIELD_WIDTH + 5, y: 430 } })).toContain(
      'goal outside field margin',
    );
  });

  it('flags a missing goal art path', () => {
    expect(validateLevel({ ...VALID, goalArt: '' })).toContain('missing goal art');
  });
});

describe('levelToPath', () => {
  it('smooths and resamples each stroke to constant spacing', () => {
    const paths = levelToPath(VALID);
    expect(paths).toHaveLength(1);
    const points = paths[0];
    if (!points) {
      throw new Error('missing path');
    }
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

  it('returns one path per stroke in order', () => {
    const level: LevelDef = {
      ...VALID,
      strokes: [
        [
          { x: 60, y: 300 },
          { x: 370, y: 300 },
        ],
        [
          { x: 370, y: 500 },
          { x: 60, y: 500 },
        ],
      ],
    };
    const paths = levelToPath(level);
    expect(paths).toHaveLength(2);
    const firstPath = paths[0];
    const secondPath = paths[1];
    if (!firstPath || !secondPath) {
      throw new Error('missing paths');
    }
    expect(firstPath[0]).toEqual({ x: 60, y: 300 });
    expect(firstPath[firstPath.length - 1]).toEqual({ x: 370, y: 300 });
    expect(secondPath[0]).toEqual({ x: 370, y: 500 });
    expect(secondPath[secondPath.length - 1]).toEqual({ x: 60, y: 500 });
  });
});
