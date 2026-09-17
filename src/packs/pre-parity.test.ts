// Byte-level parity: every control point, goal, pattern, and unlock in the
// JSON-sourced Pre-writing pack must match the original hand-authored table
// exactly. This is the port's hard constraint — gameplay must not change.
import { expect, it } from 'vitest';
import { PRE_BONUS_LEVELS, PRE_LEVELS, PRE_PACK } from './pre';

/** [stroke, goal.x, goal.y, [x, y][] per stroke] — transcribed from pre.ts. */
const TABLE: readonly [string, number, number, readonly (readonly number[])[]][] = [
  [
    'line',
    285,
    430,
    [
      [145, 430],
      [215, 430],
      [285, 430],
    ],
  ],
  [
    'wave',
    285,
    455,
    [
      [145, 455],
      [180, 430],
      [215, 455],
      [250, 430],
      [285, 455],
    ],
  ],
  [
    'arc',
    285,
    460,
    [
      [145, 460],
      [215, 390],
      [285, 460],
    ],
  ],
  [
    'zigzag',
    285,
    410,
    [
      [145, 410],
      [180, 455],
      [215, 410],
      [250, 455],
      [285, 410],
    ],
  ],
  [
    'line',
    330,
    460,
    [
      [100, 460],
      [215, 460],
      [330, 460],
    ],
  ],
  [
    'wave',
    330,
    515,
    [
      [100, 515],
      [157, 460],
      [215, 515],
      [272, 460],
      [330, 515],
    ],
  ],
  [
    'arc',
    330,
    515,
    [
      [100, 515],
      [215, 405],
      [330, 515],
    ],
  ],
  [
    'zigzag',
    330,
    435,
    [
      [100, 435],
      [138, 485],
      [177, 435],
      [215, 485],
      [253, 435],
      [292, 485],
      [330, 435],
    ],
  ],
  [
    'line',
    370,
    560,
    [
      [60, 560],
      [215, 560],
      [370, 560],
    ],
  ],
  [
    'wave',
    370,
    560,
    [
      [60, 560],
      [137, 475],
      [215, 560],
      [292, 475],
      [370, 560],
    ],
  ],
  [
    'arc',
    370,
    605,
    [
      [60, 605],
      [215, 445],
      [370, 605],
    ],
  ],
  [
    'zigzag',
    370,
    430,
    [
      [60, 430],
      [99, 485],
      [138, 430],
      [176, 485],
      [215, 430],
      [254, 485],
      [293, 430],
      [331, 485],
      [370, 430],
    ],
  ],
];

const BONUS_TABLE: readonly [string, number, number, readonly (readonly number[])[]][] = [
  [
    'circle',
    215,
    355,
    [
      [215, 355],
      [140, 430],
      [215, 505],
      [290, 430],
      [215, 355],
    ],
  ],
  [
    'circle',
    215,
    360,
    [
      [215, 360],
      [115, 460],
      [215, 560],
      [315, 460],
      [215, 360],
    ],
  ],
  [
    'circle',
    215,
    300,
    [
      [215, 300],
      [85, 430],
      [215, 560],
      [345, 430],
      [215, 300],
    ],
  ],
];

/** Flattens a LevelDef into the comparable [stroke, goal.x, goal.y, strokes] tuple. */
function asTuple(level: {
  readonly stroke: string;
  readonly goal: { readonly x: number; readonly y: number };
  readonly strokes: readonly (readonly { readonly x: number; readonly y: number }[])[];
}) {
  return [
    level.stroke,
    level.goal.x,
    level.goal.y,
    level.strokes.map((stroke) => stroke.map((point) => [point.x, point.y])),
  ];
}

it('keeps all 15 pre-writing levels byte-identical to the original table', () => {
  expect(PRE_LEVELS).toHaveLength(12);
  expect(PRE_BONUS_LEVELS).toHaveLength(3);

  const expected = TABLE.map(([stroke, gx, gy, strokes]) => [stroke, gx, gy, [strokes]]);
  const actual = PRE_LEVELS.map((level) => asTuple(level));

  expect(actual).toEqual(expected);
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
  expect(PRE_LEVELS.map((level) => level.goalArt)).toEqual(
    TABLE.map((_, index) => `/art/goal/pre-${index + 1}.webp`),
  );
});

it('keeps all 3 bonus circles byte-identical to the original table', () => {
  const expected = BONUS_TABLE.map(([stroke, gx, gy, strokes]) => [stroke, gx, gy, [strokes]]);
  const actual = PRE_BONUS_LEVELS.map((level) => asTuple(level));

  expect(actual).toEqual(expected);
  expect(PRE_BONUS_LEVELS.map((level) => level.goalArt)).toEqual([
    '/art/goal/pre-bonus-1.webp',
    '/art/goal/pre-bonus-2.webp',
    '/art/goal/pre-bonus-3.webp',
  ]);
});

it('keeps the pack identity and unlock rule unchanged', () => {
  expect(PRE_PACK.badgeId).toBe('pre-badge');
  expect(PRE_PACK.id).toBe('pre');
  expect(PRE_PACK.menuFill).toBe('#8ecae6');
  expect(PRE_PACK.bonusUnlocks).toEqual([4, 8, 12]);
  expect(PRE_PACK.bonuses).toBe(PRE_BONUS_LEVELS);
  expect(PRE_PACK.levels).toBe(PRE_LEVELS);
});
