// Shapes pack: eight shape levels (shape-1 ... shape-8) — circle, square,
// triangle, oval, diamond, heart, star, plus — authored as validated JSON
// (data/shapes.json). Star and plus are multi-stroke per the locked spec; the
// six closed shapes are single closed loops. Round shapes classify as
// 'circle', the straight-edged rest as 'line'.
import { describe, expect, it } from 'vitest';
import { nearestOnPath } from '../engine/path';
import type { Point } from '../engine/types';
import { FIELD_HEIGHT, FIELD_WIDTH, LANDSCAPE_FIELD_HEIGHT, LANDSCAPE_FIELD_WIDTH } from '../field';
import { awardBadge, completeLevel, createDefaultSave } from '../save/store';
import { packLayout, packStickers } from '../ui/pack';
import { stickerBoardLayout } from '../ui/stickerBoard';
import { collectPackProblems, parsePackJson } from './json';
import type { LevelDef } from './level';
import { levelToPath, validateLevel } from './level';
import {
  bonusUnlocked,
  completedCount,
  firstUnlockedBonusId,
  isPackComplete,
  nextPackLevelId,
  shouldAwardPackBadge,
} from './progress';
import { SHAPE_LEVELS, SHAPES_PACK } from './shapes';

const ORDERED_IDS = [
  'shape-1',
  'shape-2',
  'shape-3',
  'shape-4',
  'shape-5',
  'shape-6',
  'shape-7',
  'shape-8',
];

function byId(id: string): LevelDef {
  const level = SHAPE_LEVELS.find((candidate) => candidate.id === id);
  if (!level) {
    throw new Error(`missing level ${id}`);
  }
  return level;
}

/** The final control point of a level's last stroke (the trail's end). */
function lastPoint(level: LevelDef): Point {
  const stroke = level.strokes[level.strokes.length - 1];
  const point = stroke ? stroke[stroke.length - 1] : undefined;
  if (!point) {
    throw new Error(`missing final control point for ${level.id}`);
  }
  return point;
}

/** Landscape pack-grid options main.ts configures for shapes (mirrors numbers). */
const SHAPES_LANDSCAPE = { cardSize: 90, columns: 5, slotsPerRow: 10 };

describe('shapes pack', () => {
  it('lists the eight shapes in the locked order', () => {
    expect(SHAPE_LEVELS.map((level) => level.id)).toEqual(ORDERED_IDS);
  });

  it('keeps every level valid, on-convention, and ending at its goal', () => {
    for (const level of SHAPE_LEVELS) {
      expect(validateLevel(level), `${level.id} geometry`).toEqual([]);
      expect(level.goalArt, `${level.id} art`).toBe(`/art/goal/${level.id}.webp`);
      expect(level.goal, `${level.id} goal`).toEqual(lastPoint(level));
    }
  });

  it('pins the locked stroke counts (star 2, plus 2, closed shapes 1)', () => {
    for (const level of SHAPE_LEVELS.slice(0, 6)) {
      expect(level.strokes, `${level.id} strokes`).toHaveLength(1);
    }
    expect(byId('shape-7').strokes, 'star strokes').toHaveLength(2);
    expect(byId('shape-8').strokes, 'plus strokes').toHaveLength(2);
  });

  it('closes every single-stroke shape back to its start point', () => {
    for (const level of SHAPE_LEVELS.slice(0, 6)) {
      const stroke = level.strokes[0];
      expect(stroke?.[0], `${level.id} closes`).toEqual(stroke?.at(-1));
    }
  });

  it('classifies round shapes as circles and straight-edged shapes as lines', () => {
    expect(byId('shape-1').stroke).toBe('circle');
    expect(byId('shape-4').stroke).toBe('circle');
    for (const level of [
      byId('shape-2'),
      byId('shape-3'),
      byId('shape-5'),
      byId('shape-6'),
      byId('shape-7'),
      byId('shape-8'),
    ]) {
      expect(level.stroke, `${level.id} stroke`).toBe('line');
    }
  });

  it('exposes the pack entry with its badge, fill, and no bonuses', () => {
    expect(SHAPES_PACK.id).toBe('shapes');
    expect(SHAPES_PACK.badgeId).toBe('shapes-badge');
    expect(SHAPES_PACK.menuFill).toBe('#b8a9e8');
    expect(SHAPES_PACK.levels).toHaveLength(8);
    expect(SHAPES_PACK.bonuses).toEqual([]);
    expect(SHAPES_PACK.bonusUnlocks).toEqual([]);
  });
});

