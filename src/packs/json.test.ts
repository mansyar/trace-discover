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
    expect(() => parsePackJson({ ...PACK, levels: [withoutId] })).toThrow(/level 0: missing id/);
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
        levels: [{ ...LEVEL, strokes: ['line'] }],
      }),
    ).toThrow(/level 0: stroke 0 must be an array of points/);
    expect(() =>
      parsePackJson({
        ...PACK,
        levels: [{ ...LEVEL, strokes: [[{ x: 1, y: 2 }, 2]] }],
      }),
    ).toThrow(/level 0: stroke 0 point 1/);
    expect(() =>
      parsePackJson({
        ...PACK,
        levels: [{ ...LEVEL, strokes: [[1, { x: 1, y: 2 }]] }],
      }),
    ).toThrow(/level 0: stroke 0 point 0 must be an object/);
    expect(() =>
      parsePackJson({
        ...PACK,
        levels: [{ ...LEVEL, goal: 'finish' }],
      }),
    ).toThrow(/level 0: goal must be an object/);
  });

  it('rejects a level without goal art', () => {
    const { goalArt: _art, ...withoutArt } = LEVEL;
    expect(() => parsePackJson({ ...PACK, levels: [withoutArt] })).toThrow(
      /level 0: goalArt must be a bundle path under \/art\/goal\//,
    );
    expect(() => parsePackJson({ ...PACK, levels: [{ ...LEVEL, goalArt: '' }] })).toThrow(
      /level 0: goalArt must be a bundle path under \/art\/goal\//,
    );
    expect(() =>
      parsePackJson({ ...PACK, levels: [{ ...LEVEL, goalArt: '/art/sticker/1.webp' }] }),
    ).toThrow(/level 0: goalArt must be a bundle path under \/art\/goal\//);
  });

  it('rejects a non-array bonuses or bonusUnlocks list', () => {
    expect(() => parsePackJson({ ...PACK, bonuses: 'circle' })).toThrow(/bonuses must be an array/);
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

describe('parsePackJson geometry errors', () => {
  it('rejects control points outside the field margin', () => {
    expect(() =>
      parsePackJson({
        ...PACK,
        levels: [
          {
            ...LEVEL,
            strokes: [
              [
                { x: 10, y: 430 },
                { x: 285, y: 430 },
              ],
            ],
          },
        ],
      }),
    ).toThrow(/stroke 0 control point 0 outside field margin/);
    expect(() =>
      parsePackJson({
        ...PACK,
        levels: [
          {
            ...LEVEL,
            strokes: [
              [
                { x: 145, y: 850 },
                { x: 285, y: 430 },
              ],
            ],
          },
        ],
      }),
    ).toThrow(/stroke 0 control point 0 outside field margin/);
  });

  it('rejects a goal outside the field margin', () => {
    expect(() =>
      parsePackJson({ ...PACK, levels: [{ ...LEVEL, goal: { x: 420, y: 430 } }] }),
    ).toThrow(/level 0 \('pre-1'\): goal outside field margin/);
  });

  it('rejects non-finite control points', () => {
    expect(() =>
      parsePackJson({
        ...PACK,
        levels: [
          {
            ...LEVEL,
            strokes: [
              [
                { x: Number.POSITIVE_INFINITY, y: 430 },
                { x: 285, y: 430 },
              ],
            ],
          },
        ],
      }),
    ).toThrow(/stroke 0 point 0 x must be a finite number/);
  });

  it('rejects strokes with fewer than two control points', () => {
    expect(() =>
      parsePackJson({
        ...PACK,
        levels: [{ ...LEVEL, strokes: [[{ x: 145, y: 430 }]] }],
      }),
    ).toThrow(/stroke 0 needs at least 2 control points/);
  });

  it('rejects duplicate consecutive control points', () => {
    expect(() =>
      parsePackJson({
        ...PACK,
        levels: [
          {
            ...LEVEL,
            strokes: [
              [
                { x: 215, y: 430 },
                { x: 215, y: 430 },
                { x: 285, y: 430 },
              ],
            ],
          },
        ],
      }),
    ).toThrow(/stroke 0 duplicate consecutive control point/);
  });

  it('labels problems for bonus levels as bonuses', () => {
    expect(() =>
      parsePackJson({
        ...PACK,
        bonuses: [
          {
            ...LEVEL,
            id: 'pre-bonus-1',
            strokes: [
              [
                { x: 10, y: 10 },
                { x: 285, y: 430 },
              ],
            ],
          },
        ],
        bonusUnlocks: [1],
      }),
    ).toThrow(/bonus level 0 \('pre-bonus-1'\): stroke 0 control point 0 outside field margin/);
  });
});

describe('parsePackJson pack-rule errors', () => {
  const CIRCLE = {
    ...LEVEL,
    id: 'pre-bonus-1',
    stroke: 'circle',
    strokes: [
      [
        { x: 215, y: 430 },
        { x: 285, y: 430 },
        { x: 215, y: 430 },
      ],
    ],
  };

  it('rejects a pack without levels', () => {
    expect(() => parsePackJson({ ...PACK, levels: [] })).toThrow(
      /pack 'pre': Pack pre needs at least one level/,
    );
  });

  it('requires one unlock threshold per bonus', () => {
    const SECOND = { ...CIRCLE, id: 'pre-bonus-2' };
    expect(() => parsePackJson({ ...PACK, bonuses: [CIRCLE, SECOND], bonusUnlocks: [1] })).toThrow(
      /one unlock threshold per bonus/,
    );
  });

  it('requires the final threshold to equal the main level count', () => {
    expect(() => parsePackJson({ ...PACK, bonuses: [CIRCLE], bonusUnlocks: [7] })).toThrow(
      /final bonus unlock \(7\) must equal the level count \(1\)/,
    );
  });

  it('accepts a pack whose bonuses unlock at its level count', () => {
    const pack = parsePackJson({
      ...PACK,
      bonusUnlocks: [1],
      bonuses: [CIRCLE],
    });
    expect(pack.bonuses).toHaveLength(1);
    expect(pack.bonusUnlocks).toEqual([1]);
  });

  it('rejects goalArt paths that traverse outside /art/goal/', () => {
    expect(() =>
      parsePackJson({
        ...PACK,
        levels: [{ ...LEVEL, goalArt: '/art/goal/../priv/secret.webp' }],
      }),
    ).toThrow(/must not traverse/);
  });
});
