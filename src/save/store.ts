// Versioned localStorage persistence for progress and parent settings.
// Stickers are derived: clearing a level awards its sticker, so the sticker
// set is exactly the completed-level set and can never drift out of sync.
export const SAVE_KEY = 'trace-discover-save-v1';
export const SAVE_VERSION = 1;

export interface ParentSettings {
  readonly easierTracing: boolean;
  readonly muted: boolean;
  readonly volume: number;
}

export interface SaveData {
  readonly assistWidened: boolean;
  readonly badges: readonly string[];
  readonly completedLevels: readonly string[];
  readonly settings: ParentSettings;
  readonly version: 1;
}

// Minimal surface so tests can inject an in-memory fake; the real
// window.localStorage satisfies this structurally.
export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function createDefaultSave(): SaveData {
  return {
    assistWidened: false,
    badges: [],
    completedLevels: [],
    settings: { easierTracing: false, muted: false, volume: 1 },
    version: SAVE_VERSION,
  };
}

export function loadSave(storage: SaveStorage): SaveData {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (raw === null) {
      return createDefaultSave();
    }
    return sanitizeSave(JSON.parse(raw));
  } catch {
    return createDefaultSave();
  }
}

export function saveSave(storage: SaveStorage, save: SaveData): void {
  storage.setItem(SAVE_KEY, JSON.stringify(save));
}

export function completeLevel(save: SaveData, levelId: string): SaveData {
  if (save.completedLevels.includes(levelId)) {
    return save;
  }
  return { ...save, completedLevels: [...save.completedLevels, levelId] };
}

export function hasSticker(save: SaveData, levelId: string): boolean {
  return save.completedLevels.includes(levelId);
}

export function awardBadge(save: SaveData, themeId: string): SaveData {
  if (save.badges.includes(themeId)) {
    return save;
  }
  return { ...save, badges: [...save.badges, themeId] };
}

export function updateSettings(save: SaveData, partial: Partial<ParentSettings>): SaveData {
  return { ...save, settings: { ...save.settings, ...partial } };
}

export function setAssistWidened(save: SaveData, widened: boolean): SaveData {
  return { ...save, assistWidened: widened };
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry: unknown): entry is string => typeof entry === 'string');
}

function asVolume(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, value));
}

function asSettings(value: unknown, fallback: ParentSettings): ParentSettings {
  if (typeof value !== 'object' || value === null) {
    return fallback;
  }
  const muted = 'muted' in value && typeof value.muted === 'boolean' ? value.muted : fallback.muted;
  const easierTracing =
    'easierTracing' in value && typeof value.easierTracing === 'boolean'
      ? value.easierTracing
      : fallback.easierTracing;
  const volume = 'volume' in value ? asVolume(value.volume, fallback.volume) : fallback.volume;
  return { easierTracing, muted, volume };
}

function sanitizeSave(parsed: unknown): SaveData {
  const fallback = createDefaultSave();
  if (typeof parsed !== 'object' || parsed === null) {
    return fallback;
  }
  if (!('version' in parsed) || parsed.version !== SAVE_VERSION) {
    return fallback;
  }
  const completedLevels =
    'completedLevels' in parsed ? asStringArray(parsed.completedLevels) : fallback.completedLevels;
  const badges = 'badges' in parsed ? asStringArray(parsed.badges) : fallback.badges;
  const settings =
    'settings' in parsed ? asSettings(parsed.settings, fallback.settings) : fallback.settings;
  const assistWidened =
    'assistWidened' in parsed && typeof parsed.assistWidened === 'boolean'
      ? parsed.assistWidened
      : fallback.assistWidened;
  return { assistWidened, badges, completedLevels, settings, version: SAVE_VERSION };
}
