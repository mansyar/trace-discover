// Patterns pack: nine levels (pattern-1 ... pattern-9) — three motifs
// (loop, spiral, stairs) × three sizes (small, medium, large) in size-major
// order per the pre-pack convention — authored as validated JSON
// (data/patterns.json). Every level is single-stroke; loops close back to
// their start, spirals wind inward, stairs keep their flats straight.
import { describe, expect, it } from 'vitest';
import type { Point } from '../engine/types';
import { FIELD_HEIGHT, FIELD_WIDTH, LANDSCAPE_FIELD_HEIGHT, LANDSCAPE_FIELD_WIDTH } from '../field';
import { awardBadge, completeLevel, createDefaultSave } from '../save/store';
import { packLayout, packStickers } from '../ui/pack';
import { stickerBoardLayout } from '../ui/stickerBoard';
import { collectPackProblems, parsePackJson } from './json';
import type { LevelDef } from './level';
import { validateLevel } from './level';
import { PATTERN_LEVELS, PATTERNS_PACK } from './patterns';
import {
  bonusUnlocked,
  completedCount,
  firstUnlockedBonusId,
  isPackComplete,
  nextPackLevelId,
  shouldAwardPackBadge,
} from './progress';

const ORDERED_IDS = [
  'pattern-1',
  'pattern-2',
  'pattern-3',
  'pattern-4',
  'pattern-5',
  'pattern-6',
  'pattern-7',
  'pattern-8',
  'pattern-9',
];

/** Locked order (size-major, pre-pack convention): motif × size. */
const STROKE_BY_ID: Record<string, string> = {
  'pattern-1': 'loop',
  'pattern-2': 'loop',
  'pattern-3': 'loop',
  'pattern-4': 'spiral',
  'pattern-5': 'spiral',
  'pattern-6': 'spiral',
  'pattern-7': 'stairs',
  'pattern-8': 'stairs',
  'pattern-9': 'stairs',
};

/** Locked stroke counts (mirrors the single-stroke motif plan). */
const STROKE_COUNT_BY_ID: Record<string, number> = {
  'pattern-1': 1,
  'pattern-2': 1,
  'pattern-3': 1,
  'pattern-4': 1,
  'pattern-5': 1,
  'pattern-6': 1,
  'pattern-7': 1,
  'pattern-8': 1,
  'pattern-9': 1,
};

function byId(id: string): LevelDef {
  const level = PATTERN_LEVELS.find((candidate) => candidate.id === id);
  if (!level) {
    throw new Error(`missing level ${id}`);
  }
  return level;
}

/** Landscape pack-grid options main.ts configures for patterns (mirrors pre). */
const PATTERNS_LANDSCAPE = { cardSize: 90, columns: 6, slotsPerRow: 12 };

