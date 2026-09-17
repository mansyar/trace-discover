// Byte-level parity: every control point, goal, pattern, id, and art path in
// the JSON-sourced Letters pack (26 uppercase + 3 sequence bonuses) must match
// the frozen pre-port fixture (`fixtures/letters-parity.json`, captured from
// master @ 086f8c8) exactly. This is the port's hard constraint — gameplay
// must not change.
import { expect, it, vi } from 'vitest';
import fixture from './fixtures/letters-parity.json';
import { LETTER_BONUS_LEVELS, LETTER_LEVELS, LETTERS_PACK, letterLevel } from './letters';

/** Renders a LevelDef in the fixture's shape for whole-object comparison. */
function asFixtureShape(level: {
  readonly goal: { readonly x: number; readonly y: number };
  readonly goalArt: string;
  readonly id: string;
  readonly stroke: string;
  readonly strokes: readonly (readonly { readonly x: number; readonly y: number }[])[];
}) {
  return {
    goal: { x: level.goal.x, y: level.goal.y },
    goalArt: level.goalArt,
    id: level.id,
    stroke: level.stroke,
    strokes: level.strokes.map((stroke) => stroke.map((point) => ({ x: point.x, y: point.y }))),
  };
}

it('keeps all 26 letter levels byte-identical to the frozen fixture', () => {
  expect(LETTER_LEVELS).toHaveLength(26);
  expect(LETTER_LEVELS.map((level) => asFixtureShape(level))).toEqual(fixture.levels);
});

it('keeps all 3 sequence bonuses byte-identical to the frozen fixture', () => {
  expect(LETTER_BONUS_LEVELS).toHaveLength(3);
  expect(LETTER_BONUS_LEVELS.map((level) => asFixtureShape(level))).toEqual(fixture.bonuses);
});

it('keeps the pack identity and unlock rule unchanged', () => {
  expect(LETTERS_PACK.id).toBe('abc');
  expect(LETTERS_PACK.badgeId).toBe('abc-badge');
  expect(LETTERS_PACK.menuFill).toBe('#90be6d');
  expect(LETTERS_PACK.bonusUnlocks).toEqual([9, 18, 26]);
  expect(LETTERS_PACK.levels).toBe(LETTER_LEVELS);
  expect(LETTERS_PACK.bonuses).toBe(LETTER_BONUS_LEVELS);
});

it('keeps the letterLevel builder deriving goal and goalArt', () => {
  const level = letterLevel('abc-x', 'line', [
    [
      { x: 150, y: 300 },
      { x: 280, y: 640 },
    ],
  ]);
  expect(level.id).toBe('abc-x');
  expect(level.stroke).toBe('line');
  expect(level.goal).toEqual({ x: 280, y: 640 });
  expect(level.goalArt).toBe('/art/goal/abc-x.webp');
});

it('fails loudly with a labeled error when the pack JSON is malformed', async () => {
  vi.resetModules();
  vi.doMock('./data/abc.json', () => ({
    default: {
      badgeId: 'abc-badge',
      id: 'abc',
      levels: [
        {
          goal: { x: 215, y: 300 },
          goalArt: '/art/goal/abc-a.webp',
          id: 'abc-a',
          stroke: 'line',
          strokes: [[{ x: 215, y: 300 }]],
        },
      ],
      menuFill: '#90be6d',
    },
  }));
  await expect(import('./letters')).rejects.toThrow(/stroke 0 needs at least 2 control points/);
  vi.doUnmock('./data/abc.json');
  vi.resetModules();
});
