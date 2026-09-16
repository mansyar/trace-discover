import { describe, expect, it } from 'vitest';

import { allPacks, packById } from './catalog';
import { LETTERS_PACK } from './letters';
import { NUMBERS_PACK } from './numbers';
import { PRE_PACK } from './pre';

describe('pack catalog', () => {
  it('lists packs in menu order: pre-writing, numbers, letters', () => {
    expect(allPacks().map((pack) => pack.id)).toEqual(['pre', 'numbers', 'abc']);
  });

  it('looks up packs by id', () => {
    expect(packById('pre')).toBe(PRE_PACK);
    expect(packById('numbers')).toBe(NUMBERS_PACK);
    expect(packById('abc')).toBe(LETTERS_PACK);
    expect(packById('nope')).toBeUndefined();
  });

  it('keeps pack ids and level ids unique across the catalog', () => {
    const packIds = allPacks().map((pack) => pack.id);
    expect(new Set(packIds).size).toBe(packIds.length);
    const levelIds = allPacks()
      .flatMap((pack) => [...pack.bonuses, ...pack.levels])
      .map((level) => level.id);
    expect(new Set(levelIds).size).toBe(levelIds.length);
  });

  it('packs the ten numerals with their badge and no circles', () => {
    expect(NUMBERS_PACK.levels.map((level) => level.id)).toEqual([
      'num-0',
      'num-1',
      'num-2',
      'num-3',
      'num-4',
      'num-5',
      'num-6',
      'num-7',
      'num-8',
      'num-9',
    ]);
    expect(NUMBERS_PACK.badgeId).toBe('numbers-badge');
    expect(NUMBERS_PACK.bonuses).toEqual([]);
    expect(NUMBERS_PACK.bonusUnlocks).toEqual([]);
  });

  it('packs pre-writing as twelve slots plus three circles', () => {
    expect(PRE_PACK.badgeId).toBe('pre-badge');
    expect(PRE_PACK.levels).toHaveLength(12);
    expect(PRE_PACK.bonuses).toHaveLength(3);
  });

  it('packs the twenty-six letters with three sequence bonuses', () => {
    expect(LETTERS_PACK.badgeId).toBe('abc-badge');
    expect(LETTERS_PACK.levels).toHaveLength(26);
    expect(LETTERS_PACK.bonuses.map((level) => level.id)).toEqual([
      'abc-bonus-1',
      'abc-bonus-2',
      'abc-bonus-3',
    ]);
    expect(LETTERS_PACK.bonusUnlocks).toEqual([9, 18, 26]);
  });
});
