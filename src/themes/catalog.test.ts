import { describe, expect, it } from 'vitest';

import { allThemeIds, nextLevelId, playableLevelIds, themeEntry } from './catalog';

describe('theme catalog', () => {
  it('lists the three v1 themes in menu order', () => {
    expect(allThemeIds()).toEqual(['dino', 'construction', 'animals']);
  });

  it('gives every theme four main levels plus its bonus', () => {
    for (const id of allThemeIds()) {
      const entry = themeEntry(id);
      expect(entry?.mainLevels.map((level) => level.id)).toHaveLength(4);
      expect(entry?.bonus.id).toBe(`${id}-bonus`);
      expect(entry?.theme.character).toMatch(/^[a-z]+$/);
    }
  });

  it('locks the bonus until its theme is complete', () => {
    const entry = themeEntry('dino');
    if (!entry) {
      throw new Error('Dino catalog entry is missing.');
    }
    expect(playableLevelIds(entry, false)).toEqual(['dino-1', 'dino-2', 'dino-3', 'dino-4']);
    expect(playableLevelIds(entry, true)).toEqual([
      'dino-1',
      'dino-2',
      'dino-3',
      'dino-4',
      'dino-bonus',
    ]);
  });

  it('advances within the playable list and wraps around', () => {
    const entry = themeEntry('construction');
    if (!entry) {
      throw new Error('Construction catalog entry is missing.');
    }
    expect(nextLevelId(entry, 'construction-2', false)).toBe('construction-3');
    expect(nextLevelId(entry, 'construction-4', false)).toBe('construction-1');
    expect(nextLevelId(entry, 'construction-4', true)).toBe('construction-bonus');
    expect(nextLevelId(entry, 'construction-bonus', true)).toBe('construction-1');
    expect(nextLevelId(entry, 'nope', false)).toBe('construction-1');
  });

  it('returns undefined for an unknown theme', () => {
    expect(themeEntry('space')).toBeUndefined();
  });
});
