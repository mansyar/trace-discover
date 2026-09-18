// Byte-level parity: every control point, goal, pattern, id, and art path in
// the JSON-sourced Numbers pack must match the frozen pre-port fixture
// (`fixtures/numbers-parity.json`, captured from master @ 086f8c8) exactly.
// This is the port's hard constraint — gameplay must not change.
import { expect, it, vi } from 'vitest';
import fixture from './fixtures/numbers-parity.json';
import { NUMBERS_PACK, NUMERAL_LEVELS } from './numbers';

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

it('keeps all 10 numeral levels byte-identical to the frozen fixture', () => {
  expect(NUMERAL_LEVELS).toHaveLength(10);
  expect(NUMERAL_LEVELS.map((level) => asFixtureShape(level))).toEqual(fixture.levels);
});

it('keeps the pack identity and (empty) unlock rule unchanged', () => {
  expect(NUMBERS_PACK.id).toBe('numbers');
  expect(NUMBERS_PACK.badgeId).toBe('numbers-badge');
  expect(NUMBERS_PACK.menuFill).toBe('#f3c969');
  expect(NUMBERS_PACK.bonusUnlocks).toEqual([]);
  expect(NUMBERS_PACK.bonuses).toEqual([]);
  expect(NUMBERS_PACK.levels).toBe(NUMERAL_LEVELS);
});

it('fails loudly with a labeled error when the pack JSON is malformed', async () => {
  vi.resetModules();
  vi.doMock('./data/numbers.json', () => ({
    default: {
      badgeId: 'numbers-badge',
      id: 'numbers',
      levels: [
        {
          goal: { x: 215, y: 640 },
          goalArt: '/art/goal/num-1.webp',
          id: 'num-1',
          stroke: 'line',
          strokes: [[{ x: 215, y: 250 }]],
        },
      ],
      menuFill: '#f3c969',
    },
  }));
  await expect(import('./numbers')).rejects.toThrow(/stroke 0 needs at least 2 control points/);
  vi.doUnmock('./data/numbers.json');
  vi.resetModules();
});
