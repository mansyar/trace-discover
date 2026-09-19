// Animal outlines pack: eight organic silhouettes (animal-1 ... animal-8) —
// fish, ladybug, duck, turtle, bunny, cat, butterfly, elephant — authored as
// validated JSON (data/animals.json) from reference-traced contours (owner
// decision 2026-09-19). Stroke structure is anatomy-driven: fish (body + tail),
// ladybug (dome + head line), and butterfly (upper + lower wings) trace as
// multiple strokes; duck, turtle, bunny, cat, and elephant as one flowing
// closed outline.
import { describe, expect, it } from 'vitest';
import type { Point } from '../engine/types';
import { FIELD_HEIGHT, FIELD_WIDTH, LANDSCAPE_FIELD_HEIGHT, LANDSCAPE_FIELD_WIDTH } from '../field';
import { awardBadge, completeLevel, createDefaultSave } from '../save/store';
import { menuLayout } from '../ui/menu';
import { packLayout, packStickers } from '../ui/pack';
import { stickerBoardLayout } from '../ui/stickerBoard';
import { ANIMAL_LEVELS, ANIMALS_PACK } from './animals';
import { appPacks } from './catalog';
import { collectPackProblems, parsePackJson } from './json';
import type { LevelDef } from './level';
import { validateLevel } from './level';
import {
  bonusUnlocked,
  completedCount,
  firstUnlockedBonusId,
  isPackComplete,
  nextPackLevelId,
  shouldAwardPackBadge,
} from './progress';

const ORDERED_IDS = [
  'animal-1',
  'animal-2',
  'animal-3',
  'animal-4',
  'animal-5',
  'animal-6',
  'animal-7',
  'animal-8',
];

/** The five clean silhouettes that trace as one closed outline. */
const SINGLE_OUTLINE_IDS = ['animal-3', 'animal-4', 'animal-5', 'animal-6', 'animal-8'];

/** Locked anatomy-driven stroke counts (spec; harness review may re-pin). */
const LOCKED_STROKES: Record<string, number> = {
  'animal-1': 2, // fish — body + tail
  'animal-2': 2, // ladybug — dome + head line
  'animal-3': 1, // duck — one flowing outline
  'animal-4': 1, // turtle — one flowing outline
  'animal-5': 1, // bunny — one flowing outline
  'animal-6': 1, // cat — one flowing outline
  'animal-7': 2, // butterfly — upper + lower wings (trace re-pin from the spec's 3)
  'animal-8': 1, // elephant — one flowing outline
};

