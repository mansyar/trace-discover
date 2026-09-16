import { describe, expect, it } from 'vitest';
import { menuFallbackStrokes } from './menuArt';

describe('menuFallbackStrokes', () => {
  it('draws "1 2 3" for the numbers pack', () => {
    const sets = menuFallbackStrokes('numbers');
    expect(sets).toHaveLength(3);
    expect(sets.map((strokes) => strokes.length)).toEqual([1, 1, 1]);
  });

  it('draws "A B C" for the letters pack', () => {
    const sets = menuFallbackStrokes('abc');
    expect(sets).toHaveLength(3);
    expect(sets.map((strokes) => strokes.length)).toEqual([3, 3, 1]);
  });

  it('has no fallback stroke art for packs without one', () => {
    expect(menuFallbackStrokes('pre')).toEqual([]);
    expect(menuFallbackStrokes('space')).toEqual([]);
  });
});