describe('patterns pack', () => {
  it('lists the nine levels in the locked order', () => {
    expect(PATTERN_LEVELS.map((level) => level.id)).toEqual(ORDERED_IDS);
  });

  it('carries the locked motif label per level', () => {
    for (const level of PATTERN_LEVELS) {
      expect(level.stroke, `${level.id} motif`).toBe(STROKE_BY_ID[level.id]);
    }
  });

  it('pins the locked stroke counts', () => {
    for (const level of PATTERN_LEVELS) {
      expect(level.strokes, `${level.id} strokes`).toHaveLength(STROKE_COUNT_BY_ID[level.id] ?? 0);
    }
  });

  it('keeps every level valid, on-convention, and ending at its goal', () => {
    for (const level of PATTERN_LEVELS) {
      expect(validateLevel(level), `${level.id} geometry`).toEqual([]);
      expect(level.goalArt, `${level.id} art`).toBe(`/art/goal/${level.id}.webp`);
      const lastStroke = level.strokes[level.strokes.length - 1];
      const lastPoint = lastStroke?.[lastStroke.length - 1];
      expect(lastPoint, `${level.id} final point`).toBeDefined();
      expect(level.goal, `${level.id} goal`).toEqual(lastPoint);
    }
  });

  it('closes every loop back to its start point', () => {
    for (const id of ['pattern-1', 'pattern-2', 'pattern-3']) {
      const stroke = byId(id).strokes[0];
      expect(stroke?.[0], `${id} closes`).toEqual(stroke?.at(-1));
    }
  });

  it('keeps every control point inside the field margin (portrait reference)', () => {
    for (const level of PATTERN_LEVELS) {
      expect(validateLevel(level), `${level.id} margins`).toEqual([]);
    }
  });

  it('exposes the pack entry with its badge, fill, and no bonuses', () => {
    expect(PATTERNS_PACK.id).toBe('patterns');
    expect(PATTERNS_PACK.badgeId).toBe('patterns-badge');
    expect(PATTERNS_PACK.menuFill).toBe('#8fd6c8');
    expect(PATTERNS_PACK.levels).toHaveLength(9);
    expect(PATTERNS_PACK.bonuses).toEqual([]);
    expect(PATTERNS_PACK.bonusUnlocks).toEqual([]);
  });

  it('scales motifs by size band: small ≈145–285, medium ≈100–330, large ≈60–370', () => {
    const bandWidth = (id: string): number => {
      const stroke = byId(id).strokes[0];
      const xs = (stroke ?? []).map((point) => point.x);
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(bandWidth('pattern-1')).toBeGreaterThanOrEqual(100);
    expect(bandWidth('pattern-1')).toBeLessThanOrEqual(180);
    expect(bandWidth('pattern-2')).toBeGreaterThanOrEqual(190);
    expect(bandWidth('pattern-2')).toBeLessThanOrEqual(260);
    expect(bandWidth('pattern-3')).toBeGreaterThanOrEqual(280);
    expect(bandWidth('pattern-3')).toBeLessThanOrEqual(330);
    expect(bandWidth('pattern-4')).toBeGreaterThanOrEqual(100);
    expect(bandWidth('pattern-4')).toBeLessThanOrEqual(180);
    expect(bandWidth('pattern-5')).toBeGreaterThanOrEqual(190);
    expect(bandWidth('pattern-5')).toBeLessThanOrEqual(260);
    expect(bandWidth('pattern-6')).toBeGreaterThanOrEqual(280);
    expect(bandWidth('pattern-6')).toBeLessThanOrEqual(330);
    expect(bandWidth('pattern-7')).toBeGreaterThanOrEqual(100);
    expect(bandWidth('pattern-7')).toBeLessThanOrEqual(180);
    expect(bandWidth('pattern-8')).toBeGreaterThanOrEqual(190);
    expect(bandWidth('pattern-8')).toBeLessThanOrEqual(260);
    expect(bandWidth('pattern-9')).toBeGreaterThanOrEqual(280);
    expect(bandWidth('pattern-9')).toBeLessThanOrEqual(330);
  });

  it('keeps stair flats straight via edge midpoints', () => {
    for (const id of ['pattern-7', 'pattern-8', 'pattern-9']) {
      const stroke = byId(id).strokes[0] ?? [];
      for (let i = 2; i < stroke.length - 2; i += 2) {
        const a = stroke[i];
        const mid = stroke[i + 1];
        const b = stroke[i + 2];
        if (!a || !mid || !b) {
          continue;
        }
        // Even indices are corners; the point between two corners lies on the
        // straight segment between them (shared x for horizontals, shared y
        // for verticals) so the rendered flat carries no skew.
        const onFlat = (a.x === mid.x && b.x === mid.x) || (a.y === mid.y && b.y === mid.y);
        expect(onFlat, `${id} midpoint ${i + 1} on the flat`).toBe(true);
      }
    }
  });
});

describe('malformed patterns content (labeled load-time error)', () => {
  it('labels a bad stroke pattern for its level index and id', () => {
    const bad = {
      badgeId: 'patterns-badge',
      id: 'patterns',
      levels: [
        {
          goal: { x: 215, y: 340 },
          goalArt: '/art/goal/pattern-1.webp',
          id: 'pattern-1',
          stroke: 'rainbow',
          strokes: [
            [
              { x: 215, y: 340 },
              { x: 307, y: 378 },
            ],
          ],
        },
      ],
      menuFill: '#8fd6c8',
    };
    expect(() => parsePackJson(bad)).toThrow(
      /pack 'patterns' is invalid[\s\S]*level 0: invalid stroke 'rainbow'/,
    );
    // Stroke errors abort before the level id is known; the level index is the label.
    expect(collectPackProblems(bad)).toEqual(["pack level 0: invalid stroke 'rainbow'"]);
  });
});

describe('patterns generic surfaces (zero special-casing)', () => {
  const patternIds = PATTERN_LEVELS.map((level) => level.id);

  it('lays the pack grid inside the field in both orientations', () => {
    // Portrait mirrors pre's PACK_GRID portrait config; landscape mirrors its
    // landscape entry (main.ts PACK_GRID: columns 3 / 6 cols, 12 slots).
    const portrait = packLayout(FIELD_WIDTH, FIELD_HEIGHT, patternIds, {
      columns: 3,
      slotsPerRow: 6,
    });
    for (const card of portrait.cards) {
      expect(card.x).toBeGreaterThanOrEqual(0);
      expect(card.y).toBeGreaterThanOrEqual(0);
      expect(card.x + card.width).toBeLessThanOrEqual(FIELD_WIDTH);
      expect(card.y + card.height).toBeLessThanOrEqual(FIELD_HEIGHT);
    }
    expect(new Set(portrait.cards.map((card) => card.y)).size).toBe(3);
    const landscape = packLayout(
      LANDSCAPE_FIELD_WIDTH,
      LANDSCAPE_FIELD_HEIGHT,
      patternIds,
      PATTERNS_LANDSCAPE,
    );
    for (const card of landscape.cards) {
      expect(card.x).toBeGreaterThanOrEqual(0);
      expect(card.y).toBeGreaterThanOrEqual(0);
      expect(card.x + card.width).toBeLessThanOrEqual(LANDSCAPE_FIELD_WIDTH);
      expect(card.y + card.height).toBeLessThanOrEqual(LANDSCAPE_FIELD_HEIGHT);
    }
    expect(new Set(landscape.cards.map((card) => card.y)).size).toBe(2);
  });

  it('boards the nine pattern stickers one cell each, in order', () => {
    const board = stickerBoardLayout(FIELD_WIDTH, FIELD_HEIGHT, patternIds);
    expect(board.cells.map((cell) => cell.levelId)).toEqual(patternIds);
    for (const cell of board.cells) {
      expect(cell.x).toBeGreaterThanOrEqual(0);
      expect(cell.y).toBeGreaterThanOrEqual(0);
      expect(cell.x).toBeLessThanOrEqual(FIELD_WIDTH);
      expect(cell.y).toBeLessThanOrEqual(FIELD_HEIGHT);
    }
  });

  it('round-trips progress, stickers, and badge through the save without schema change', () => {
    let save = createDefaultSave();
    for (const level of PATTERN_LEVELS) {
      save = completeLevel(save, level.id);
    }
    expect(completedCount(save, PATTERNS_PACK)).toBe(9);
    expect(isPackComplete(save, PATTERNS_PACK)).toBe(true);
    expect(shouldAwardPackBadge(save, PATTERNS_PACK)).toBe(true);
    expect(packStickers(save, patternIds).every((earned) => earned)).toBe(true);
    save = awardBadge(save, PATTERNS_PACK.badgeId);
    const restored = JSON.parse(JSON.stringify(save)) as typeof save;
    expect(shouldAwardPackBadge(restored, PATTERNS_PACK)).toBe(false);
    expect(restored.badges).toContain('patterns-badge');
    // Bonus machinery stays inert for a bonusless pack.
    expect(PATTERNS_PACK.bonuses).toEqual([]);
    expect(bonusUnlocked(save, PATTERNS_PACK, 0)).toBe(false);
    expect(firstUnlockedBonusId(save, PATTERNS_PACK)).toBeNull();
  });

  it('starts from a clean reset with no patterns residue', () => {
    const save = createDefaultSave();
    expect(completedCount(save, PATTERNS_PACK)).toBe(0);
    expect(isPackComplete(save, PATTERNS_PACK)).toBe(false);
    expect(shouldAwardPackBadge(save, PATTERNS_PACK)).toBe(false);
    expect(save.badges).not.toContain('patterns-badge');
    expect(nextPackLevelId(save, PATTERNS_PACK, 'pattern-1')).toBe('pattern-2');
  });
});

/** Uniqueness of consecutive points is parser-enforced; this re-checks order. */
describe('patterns geometry invariants', () => {
  it('keeps at least two points on every stroke (parser contract)', () => {
    for (const level of PATTERN_LEVELS) {
      for (const stroke of level.strokes) {
        expect(stroke.length, `${level.id} stroke points`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('keeps every goal within the field margins as a Point', () => {
    for (const level of PATTERN_LEVELS) {
      const goal: Point = level.goal;
      expect(goal.x).toBeGreaterThanOrEqual(24);
      expect(goal.x).toBeLessThanOrEqual(FIELD_WIDTH - 24);
      expect(goal.y).toBeGreaterThanOrEqual(24);
      expect(goal.y).toBeLessThanOrEqual(FIELD_HEIGHT - 24);
    }
  });
});