function byId(id: string): LevelDef {
  const level = ANIMAL_LEVELS.find((candidate) => candidate.id === id);
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

describe('animals pack', () => {
  it('lists the eight animals in the locked simple-to-detailed order', () => {
    expect(ANIMAL_LEVELS.map((level) => level.id)).toEqual(ORDERED_IDS);
  });

  it('keeps every level valid, on-convention, and ending at its goal', () => {
    for (const level of ANIMAL_LEVELS) {
      expect(validateLevel(level), `${level.id} geometry`).toEqual([]);
      expect(level.goalArt, `${level.id} art`).toBe(`/art/goal/${level.id}.webp`);
      expect(level.goal, `${level.id} goal`).toEqual(lastPoint(level));
    }
  });

  it('pins the anatomy-driven stroke counts', () => {
    for (const [id, count] of Object.entries(LOCKED_STROKES)) {
      expect(byId(id).strokes, `${id} strokes`).toHaveLength(count);
    }
  });

  it('closes the single-outline animals back to their start point', () => {
    for (const id of SINGLE_OUTLINE_IDS) {
      const stroke = byId(id).strokes[0];
      expect(stroke?.[0], `${id} closes`).toEqual(stroke?.at(-1));
    }
  });

  it('exposes the pack entry with its badge, fill, and no bonuses', () => {
    expect(ANIMALS_PACK.id).toBe('animals');
    expect(ANIMALS_PACK.badgeId).toBe('animals-badge');
    expect(ANIMALS_PACK.menuFill).toBe('#f4a6a0');
    expect(ANIMALS_PACK.levels).toHaveLength(8);
    expect(ANIMALS_PACK.bonuses).toEqual([]);
    expect(ANIMALS_PACK.bonusUnlocks).toEqual([]);
  });
});

describe('malformed animals content (labeled load-time error)', () => {
  it('labels a bad stroke pattern for its level index', () => {
    const bad = {
      badgeId: 'animals-badge',
      id: 'animals',
      levels: [
        {
          goal: { x: 215, y: 340 },
          goalArt: '/art/goal/animal-1.webp',
          id: 'animal-1',
          stroke: 'spiral',
          strokes: [
            [
              { x: 215, y: 340 },
              { x: 307, y: 378 },
            ],
          ],
        },
      ],
      menuFill: '#f4a6a0',
    };
    expect(() => parsePackJson(bad)).toThrow(
      /pack 'animals' is invalid[\s\S]*level 0: invalid stroke 'spiral'/,
    );
    // Stroke errors abort before the level id is known; the level index is the label.
    expect(collectPackProblems(bad)).toEqual(["pack level 0: invalid stroke 'spiral'"]);
  });

  it('labels an out-of-margin control point for its level', () => {
    const bad = {
      badgeId: 'animals-badge',
      id: 'animals',
      levels: [
        {
          goal: { x: 215, y: 340 },
          goalArt: '/art/goal/animal-1.webp',
          id: 'animal-1',
          stroke: 'line',
          strokes: [
            [
              { x: 10, y: 340 },
              { x: 307, y: 378 },
            ],
          ],
        },
      ],
      menuFill: '#f4a6a0',
    };
    expect(collectPackProblems(bad)).toEqual([
      "pack level 0 ('animal-1'): stroke 0 control point 0 outside field margin",
    ]);
  });
});

describe('animals generic surfaces (zero special-casing)', () => {
  const animalIds = ANIMAL_LEVELS.map((level) => level.id);
  // Landscape mirrors the animals entry in main.ts PACK_GRID.
  const ANIMALS_LANDSCAPE = { cardSize: 90, columns: 5, slotsPerRow: 10 };

  it('lays the pack grid inside the field in both orientations', () => {
    const portrait = packLayout(FIELD_WIDTH, FIELD_HEIGHT, animalIds);
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
      animalIds,
      ANIMALS_LANDSCAPE,
    );
    for (const card of landscape.cards) {
      expect(card.x).toBeGreaterThanOrEqual(0);
      expect(card.y).toBeGreaterThanOrEqual(0);
      expect(card.x + card.width).toBeLessThanOrEqual(LANDSCAPE_FIELD_WIDTH);
      expect(card.y + card.height).toBeLessThanOrEqual(LANDSCAPE_FIELD_HEIGHT);
    }
    expect(new Set(landscape.cards.map((card) => card.y)).size).toBe(2);
  });

  it('boards the eight animal stickers one cell each, in order', () => {
    const board = stickerBoardLayout(FIELD_WIDTH, FIELD_HEIGHT, animalIds);
    expect(board.cells.map((cell) => cell.levelId)).toEqual(animalIds);
    for (const cell of board.cells) {
      expect(cell.x).toBeGreaterThanOrEqual(0);
      expect(cell.y).toBeGreaterThanOrEqual(0);
      expect(cell.x).toBeLessThanOrEqual(FIELD_WIDTH);
      expect(cell.y).toBeLessThanOrEqual(FIELD_HEIGHT);
    }
  });

  it('round-trips progress, stickers, and badge through the save without schema change', () => {
    let save = createDefaultSave();
    for (const level of ANIMAL_LEVELS) {
      save = completeLevel(save, level.id);
    }
    expect(completedCount(save, ANIMALS_PACK)).toBe(8);
    expect(isPackComplete(save, ANIMALS_PACK)).toBe(true);
    expect(shouldAwardPackBadge(save, ANIMALS_PACK)).toBe(true);
    expect(packStickers(save, animalIds).every((earned) => earned)).toBe(true);
    save = awardBadge(save, ANIMALS_PACK.badgeId);
    const restored = JSON.parse(JSON.stringify(save)) as typeof save;
    expect(shouldAwardPackBadge(restored, ANIMALS_PACK)).toBe(false);
    expect(restored.badges).toContain('animals-badge');
    expect(restored.version).toBe(3);
    // Bonus machinery stays inert for a bonusless pack.
    expect(ANIMALS_PACK.bonuses).toEqual([]);
    expect(bonusUnlocked(save, ANIMALS_PACK, 0)).toBe(false);
    expect(firstUnlockedBonusId(save, ANIMALS_PACK)).toBeNull();
  });

  it('starts from a clean reset with no animals residue', () => {
    const save = createDefaultSave();
    expect(completedCount(save, ANIMALS_PACK)).toBe(0);
    expect(isPackComplete(save, ANIMALS_PACK)).toBe(false);
    expect(shouldAwardPackBadge(save, ANIMALS_PACK)).toBe(false);
    expect(save.badges).not.toContain('animals-badge');
    expect(nextPackLevelId(save, ANIMALS_PACK, 'animal-1')).toBe('animal-2');
  });

  it('keeps the menu a single page without the runtime name pack', () => {
    const ids = appPacks(createDefaultSave()).map((pack) => pack.id);
    expect(ids).toEqual(['pre', 'numbers', 'abc', 'shapes', 'animals']);
    const menu = menuLayout(FIELD_WIDTH, FIELD_HEIGHT, ids);
    expect(menu.cards).toHaveLength(5);
    expect(menu.pager).toBeNull();
  });

  it('keeps the menu a single page with the runtime name pack (six entries, no pager)', () => {
    const save = { ...createDefaultSave(), name: 'AVA' };
    const ids = appPacks(save).map((pack) => pack.id);
    expect(ids).toEqual(['pre', 'numbers', 'abc', 'shapes', 'animals', 'name']);
    const menu = menuLayout(FIELD_WIDTH, FIELD_HEIGHT, ids);
    expect(menu.cards).toHaveLength(6);
    expect(menu.cards.some((card) => card.packId === 'animals')).toBe(true);
    expect(menu.pager).toBeNull();
  });
});
