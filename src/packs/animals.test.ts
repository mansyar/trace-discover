// Animal outlines pack: eight organic silhouettes (animal-1 ... animal-8) —
// fish, ladybug, duck, turtle, bunny, cat, butterfly, elephant — authored as
// validated JSON (data/animals.json). Stroke structure is anatomy-driven per
// the locked spec: fish (body + tail), ladybug (dome + head line), and
// butterfly (mirrored wings + body) trace as multiple strokes; duck, turtle,
// bunny, cat, and elephant as one flowing closed outline.
import { describe, expect, it } from 'vitest';
import type { Point } from '../engine/types';
import { ANIMAL_LEVELS, ANIMALS_PACK } from './animals';
import { collectPackProblems, parsePackJson } from './json';
import type { LevelDef } from './level';
import { validateLevel } from './level';

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
  'animal-7': 3, // butterfly — mirrored wings + body
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
