import { describe, expect, it } from 'vitest';
import {
  awardBadge,
  awardPackBadge,
  completeLevel,
  completeNumeral,
  createDefaultSave,
  hasNumeralSticker,
  hasSticker,
  loadSave,
  SAVE_KEY,
  type SaveStorage,
  saveSave,
  setAssistWidened,
  updateSettings,
} from './store';

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

describe('createDefaultSave', () => {
  it('returns a fresh v2 save with empty progress, pack and default settings', () => {
    expect(createDefaultSave()).toEqual({
      assistWidened: false,
      badges: [],
      completedLevels: [],
      pack: { badge: false, cleared: [] },
      settings: { easierTracing: false, muted: false, volume: 1 },
      version: 2,
    });
  });
});

describe('loadSave', () => {
  it('returns the default save when storage is empty', () => {
    expect(loadSave(createMemoryStorage())).toEqual(createDefaultSave());
  });

  it('round-trips a save through the storage key', () => {
    const storage = createMemoryStorage();
    const saved = completeLevel(createDefaultSave(), 'dino-1');
    saveSave(storage, saved);
    expect(storage.getItem(SAVE_KEY)).not.toBeNull();
    expect(loadSave(storage)).toEqual(saved);
  });

  it('returns the default save for corrupt JSON instead of throwing', () => {
    const storage = createMemoryStorage({ [SAVE_KEY]: '{not-json' });
    expect(loadSave(storage)).toEqual(createDefaultSave());
  });

  it('returns the default save for an unknown version', () => {
    const storage = createMemoryStorage({ [SAVE_KEY]: '{"version":99}' });
    expect(loadSave(storage)).toEqual(createDefaultSave());
  });

  it('fills missing fields with defaults on partial shapes', () => {
    const storage = createMemoryStorage({ [SAVE_KEY]: '{"version":1}' });
    expect(loadSave(storage)).toEqual(createDefaultSave());
  });

  it('migrates a v1 save losslessly and adds a fresh pack section', () => {
    const storage = createMemoryStorage({
      [SAVE_KEY]:
        '{"version":1,"assistWidened":true,"badges":["dino"],"completedLevels":["dino-1","dino-2"],"settings":{"easierTracing":true,"muted":true,"volume":0.5}}',
    });
    expect(loadSave(storage)).toEqual({
      assistWidened: true,
      badges: ['dino'],
      completedLevels: ['dino-1', 'dino-2'],
      pack: { badge: false, cleared: [] },
      settings: { easierTracing: true, muted: true, volume: 0.5 },
      version: 2,
    });
  });

  it('defaults the pack section when it is missing from a v2 save', () => {
    const storage = createMemoryStorage({ [SAVE_KEY]: '{"version":2}' });
    expect(loadSave(storage).pack).toEqual({ badge: false, cleared: [] });
  });

  it('sanitizes hostile pack shapes instead of trusting them', () => {
    const storage = createMemoryStorage({
      [SAVE_KEY]: '{"version":2,"pack":{"badge":"yes","cleared":[3,"num-1"]}}',
    });
    expect(loadSave(storage).pack).toEqual({ badge: false, cleared: ['num-1'] });
  });

  it('round-trips v2 pack progress through the storage key', () => {
    const storage = createMemoryStorage();
    const saved = awardPackBadge(completeNumeral(createDefaultSave(), 'num-0'));
    saveSave(storage, saved);
    expect(loadSave(storage)).toEqual(saved);
  });

  it('sanitizes hostile field shapes instead of trusting them', () => {
    const storage = createMemoryStorage({
      [SAVE_KEY]:
        '{"version":1,"completedLevels":["dino-1",7],"badges":"nope","settings":7,"assistWidened":"yes"}',
    });
    expect(loadSave(storage)).toEqual({
      assistWidened: false,
      badges: [],
      completedLevels: ['dino-1'],
      pack: { badge: false, cleared: [] },
      settings: { easierTracing: false, muted: false, volume: 1 },
      version: 2,
    });
  });

  it('returns the default save for valid JSON that is not an object', () => {
    const storage = createMemoryStorage({ [SAVE_KEY]: '5' });
    expect(loadSave(storage)).toEqual(createDefaultSave());
  });

  it('falls back to the default volume when it is mistyped', () => {
    const storage = createMemoryStorage({
      [SAVE_KEY]: '{"version":1,"settings":{"volume":"loud"}}',
    });
    expect(loadSave(storage).settings.volume).toBe(1);
  });

  it('keeps default settings fields that are missing or mistyped', () => {
    const storage = createMemoryStorage({ [SAVE_KEY]: '{"version":1,"settings":{"muted":true}}' });
    expect(loadSave(storage).settings).toEqual({ easierTracing: false, muted: true, volume: 1 });
  });
});

describe('completeLevel', () => {
  it('adds the level id once and is idempotent', () => {
    const once = completeLevel(createDefaultSave(), 'dino-1');
    expect(once.completedLevels).toEqual(['dino-1']);
    expect(completeLevel(once, 'dino-1').completedLevels).toEqual(['dino-1']);
  });

  it('does not mutate the input save', () => {
    const before = createDefaultSave();
    completeLevel(before, 'dino-1');
    expect(before.completedLevels).toEqual([]);
  });
});

describe('hasSticker', () => {
  it('is false before the level is completed and true after', () => {
    const before = createDefaultSave();
    expect(hasSticker(before, 'dino-1')).toBe(false);
    expect(hasSticker(completeLevel(before, 'dino-1'), 'dino-1')).toBe(true);
  });
});

describe('awardBadge', () => {
  it('adds the theme id once and is idempotent', () => {
    const once = awardBadge(createDefaultSave(), 'dino');
    expect(once.badges).toEqual(['dino']);
    expect(awardBadge(once, 'dino').badges).toEqual(['dino']);
  });
});

describe('completeNumeral', () => {
  it('adds the numeral id once, idempotently and without mutation', () => {
    const before = createDefaultSave();
    const once = completeNumeral(before, 'num-4');
    expect(once.pack.cleared).toEqual(['num-4']);
    expect(completeNumeral(once, 'num-4').pack.cleared).toEqual(['num-4']);
    expect(before.pack.cleared).toEqual([]);
  });
});

describe('hasNumeralSticker', () => {
  it('is false before the numeral is cleared and true after', () => {
    const before = createDefaultSave();
    expect(hasNumeralSticker(before, 'num-4')).toBe(false);
    expect(hasNumeralSticker(completeNumeral(before, 'num-4'), 'num-4')).toBe(true);
  });
});

describe('awardPackBadge', () => {
  it('awards the pack badge once and is idempotent', () => {
    expect(awardPackBadge(createDefaultSave()).pack.badge).toBe(true);
    expect(awardPackBadge(awardPackBadge(createDefaultSave())).pack.badge).toBe(true);
  });
});

describe('updateSettings', () => {
  it('merges partial settings over the existing ones', () => {
    const updated = updateSettings(createDefaultSave(), { muted: true });
    expect(updated.settings).toEqual({ easierTracing: false, muted: true, volume: 1 });
  });
});

describe('setAssistWidened', () => {
  it('persists the auto-assist flag through save and load', () => {
    const storage = createMemoryStorage();
    saveSave(storage, setAssistWidened(createDefaultSave(), true));
    expect(loadSave(storage).assistWidened).toBe(true);
  });
});
