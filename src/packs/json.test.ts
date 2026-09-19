// Pack JSON parser: shape + geometry validation for declarative pack data.
// Shape checks reject unknown keys so authoring typos (e.g. `goals` for
// `goal`) fail loudly instead of silently changing behavior.
// `collectPackProblems` is the non-throwing twin used by the authoring CLI.
import { describe, expect, it } from 'vitest';
import { collectPackProblems, parsePackJson } from './json';

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
    expect(() => parsePackJson({ ...PACK, levels: [{ ...LEVEL, stroke: 'rainbow' }] })).toThrow(
      /level 0: invalid stroke 'rainbow'/,
    );
  });

  it('rejects a level with an empty or missing id', () => {
    const { id: _id, ...withoutId } = LEVEL;
    expect(() => parsePackJson({ ...PACK, levels: [withoutId] })).toThrow(/pack 'pre' is invalid/);
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

describe('parsePackJson stroke-label extension (patterns-pack_20260920)', () => {
  const LABEL_LEVEL = (label: string) => ({
    ...LEVEL,
    id: 'pattern-1',
    stroke: label,
  });

  it('accepts the loop, spiral, and stairs stroke labels', () => {
    for (const label of ['loop', 'spiral', 'stairs']) {
      const pack = parsePackJson({ ...PACK, levels: [LABEL_LEVEL(label)] });
      expect(pack.levels[0]?.stroke, `${label} accepted`).toBe(label);
    }
  });

  it('still rejects labels outside the extended set with the labeled error', () => {
    expect(() => parsePackJson({ ...PACK, levels: [LABEL_LEVEL('rainbow')] })).toThrow(
      /level 0: invalid stroke 'rainbow'/,
    );
    expect(collectPackProblems({ ...PACK, levels: [LABEL_LEVEL('rainbow')] })).toEqual([
      "pack level 0: invalid stroke 'rainbow'",
    ]);
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
    expect(() => parsePackJson({ ...PACK, levels: [] })).toThrow(/needs at least one level/);
  });

  it('requires one unlock threshold per bonus', () => {
    const SECOND = { ...CIRCLE, id: 'pre-bonus-2' };
    expect(() => parsePackJson({ ...PACK, bonuses: [CIRCLE, SECOND], bonusUnlocks: [1] })).toThrow(
      /one unlock threshold per bonus/,
    );
  });

  it('requires the final threshold to equal the main level count', () => {
    expect(() => parsePackJson({ ...PACK, bonuses: [CIRCLE], bonusUnlocks: [7] })).toThrow(
      /bonusUnlocks entry 0 must be an integer within 1\.\.1/,
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

describe('collectPackProblems', () => {
  it('returns an empty list for a well-formed pack', () => {
    expect(collectPackProblems(PACK)).toEqual([]);
  });

  it('reports shape problems as pack-level labels', () => {
    expect(collectPackProblems(null)).toEqual(['pack must be an object']);
    expect(collectPackProblems({ ...PACK, levels2: [] })).toEqual(["unknown pack key 'levels2'"]);
    expect(collectPackProblems({ ...PACK, levels: [{ ...LEVEL, id: '' }] })).toEqual([
      'pack level 0: missing id',
    ]);
  });

  it('reports every geometry problem with its level index and id', () => {
    const badStrokes = [
      {
        ...LEVEL,
        strokes: [
          [
            { x: 10, y: 430 },
            { x: 285, y: 430 },
          ],
        ],
      },
      { ...LEVEL, id: 'pre-2', strokes: [[{ x: 145, y: 430 }]] },
    ];
    expect(collectPackProblems({ ...PACK, levels: badStrokes })).toEqual([
      "pack level 0 ('pre-1'): stroke 0 control point 0 outside field margin",
      "pack level 1 ('pre-2'): stroke 0 needs at least 2 control points",
    ]);
  });

  it('reports traversal, unlock, and rule problems together', () => {
    const problems = collectPackProblems({
      ...PACK,
      levels: [
        { ...LEVEL, goalArt: '/art/goal/../x.webp' },
        { ...LEVEL, id: 'pre-2' },
      ],
      bonuses: [
        {
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
        },
      ],
      bonusUnlocks: [1],
    });
    expect(problems).toEqual([
      "pack level 0 ('pre-1'): goalArt must not traverse outside /art/goal/",
      'pack: final bonus unlock (1) must equal the level count (2)',
    ]);
  });

  it('rejects non-finite bonus unlock values as pack problems', () => {
    expect(collectPackProblems({ ...PACK, bonusUnlocks: [Number.NaN] })).toEqual([
      'bonusUnlocks entry 0 must be a finite number',
    ]);
  });

  it('rejects unlock thresholds that are not integers within the level count', () => {
    expect(collectPackProblems({ ...PACK, bonusUnlocks: [0.5] })).toContain(
      'pack: bonusUnlocks entry 0 must be an integer within 1..1',
    );
    expect(collectPackProblems({ ...PACK, bonusUnlocks: [99] })).toContain(
      'pack: bonusUnlocks entry 0 must be an integer within 1..1',
    );
  });

  it('rejects goalArt paths outside the /art/goal/ prefix', () => {
    expect(
      collectPackProblems({ ...PACK, levels: [{ ...LEVEL, goalArt: '/art/goal-is/1.webp' }] }),
    ).toEqual(['pack level 0: goalArt must be a bundle path under /art/goal/']);
  });
});
