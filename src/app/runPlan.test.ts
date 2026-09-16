import { describe, expect, it } from 'vitest';
import { hopPlanFor } from './runPlan';

describe('run planning', () => {
  it('gives numerals a counted hop plan parsed from the level id', () => {
    const three = hopPlanFor('numbers', 'num-3');
    expect(three?.hops).toHaveLength(3);
    expect(three?.ring).toBe(false);
    expect(hopPlanFor('numbers', 'num-0')?.ring).toBe(true);
  });

  it('falls back to the default plan for every other pack', () => {
    expect(hopPlanFor('pre', 'pre-1')).toBeUndefined();
    expect(hopPlanFor('abc', 'abc-a')).toBeUndefined();
  });

  it('ignores malformed numeral ids', () => {
    expect(hopPlanFor('numbers', 'num-x')).toBeUndefined();
  });
});
