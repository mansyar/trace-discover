// Pack JSON parser: shape + geometry validation for declarative pack data.
// Shape checks reject unknown keys so authoring typos (e.g. `goals` for
// `goal`) fail loudly instead of silently changing behavior.
import { describe, expect, it } from 'vitest';
import { parsePackJson } from './json';

const LEVEL = {
  goal: { x: 285, y: 430 },
  goalArt: '/art/goal/pre-1.webp',
  id: 'pre-1',
  stroke: 'line',
  strokes: [
    [
      { x: 145, y: 430 },
      { x: 215, y: 430 },
      { x: 285, y: 430 },
    ],
  ],
};

const PACK = {
  badgeId: 'pre-badge',
  id: 'pre',
  levels: [LEVEL],
  menuFill: '#a8d8b9',
};

describe('parsePackJson shape errors', () => {
  it('rejects a non-object pack', () => {
    expect(() => parsePackJson(null)).toThrow(/pack must be an object/);
    expect(() => parsePackJson('pre')).toThrow(/pack must be an object/);
  });

  it('rejects unknown pack keys', () => {
    expect(() => parsePackJson({ ...PACK, levels2: [] })).toThrow(/unknown pack key.*levels2/);
  });

  it('rejects a pack without a non-empty id', () => {
    const { id: _id, ...withoutId } = PACK;
    expect(() => parsePackJson(withoutId)).toThrow(/missing pack id/);
    expect(() => parsePackJson({ ...PACK, id: '' })).toThrow(/missing pack id/);
  });

  it('rejects a non-object level', () => {
    expect(() => parsePackJson({ ...PACK, levels: ['pre-1'] })).toThrow(
      /level 0.*must be an object/,
    );
  });

  it('rejects unknown level keys', () => {
    const { goal: _goal, ...missingGoal } = LEVEL;
    const typo = { ...missingGoal, goals: LEVEL.goal };
    expect(() => parsePackJson({ ...PACK, levels: [typo] })).toThrow(
      /level 0: unknown level key.*goals/,
    );
  });

  it('rejects a level with an invalid stroke pattern', () => {
    expect(() => parsePackJson({ ...PACK, levels: [{ ...LEVEL, stroke: 'spiral' }] })).toThrow(
      /level 0: invalid stroke 'spiral'/,
    );
  });

  it('rejects a level with an empty or missing id', () => {
    const { id: _id, ...withoutId } = LEVEL;
    expect(() => parsePackJson({ ...PACK, levels: [withoutId] })).toThrow(
      /level 0: missing id/,
    );
    expect(() => parsePackJson({ ...PACK, levels: [{ ...LEVEL, id: '' }] })).toThrow(
      /level 0: missing id/,
    );
  });

  it('rejects strokes that are not arrays of points', () => {
    expect(() => parsePackJson({ ...PACK, levels: [{ ...LEVEL, strokes: 'line' }] })).toThrow(
      /level 0: strokes must be an array/,
    );
    expect(() =>
      parsePackJson({
        ...PACK,
        levels: [{ ...LEVEL, strokes: [[{ x: 1, y: 2 }, 2]] }],
      }),
    ).toThrow(/level 0: stroke 0 point 1/);
  });

  it('rejects a non-array bonuses or bonusUnlocks list', () => {
    expect(() => parsePackJson({ ...PACK, bonuses: 'circle' })).toThrow(
      /bonuses must be an array/,
    );
    expect(() => parsePackJson({ ...PACK, bonusUnlocks: 4 })).toThrow(
      /bonusUnlocks must be an array/,
    );
  });

  it('rejects a goal that is not a finite point pair', () => {
    expect(() => parsePackJson({ ...PACK, levels: [{ ...LEVEL, goal: { x: 1 } }] })).toThrow(
      /level 0: goal/,
    );
    expect(() =>
      parsePackJson({ ...PACK, levels: [{ ...LEVEL, goal: { x: Number.NaN, y: 1 } }] }),
    ).toThrow(/level 0: goal/);
  });

  it('begins returning a PackEntry for well-formed input', () => {
    const pack = parsePackJson(PACK);
    expect(pack.id).toBe('pre');
    expect(pack.levels).toHaveLength(1);
    expect(pack.levels[0]?.strokes).toHaveLength(1);
  });
});
