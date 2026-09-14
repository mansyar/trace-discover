import { describe, expect, it } from 'vitest';

import { ANIMAL_LEVELS, ANIMALS_THEME } from './animals';
import { CONSTRUCTION_LEVELS, CONSTRUCTION_THEME } from './construction';
import { DINO_LEVELS } from './dino';
import type { LevelDef } from './level';
import { validateLevel } from './level';

function expectStrictlyIncreasingX(level: LevelDef): void {
  let previous = Number.NEGATIVE_INFINITY;
  for (const point of level.controlPoints) {
    expect(point.x).toBeGreaterThan(previous);
    previous = point.x;
  }
}

function countFlips(values: readonly number[]): number {
  let flips = 0;
  let previousSign = 0;
  for (let index = 1; index < values.length; index += 1) {
    const current = values[index];
    const before = values[index - 1];
    if (current === undefined || before === undefined) {
      throw new Error('missing value');
    }
    const sign = Math.sign(current - before);
    if (sign !== 0 && previousSign !== 0 && sign !== previousSign) {
      flips += 1;
    }
    if (sign !== 0) {
      previousSign = sign;
    }
  }
  return flips;
}

function expectFullRamp(levels: readonly LevelDef[], theme: string): void {
  expect(levels).toHaveLength(5);
  expect(levels.map((level) => level.stroke)).toEqual(['line', 'wave', 'arc', 'zigzag', 'circle']);
  for (const level of levels) {
    expect(validateLevel(level)).toEqual([]);
    expect(level.theme).toBe(theme);
  }
}

function expectCircleBonus(level: LevelDef, id: string): void {
  expect(level.id).toBe(id);
  expect(level.stroke).toBe('circle');
  expect(level.controlPoints.length).toBeGreaterThanOrEqual(5);
  const first = level.controlPoints[0];
  const last = level.controlPoints[level.controlPoints.length - 1];
  if (!first || !last) {
    throw new Error('missing endpoints');
  }
  // Starts at the top and closes the loop.
  for (const point of level.controlPoints) {
    expect(point.y).toBeGreaterThanOrEqual(first.y);
  }
  expect(last).toEqual(first);
  expect(level.goal).toEqual(first);
}

describe('construction theme', () => {
  it('exposes theme identity', () => {
    expect(CONSTRUCTION_THEME.id).toBe('construction');
    expect(CONSTRUCTION_THEME.character).toBe('excavator');
  });

  it('has the full five-level ramp, all valid', () => {
    expectFullRamp(CONSTRUCTION_LEVELS, 'construction');
  });

  it('L3 is a bottom-left arc sweeping up and over', () => {
    const level = CONSTRUCTION_LEVELS[2];
    if (!level) {
      throw new Error('missing L3');
    }
    expectStrictlyIncreasingX(level);
    const [start, ...rest] = level.controlPoints;
    const end = rest[rest.length - 1];
    if (!start || !end) {
      throw new Error('missing endpoints');
    }
    expect(start.y).toBeGreaterThanOrEqual(end.y);
    const midYs = rest.slice(0, -1).map((point) => point.y);
    expect(Math.min(...midYs)).toBeLessThan(Math.min(start.y, end.y));
  });

  it('L4 is a left-to-right zigzag', () => {
    const level = CONSTRUCTION_LEVELS[3];
    if (!level) {
      throw new Error('missing L4');
    }
    expectStrictlyIncreasingX(level);
    expect(countFlips(level.controlPoints.map((point) => point.y))).toBeGreaterThanOrEqual(3);
  });

  it('bonus is a closed top-start circle', () => {
    const level = CONSTRUCTION_LEVELS[4];
    if (!level) {
      throw new Error('missing bonus');
    }
    expectCircleBonus(level, 'construction-bonus');
  });
});

describe('animals theme', () => {
  it('exposes theme identity', () => {
    expect(ANIMALS_THEME.id).toBe('animals');
    expect(ANIMALS_THEME.character).toBe('lion');
  });

  it('has the full five-level ramp, all valid', () => {
    expectFullRamp(ANIMAL_LEVELS, 'animals');
  });

  it('L3 is a bottom-left arc sweeping up and over', () => {
    const level = ANIMAL_LEVELS[2];
    if (!level) {
      throw new Error('missing L3');
    }
    expectStrictlyIncreasingX(level);
    const [start, ...rest] = level.controlPoints;
    const end = rest[rest.length - 1];
    if (!start || !end) {
      throw new Error('missing endpoints');
    }
    expect(start.y).toBeGreaterThanOrEqual(end.y);
    const midYs = rest.slice(0, -1).map((point) => point.y);
    expect(Math.min(...midYs)).toBeLessThan(Math.min(start.y, end.y));
  });

  it('L4 is a left-to-right zigzag', () => {
    const level = ANIMAL_LEVELS[3];
    if (!level) {
      throw new Error('missing L4');
    }
    expectStrictlyIncreasingX(level);
    expect(countFlips(level.controlPoints.map((point) => point.y))).toBeGreaterThanOrEqual(3);
  });

  it('bonus is a closed top-start circle', () => {
    const level = ANIMAL_LEVELS[4];
    if (!level) {
      throw new Error('missing bonus');
    }
    expectCircleBonus(level, 'animals-bonus');
  });
});

describe('dino theme full ramp', () => {
  it('has all five levels including the bonus', () => {
    expectFullRamp(DINO_LEVELS, 'dino');
  });

  it('bonus is a closed top-start circle', () => {
    const level = DINO_LEVELS[4];
    if (!level) {
      throw new Error('missing bonus');
    }
    expectCircleBonus(level, 'dino-bonus');
  });
});