describe('shapes formation', () => {
  const TOLERANCE = FIELD_WIDTH * 0.12; // session base tolerance: 12% of the field width
  const TOUCH = 10; // px — resampled gaps this small read as an intended junction
  const BOX = { bottom: 700, left: 60, right: 370, top: 240 };

  it('keeps every shape generously inside the center box', () => {
    for (const level of SHAPE_LEVELS) {
      for (const stroke of level.strokes) {
        for (const point of stroke) {
          expect(point.x, `${level.id} x`).toBeGreaterThanOrEqual(BOX.left);
          expect(point.x, `${level.id} x`).toBeLessThanOrEqual(BOX.right);
          expect(point.y, `${level.id} y`).toBeGreaterThanOrEqual(BOX.top);
          expect(point.y, `${level.id} y`).toBeLessThanOrEqual(BOX.bottom);
        }
      }
    }
  });

  it('keeps multi-stroke shapes joined clear of the tolerance band', () => {
    for (const level of SHAPE_LEVELS) {
      if (level.strokes.length < 2) {
        continue;
      }
      const paths = levelToPath(level);
      for (let i = 0; i < paths.length; i += 1) {
        for (let j = i + 1; j < paths.length; j += 1) {
          const a = paths[i] ?? [];
          const b = paths[j] ?? [];
          let min = Number.POSITIVE_INFINITY;
          for (const point of a) {
            min = Math.min(min, nearestOnPath(b, point.x, point.y).distance);
          }
          for (const point of b) {
            min = Math.min(min, nearestOnPath(a, point.x, point.y).distance);
          }
          const okay = min <= TOUCH || min >= TOLERANCE;
          expect(okay, `${level.id} strokes ${i}/${j} closest approach ${min.toFixed(1)}px`).toBe(
            true,
          );
        }
      }
    }
  });

  it('follows the locked formation for star and plus', () => {
    // Star: two strokes sharing both arm tips — the upper half sweeps over
    // the apex first, the lower half completes the outline back to the arm.
    const star = byId('shape-7');
    const upper = star.strokes[0];
    const lower = star.strokes[1];
    expect(upper?.[0]).toEqual(lower?.[0]); // left arm shared
    expect(upper?.at(-1)).toEqual(lower?.at(-1)); // right arm shared
    const apex = upper?.[2];
    expect(apex?.y, 'star apex above the arms').toBeLessThan(upper?.[0]?.y ?? 0);
    expect(
      lower?.some((point) => (point.y ?? 0) > 560),
      'star reaches the lower points',
    ).toBe(true);

    // Plus: vertical stroke first (top to bottom), horizontal second
    // (left to right) — school-style.
    const plus = byId('shape-8');
    const vertical = plus.strokes[0];
    const horizontal = plus.strokes[1];
    expect(vertical?.[0]?.x).toBe(vertical?.at(-1)?.x);
    expect((vertical?.at(-1)?.y ?? 0) > (vertical?.[0]?.y ?? 0)).toBe(true);
    expect(horizontal?.[0]?.y).toBe(horizontal?.at(-1)?.y);
    expect((horizontal?.at(-1)?.x ?? 0) > (horizontal?.[0]?.x ?? 0)).toBe(true);
  });
});

describe('malformed shapes content (labeled load-time error)', () => {
  it('labels a bad stroke pattern for its level index and id', () => {
    const bad = {
      badgeId: 'shapes-badge',
      id: 'shapes',
      levels: [
        {
          goal: { x: 215, y: 340 },
          goalArt: '/art/goal/shape-1.webp',
          id: 'shape-1',
          stroke: 'spiral',
          strokes: [
            [
              { x: 215, y: 340 },
              { x: 307, y: 378 },
            ],
          ],
        },
      ],
      menuFill: '#b8a9e8',
    };
    expect(() => parsePackJson(bad)).toThrow(
      /pack 'shapes' is invalid[\s\S]*level 0: invalid stroke 'spiral'/,
    );
    // Shape errors abort before the level id is known; the level index is the label.
    expect(collectPackProblems(bad)).toEqual(["pack level 0: invalid stroke 'spiral'"]);
  });

  it('labels an out-of-margin control point for its level', () => {
    const bad = {
      badgeId: 'shapes-badge',
      id: 'shapes',
      levels: [
        {
          goal: { x: 215, y: 340 },
          goalArt: '/art/goal/shape-1.webp',
          id: 'shape-1',
          stroke: 'circle',
          strokes: [
            [
              { x: 10, y: 340 },
              { x: 307, y: 378 },
            ],
          ],
        },
      ],
      menuFill: '#b8a9e8',
    };
    expect(collectPackProblems(bad)).toEqual([
      "pack level 0 ('shape-1'): stroke 0 control point 0 outside field margin",
    ]);
  });
});

