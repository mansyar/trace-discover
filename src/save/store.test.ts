import { describe, expect, it } from 'vitest';
import {
  awardBadge,
  completeLevel,
  createDefaultSave,
  hasSticker,
  loadSave,
  MAX_NAME_LENGTH,
  markStickerIntroSeen,
  SAVE_KEY,
  type SaveStorage,
  sanitizeName,
  saveSave,
  setName,
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
  it('returns a fresh v3 save with empty progress, no trophies and default settings', () => {
    expect(createDefaultSave()).toEqual({
      badges: [],
      completedLevels: [],
      settings: {
        easierTracing: false,
        muted: false,
        parentHintSeen: false,
        skin: 'dino',
        volume: 1,
      },
      trophies: [],
      version: 3,
    });
  });
});

describe('loadSave', () => {
  it('returns the default save when storage is empty', () => {
    expect(loadSave(createMemoryStorage())).toEqual(createDefaultSave());
  });

  it('round-trips a save through the storage key', () => {
    const storage = createMemoryStorage();
    const saved = completeLevel(createDefaultSave(), 'pre-1');
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

  it('migrates a v2 save losslessly: slots, numerals, trophy, badge and settings', () => {
    const storage = createMemoryStorage({
      [SAVE_KEY]: JSON.stringify({
        assistWidened: true,
        badges: ['dino', 'animals', 'mystery'],
        completedLevels: [
          'dino-1',
          'dino-2',
          'dino-3',
          'dino-4',
          'dino-bonus',
          'construction-1',
          'animals-1',
          'animals-2',
          'ghost-9',
        ],
        pack: { badge: true, cleared: ['num-0', 'num-9'] },
        settings: { easierTracing: true, muted: true, volume: 0.5 },
        version: 2,
      }),
    });
    const migrated = loadSave(storage);
    expect(migrated).toEqual({
      badges: ['numbers-badge'],
      completedLevels: [
        'pre-1',
        'pre-2',
        'pre-3',
        'pre-4',
        'pre-bonus-1',
        'pre-5',
        'pre-9',
        'pre-10',
        'num-0',
        'num-9',
      ],
      settings: {
        easierTracing: true,
        muted: true,
        parentHintSeen: false,
        skin: 'dino',
        volume: 0.5,
      },
      trophies: ['dino', 'animals'],
      version: 3,
    });

    // Re-saving the migrated payload round-trips unchanged.
    saveSave(storage, migrated);
    expect(loadSave(storage)).toEqual(migrated);
  });

  it('drops the write-only assistWidened field and the v2 pack section', () => {
    const storage = createMemoryStorage({
      [SAVE_KEY]: '{"version":2,"assistWidened":true,"pack":{"badge":false,"cleared":[]}}',
    });
    const migrated = loadSave(storage);
    expect('assistWidened' in migrated).toBe(false);
    expect('pack' in migrated).toBe(false);
  });

  it('sanitizes hostile pack shapes instead of trusting them', () => {
    const storage = createMemoryStorage({
      [SAVE_KEY]: '{"version":2,"pack":{"badge":"yes","cleared":[3,"num-1"]}}',
    });
    const migrated = loadSave(storage);
    expect(migrated.completedLevels).toEqual(['num-1']);
    expect(migrated.badges).toEqual([]);
  });

  it('keeps a valid skin choice and falls back on unknown ones', () => {
    const valid = createMemoryStorage({
      [SAVE_KEY]: '{"version":3,"settings":{"skin":"star"}}',
    });
    expect(loadSave(valid).settings.skin).toBe('star');
    const teddy = createMemoryStorage({
      [SAVE_KEY]: '{"version":3,"settings":{"skin":"teddy"}}',
    });
    expect(loadSave(teddy).settings.skin).toBe('teddy');
    const invalid = createMemoryStorage({
      [SAVE_KEY]: '{"version":3,"settings":{"skin":"unicorn"}}',
    });
    expect(loadSave(invalid).settings.skin).toBe('dino');
  });

  it('sanitizes hostile field shapes instead of trusting them', () => {
    const storage = createMemoryStorage({
      [SAVE_KEY]:
        '{"version":1,"completedLevels":["dino-1",7],"badges":"nope","settings":7,"assistWidened":"yes"}',
    });
    expect(loadSave(storage)).toEqual({
      badges: [],
      completedLevels: ['pre-1'],
      settings: {
        easierTracing: false,
        muted: false,
        parentHintSeen: false,
        skin: 'dino',
        volume: 1,
      },
      trophies: [],
      version: 3,
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
    expect(loadSave(storage).settings).toEqual({
      easierTracing: false,
      muted: true,
      parentHintSeen: false,
      skin: 'dino',
      volume: 1,
    });
  });
});

describe('completeLevel', () => {
  it('adds the level id once and is idempotent', () => {
    const once = completeLevel(createDefaultSave(), 'pre-1');
    expect(once.completedLevels).toEqual(['pre-1']);
    expect(completeLevel(once, 'pre-1').completedLevels).toEqual(['pre-1']);
  });

  it('does not mutate the input save', () => {
    const before = createDefaultSave();
    completeLevel(before, 'pre-1');
    expect(before.completedLevels).toEqual([]);
  });
});

describe('hasSticker', () => {
  it('is false before the level is completed and true after', () => {
    const before = createDefaultSave();
    expect(hasSticker(before, 'pre-1')).toBe(false);
    expect(hasSticker(completeLevel(before, 'pre-1'), 'pre-1')).toBe(true);
  });
});

describe('awardBadge', () => {
  it('adds the pack badge id once and is idempotent', () => {
    const once = awardBadge(createDefaultSave(), 'pre-badge');
    expect(once.badges).toEqual(['pre-badge']);
    expect(awardBadge(once, 'pre-badge').badges).toEqual(['pre-badge']);
  });
});

describe('updateSettings', () => {
  it('merges partial settings over the existing ones', () => {
    const updated = updateSettings(createDefaultSave(), { muted: true });
    expect(updated.settings).toEqual({
      easierTracing: false,
      muted: true,
      parentHintSeen: false,
      skin: 'dino',
      volume: 1,
    });
  });
});

describe('v1 fixture migration', () => {
  it('upgrades a real v1 save onto pre-writing slots with trophies intact', () => {
    // A save as the shipped v1 app wrote it: dino cleared end to end (badge
    // plus bonus), one construction level, two animals levels, tuned settings.
    const fixture = {
      assistWidened: true,
      badges: ['dino'],
      completedLevels: [
        'dino-1',
        'dino-2',
        'dino-3',
        'dino-4',
        'dino-bonus',
        'construction-1',
        'animals-1',
        'animals-2',
      ],
      settings: { easierTracing: true, muted: false, volume: 0.7 },
      version: 1,
    };
    const storage = createMemoryStorage({
      'trace-discover-save-v1': JSON.stringify(fixture),
    });

    const migrated = loadSave(storage);

    expect(migrated).toEqual({
      badges: [],
      completedLevels: [
        'pre-1',
        'pre-2',
        'pre-3',
        'pre-4',
        'pre-bonus-1',
        'pre-5',
        'pre-9',
        'pre-10',
      ],
      settings: {
        easierTracing: true,
        muted: false,
        parentHintSeen: false,
        skin: 'dino',
        volume: 0.7,
      },
      trophies: ['dino'],
      version: 3,
    });

    // Re-saving the migrated payload round-trips unchanged.
    saveSave(storage, migrated);
    expect(loadSave(storage)).toEqual(migrated);
  });
});

describe('saveSave durability', () => {
  it('never throws when the storage write fails (quota exceeded)', () => {
    const storage: SaveStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(() => saveSave(storage, createDefaultSave())).not.toThrow();
  });

  it('persists on a later attempt once storage recovers', () => {
    let failing = true;
    const data = new Map<string, string>();
    const storage: SaveStorage = {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => {
        if (failing) {
          throw new Error('QuotaExceededError');
        }
        data.set(key, value);
      },
    };
    const save = completeLevel(createDefaultSave(), 'pre-1');
    saveSave(storage, save);
    expect(loadSave(storage)).toEqual(createDefaultSave());
    failing = false;
    saveSave(storage, save);
    expect(loadSave(storage)).toEqual(save);
  });
});

describe('sanitizeName', () => {
  it('uppercases and strips everything that is not A-Z', () => {
    expect(sanitizeName('Aira')).toBe('AIRA');
    expect(sanitizeName('a i-r a!')).toBe('AIRA');
    expect(sanitizeName('  ava  ')).toBe('AVA');
  });

  it('drops digits and accented letters instead of trusting them', () => {
    expect(sanitizeName('R2D2')).toBe('RD');
    expect(sanitizeName('Zoé')).toBe('ZO');
  });

  it('clamps to MAX_NAME_LENGTH letters', () => {
    expect(MAX_NAME_LENGTH).toBe(7);
    expect(sanitizeName('ABCDEFGHIJ')).toBe('ABCDEFG');
  });

  it('rejects anything with fewer than two letters', () => {
    expect(sanitizeName('')).toBe('');
    expect(sanitizeName('A')).toBe('');
    expect(sanitizeName('1 2 3')).toBe('');
  });
});

describe('name persistence', () => {
  it('sets, round-trips, and clears the name through storage', () => {
    const storage = createMemoryStorage();
    const saved = setName(createDefaultSave(), 'aira');
    expect(saved.name).toBe('AIRA');
    saveSave(storage, saved);
    expect(loadSave(storage)).toEqual(saved);
    const cleared = setName(saved, '');
    expect(cleared.name).toBeUndefined();
    saveSave(storage, cleared);
    expect(loadSave(storage).name).toBeUndefined();
  });

  it('sanitizes hostile stored names and drops invalid ones on load', () => {
    const mistyped = createMemoryStorage({ [SAVE_KEY]: '{"version":3,"name":123}' });
    expect(loadSave(mistyped).name).toBeUndefined();
    const short = createMemoryStorage({ [SAVE_KEY]: '{"version":3,"name":"A"}' });
    expect(loadSave(short).name).toBeUndefined();
    const messy = createMemoryStorage({ [SAVE_KEY]: '{"version":3,"name":"a i r a"}' });
    expect(loadSave(messy).name).toBe('AIRA');
  });

  it('keeps saves without a name absent-safe', () => {
    const storage = createMemoryStorage({ [SAVE_KEY]: '{"version":3,"badges":[]}' });
    expect(loadSave(storage).name).toBeUndefined();
  });
});

describe('sticker intro flag', () => {
  it('treats absent, false, and non-boolean stored values as not seen', () => {
    const absent = createMemoryStorage({ [SAVE_KEY]: '{"version":3,"badges":[]}' });
    expect(loadSave(absent).stickerIntroSeen).toBeUndefined();
    const falsy = createMemoryStorage({ [SAVE_KEY]: '{"version":3,"stickerIntroSeen":false}' });
    expect(loadSave(falsy).stickerIntroSeen).toBeUndefined();
    const hostile = createMemoryStorage({ [SAVE_KEY]: '{"version":3,"stickerIntroSeen":"yes"}' });
    expect(loadSave(hostile).stickerIntroSeen).toBeUndefined();
  });

  it('loads a stored true flag and round-trips it through storage', () => {
    const storage = createMemoryStorage();
    const marked = markStickerIntroSeen(createDefaultSave());
    expect(marked.stickerIntroSeen).toBe(true);
    saveSave(storage, marked);
    expect(loadSave(storage)).toEqual(marked);
  });

  it('is idempotent and does not mutate the input save', () => {
    const before = createDefaultSave();
    const marked = markStickerIntroSeen(before);
    expect(markStickerIntroSeen(marked)).toBe(marked);
    expect(before.stickerIntroSeen).toBeUndefined();
  });

  it('never leaks the flag into legacy migrations', () => {
    const storage = createMemoryStorage({
      [SAVE_KEY]: '{"version":2,"completedLevels":["dino-1"]}',
    });
    expect('stickerIntroSeen' in loadSave(storage)).toBe(false);
  });
});

describe('parentHintSeen persistence', () => {
  it('defaults to false and round-trips true through storage', () => {
    expect(createDefaultSave().settings.parentHintSeen).toBe(false);
    const storage = createMemoryStorage();
    const seen = updateSettings(createDefaultSave(), { parentHintSeen: true });
    saveSave(storage, seen);
    expect(loadSave(storage).settings.parentHintSeen).toBe(true);
  });

  it('falls back to false for missing or mistyped values', () => {
    const absent = createMemoryStorage({ [SAVE_KEY]: '{"version":3,"settings":{}}' });
    expect(loadSave(absent).settings.parentHintSeen).toBe(false);
    const mistyped = createMemoryStorage({
      [SAVE_KEY]: '{"version":3,"settings":{"parentHintSeen":"yes"}}',
    });
    expect(loadSave(mistyped).settings.parentHintSeen).toBe(false);
    const numeric = createMemoryStorage({
      [SAVE_KEY]: '{"version":3,"settings":{"parentHintSeen":1}}',
    });
    expect(loadSave(numeric).settings.parentHintSeen).toBe(false);
  });
});
