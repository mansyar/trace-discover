import { describe, expect, it } from 'vitest';
import { hopPlanFor } from './runPlan';

describe('run planning', () => {
  it('gives numerals a counted hop plan parsed from the level id', () => {
    const three = hopPlanFor('numbers', 'num-3');
    expect(three?.hops).toHaveLength(3);
    expect(three?.ring).toBe(false);
    expect(hopPlanFor('numbers', 'num-0')?.ring).toBe(true);
  });

  it('gives letters one hop per stroke', () => {
    expect(hopPlanFor('abc', 'abc-c')?.hops).toHaveLength(1);
    expect(hopPlanFor('abc', 'abc-a')?.hops).toHaveLength(3);
    expect(hopPlanFor('abc', 'abc-m')?.hops).toHaveLength(3);
    const e = hopPlanFor('abc', 'abc-e');
    expect(e?.hops).toHaveLength(4);
    expect(e?.ring).toBe(false);
  });

  it('caps letter hops at four (bonus words included)', () => {
    expect(hopPlanFor('abc', 'abc-bonus-1')?.hops).toHaveLength(4); // ABC = 7 strokes
    expect(hopPlanFor('abc', 'abc-bonus-3')?.hops).toHaveLength(3); // ZOO = 3 strokes
  });

  it('keeps every per-stroke hop within the pacing caps', () => {
    const plan = hopPlanFor('abc', 'abc-e');
    expect(plan?.hopMs).toBeGreaterThanOrEqual(150);
    expect(plan?.hopMs).toBeLessThanOrEqual(420);
  });

  it('falls back to the default plan for other packs and unknown letters', () => {
    expect(hopPlanFor('pre', 'pre-1')).toBeUndefined();
    expect(hopPlanFor('abc', 'abc-?')).toBeUndefined();
  });

  it('hops once per glyph stroke for the saved name, capped at four', () => {
    expect(hopPlanFor('name', 'name-1', 12)?.hops).toHaveLength(4);
    expect(hopPlanFor('name', 'name-1', 2)?.hops).toHaveLength(2);
    expect(hopPlanFor('name', 'name-1')).toBeUndefined();
  });

  it('ignores malformed numeral ids', () => {
    expect(hopPlanFor('numbers', 'num-x')).toBeUndefined();
  });
});