describe('shapes generic surfaces (zero special-casing)', () => {
  const shapeIds = SHAPE_LEVELS.map((level) => level.id);

  it('lays the pack grid inside the field in both orientations', () => {
    // Portrait uses the shared defaults; landscape mirrors numbers (main.ts PACK_GRID).
    const portrait = packLayout(FIELD_WIDTH, FIELD_HEIGHT, shapeIds);
    for (const card of portrait.cards) {
      expect(card.x).toBeGreaterThanOrEqual(0);
      expect(card.y).toBeGreaterThanOrEqual(0);
      expect(card.x + card.width).toBeLessThanOrEqual(FIELD_WIDTH);
      expect(card.y + card.height).toBeLessThanOrEqual(FIELD_HEIGHT);
    }
    expect(new Set(portrait.cards.map((card) => card.y)).size).toBe(4);
    const landscape = packLayout(
      LANDSCAPE_FIELD_WIDTH,
      LANDSCAPE_FIELD_HEIGHT,
      shapeIds,
      SHAPES_LANDSCAPE,
    );
    for (const card of landscape.cards) {
      expect(card.x).toBeGreaterThanOrEqual(0);
      expect(card.y).toBeGreaterThanOrEqual(0);
      expect(card.x + card.width).toBeLessThanOrEqual(LANDSCAPE_FIELD_WIDTH);
      expect(card.y + card.height).toBeLessThanOrEqual(LANDSCAPE_FIELD_HEIGHT);
    }
    expect(new Set(landscape.cards.map((card) => card.y)).size).toBe(2);
  });

  it('boards the eight shape stickers one cell each, in order', () => {
    const board = stickerBoardLayout(FIELD_WIDTH, FIELD_HEIGHT, shapeIds);
    expect(board.cells.map((cell) => cell.levelId)).toEqual(shapeIds);
    for (const cell of board.cells) {
      expect(cell.x).toBeGreaterThanOrEqual(0);
      expect(cell.y).toBeGreaterThanOrEqual(0);
      expect(cell.x).toBeLessThanOrEqual(FIELD_WIDTH);
      expect(cell.y).toBeLessThanOrEqual(FIELD_HEIGHT);
    }
  });

  it('round-trips progress, stickers, and badge through the save without schema change', () => {
    let save = createDefaultSave();
    for (const level of SHAPE_LEVELS) {
      save = completeLevel(save, level.id);
    }
    expect(completedCount(save, SHAPES_PACK)).toBe(8);
    expect(isPackComplete(save, SHAPES_PACK)).toBe(true);
    expect(shouldAwardPackBadge(save, SHAPES_PACK)).toBe(true);
    expect(packStickers(save, shapeIds).every((earned) => earned)).toBe(true);
    save = awardBadge(save, SHAPES_PACK.badgeId);
    const restored = JSON.parse(JSON.stringify(save)) as typeof save;
    expect(shouldAwardPackBadge(restored, SHAPES_PACK)).toBe(false);
    expect(restored.badges).toContain('shapes-badge');
    // Bonus machinery stays inert for a bonusless pack.
    expect(SHAPES_PACK.bonuses).toEqual([]);
    expect(bonusUnlocked(save, SHAPES_PACK, 0)).toBe(false);
    expect(firstUnlockedBonusId(save, SHAPES_PACK)).toBeNull();
  });

  it('starts from a clean reset with no shapes residue', () => {
    const save = createDefaultSave();
    expect(completedCount(save, SHAPES_PACK)).toBe(0);
    expect(isPackComplete(save, SHAPES_PACK)).toBe(false);
    expect(shouldAwardPackBadge(save, SHAPES_PACK)).toBe(false);
    expect(save.badges).not.toContain('shapes-badge');
    expect(nextPackLevelId(save, SHAPES_PACK, 'shape-1')).toBe('shape-2');
  });
});
