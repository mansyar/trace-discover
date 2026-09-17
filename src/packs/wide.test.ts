import { describe, expect, it } from 'vitest';
import { LANDSCAPE_FIELD_HEIGHT, LANDSCAPE_FIELD_WIDTH } from '../field';
import { LETTER_LEVELS } from './letters';
import type { LevelDef } from './level';
import { PRE_LEVELS } from './pre';
import { levelForOrientation } from './wide';

const MARGIN = 24;

function bbox(level: LevelDef): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const stroke of level.strokes) {
    for (const point of stroke) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
  }
  return { maxX, maxY, minX, minY };
}

describe('levelForOrientation', () => {
  it('returns the authored level itself for portrait', () => {
    const level = PRE_LEVELS[0];
    expect(level).toBeDefined();
    if (!level) {
      return;
    }
    const portrait = levelForOrientation(level, 'portrait');
    expect(portrait).toBe(level);
    expect(portrait).toEqual(level);
  });

  it('fits and centres a single letter in the wide field without magnifying it', () => {
    const level = LETTER_LEVELS[0];
    expect(level).toBeDefined();
    if (!level) {
      return;
    }
    const wide = levelForOrientation(level, 'landscape');
    expect(wide.id).toBe(level.id);
    expect(wide.goalArt).toBe(level.goalArt);
    expect(wide.strokes).toHaveLength(level.strokes.length);

    const authored = bbox(level);
    const box = bbox(wide);
    expect(box.maxX - box.minX).toBeLessThanOrEqual(authored.maxX - authored.minX + 1e-9);
    expect(box.maxY - box.minY).toBeLessThanOrEqual(authored.maxY - authored.minY + 1e-9);
    expect(box.minX).toBeGreaterThanOrEqual(MARGIN - 1e-9);
    expect(box.maxX).toBeLessThanOrEqual(LANDSCAPE_FIELD_WIDTH - MARGIN + 1e-9);
    expect(box.minY).toBeGreaterThanOrEqual(MARGIN - 1e-9);
    expect(box.maxY).toBeLessThanOrEqual(LANDSCAPE_FIELD_HEIGHT - MARGIN + 1e-9);
    expect((box.minX + box.maxX) / 2).toBeCloseTo(LANDSCAPE_FIELD_WIDTH / 2, 6);
    expect((box.minY + box.maxY) / 2).toBeCloseTo(LANDSCAPE_FIELD_HEIGHT / 2, 6);
  });

  it('keeps the largest pre-writing strokes inside the wide margins', () => {
    const level = PRE_LEVELS[PRE_LEVELS.length - 1];
    expect(level).toBeDefined();
    if (!level) {
      return;
    }
    const box = bbox(levelForOrientation(level, 'landscape'));
    expect(box.minX).toBeGreaterThanOrEqual(MARGIN - 1e-9);
    expect(box.maxX).toBeLessThanOrEqual(LANDSCAPE_FIELD_WIDTH - MARGIN + 1e-9);
    expect(box.minY).toBeGreaterThanOrEqual(MARGIN - 1e-9);
    expect(box.maxY).toBeLessThanOrEqual(LANDSCAPE_FIELD_HEIGHT - MARGIN + 1e-9);
  });

  it('shrinks oversize geometry uniformly to fit the wide box', () => {
    const level: LevelDef = {
      goal: { x: 1900, y: 950 },
      goalArt: '/art/goal/test.webp',
      id: 'wide-test',
      stroke: 'line',
      strokes: [
        [
          { x: 100, y: 100 },
          { x: 1000, y: 500 },
          { x: 1900, y: 100 },
        ],
      ],
    };
    const wide = levelForOrientation(level, 'landscape');
    const box = bbox(wide);
    expect(box.maxX - box.minX).toBeLessThanOrEqual(LANDSCAPE_FIELD_WIDTH - 2 * MARGIN + 1e-9);
    expect(box.maxY - box.minY).toBeLessThanOrEqual(LANDSCAPE_FIELD_HEIGHT - 2 * MARGIN + 1e-9);
    expect((box.maxX - box.minX) / 1800).toBeCloseTo((box.maxY - box.minY) / 400, 9);
    expect((box.minX + box.maxX) / 2).toBeCloseTo(LANDSCAPE_FIELD_WIDTH / 2, 6);
    expect((box.minY + box.maxY) / 2).toBeCloseTo(LANDSCAPE_FIELD_HEIGHT / 2, 6);
  });

  it('maps the goal with the same transform as the strokes', () => {
    const level = LETTER_LEVELS[5];
    expect(level).toBeDefined();
    if (!level) {
      return;
    }
    const wide = levelForOrientation(level, 'landscape');
    const lastStroke = wide.strokes.at(-1);
    const lastPoint = lastStroke?.at(-1);
    expect(lastPoint).toBeDefined();
    if (!lastPoint) {
      return;
    }
    expect(wide.goal.x).toBeCloseTo(lastPoint.x, 9);
    expect(wide.goal.y).toBeCloseTo(lastPoint.y, 9);
  });

  it('returns an untouched copy for a level without strokes', () => {
    const level: LevelDef = {
      goal: { x: 215, y: 470 },
      goalArt: '/art/goal/empty.webp',
      id: 'empty',
      stroke: 'line',
      strokes: [],
    };
    const wide = levelForOrientation(level, 'landscape');
    expect(wide).not.toBe(level);
    expect(wide.goal).toEqual(level.goal);
    expect(wide.strokes).toEqual([]);
  });

  it('does not mutate the authored level', () => {
    const level = LETTER_LEVELS[0];
    expect(level).toBeDefined();
    if (!level) {
      return;
    }
    const snapshot = JSON.parse(JSON.stringify(level)) as LevelDef;
    levelForOrientation(level, 'landscape');
    expect(level).toEqual(snapshot);
  });
});
