import { describe, expect, it } from 'vitest';
import {
  awardBadge,
  completeLevel,
  createDefaultSave,
  loadSave,
  type SaveStorage,
  saveSave,
} from '../save/store';
import {
  bonusLevelId,
  completedCount,
  isBonusOpen,
  isThemeComplete,
  shouldAwardBadge,
} from './progress';

const LEVELS = ['dino-1', 'dino-2', 'dino-3', 'dino-4'];

function createMemoryStorage(initial: Record<string, string> = {}): SaveStorage {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    getItem(key: string): string | null {
      const value = data.get(key);
      return value === undefined ? null : value;
    },
    setItem(key: string, value: string): void {
      data.set(key, value);
    },
  };
}

function completeAll(): ReturnType<typeof createDefaultSave> {
  return LEVELS.reduce(completeLevel, createDefaultSave());
}

describe('completedCount', () => {
  it('counts only the given theme levels', () => {
    const save = completeLevel(completeLevel(createDefaultSave(), 'dino-1'), 'construction-1');
    expect(completedCount(save, LEVELS)).toBe(1);
  });
});

describe('isThemeComplete', () => {
  it('is false at three stickers and true at four', () => {
    const three = LEVELS.slice(0, 3).reduce(completeLevel, createDefaultSave());
    expect(isThemeComplete(three, LEVELS)).toBe(false);
    expect(isThemeComplete(completeAll(), LEVELS)).toBe(true);
  });
});

describe('shouldAwardBadge', () => {
  it('is true only for a fresh badge on a complete theme', () => {
    expect(shouldAwardBadge(createDefaultSave(), 'dino', LEVELS)).toBe(false);
    const complete = completeAll();
    expect(shouldAwardBadge(complete, 'dino', LEVELS)).toBe(true);
    expect(shouldAwardBadge(awardBadge(complete, 'dino'), 'dino', LEVELS)).toBe(false);
  });
});

describe('isBonusOpen', () => {
  it('opens only once the badge is earned', () => {
    expect(isBonusOpen(createDefaultSave(), 'dino', LEVELS)).toBe(false);
    expect(isBonusOpen(completeAll(), 'dino', LEVELS)).toBe(false);
    expect(isBonusOpen(awardBadge(completeAll(), 'dino'), 'dino', LEVELS)).toBe(true);
  });
});

describe('bonusLevelId', () => {
  it('names the bonus level after its theme', () => {
    expect(bonusLevelId('dino')).toBe('dino-bonus');
  });
});

describe('badge flow', () => {
  it('runs the full celebration chain through save and load', () => {
    const storage = createMemoryStorage();
    saveSave(storage, completeAll());
    const loaded = loadSave(storage);
    expect(isThemeComplete(loaded, LEVELS)).toBe(true);
    expect(shouldAwardBadge(loaded, 'dino', LEVELS)).toBe(true);
    saveSave(storage, awardBadge(loaded, 'dino'));
    const badged = loadSave(storage);
    expect(shouldAwardBadge(badged, 'dino', LEVELS)).toBe(false);
    expect(isBonusOpen(badged, 'dino', LEVELS)).toBe(true);
  });
});
