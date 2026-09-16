// Versioned localStorage persistence for progress and parent settings.
// Stickers are derived: clearing a level awards its sticker, so the sticker
// set is exactly the completed-level set and can never drift out of sync.
// v3 unifies progress across packs (`completedLevels`), keeps pack badges in
// `badges`, stores superseded world badges as display-only `trophies`, and
// carries the active skin in settings. v1/v2 saves migrate losslessly: world
// ids become pre-writing slots (`dino-N` -> `pre-N`, construction +4,
// animals +8, bonuses in world order) and numerals move into the same
// completed list. The storage key keeps its original slot name; the payload
// `version` field drives schema upgrades.
import { skinById } from '../skins/skins';

export const SAVE_KEY = 'trace-discover-save-v1';
export const SAVE_VERSION = 3;

/** Longest accepted name; device tuning may lower it (floor 5). */
export const MAX_NAME_LENGTH = 7;

export interface ParentSettings {
  readonly easierTracing: boolean;
  readonly muted: boolean;
  readonly parentHintSeen: boolean;
  readonly skin: string;
  readonly volume: number;
}

export interface SaveData {
  readonly badges: readonly string[];
  readonly completedLevels: readonly string[];
  /** Parent-set child name: uppercase A–Z, 2–MAX_NAME_LENGTH letters. Absent = no name. */
  readonly name?: string;
  readonly settings: ParentSettings;
  readonly trophies: readonly string[];
  readonly version: 3;
}

// Minimal surface so tests can inject an in-memory fake; the real
// window.localStorage satisfies this structurally.
export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Default skin for fresh saves (first entry of the skin registry). */
const DEFAULT_SKIN = 'dino';

// Legacy worlds: v1/v2 level ids and badges mapped onto the unified v3 model.
const LEGACY_BONUS_SLOTS: Record<string, string> = {
  'animals-bonus': 'pre-bonus-3',
  'construction-bonus': 'pre-bonus-2',
  'dino-bonus': 'pre-bonus-1',
};
const LEGACY_SLOT_OFFSETS: Record<string, number> = {
  animals: 8,
  construction: 4,
  dino: 0,
};
const LEGACY_THEME_IDS = new Set(['animals', 'construction', 'dino']);

export function createDefaultSave(): SaveData {
  return {
    badges: [],
    completedLevels: [],
    settings: {
      easierTracing: false,
      muted: false,
      parentHintSeen: false,
      skin: DEFAULT_SKIN,
      volume: 1,
    },
    trophies: [],
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
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Storage can fail (quota exceeded, denied, unavailable). The session
    // continues in memory; later writes retry and persist once it recovers.
  }
}

/**
 * Normalizes parent-entered names: uppercased, A-Z only, clamped to
 * MAX_NAME_LENGTH. Returns '' when fewer than two letters survive — callers
 * treat '' as "no name".
 */
export function sanitizeName(raw: string): string {
  const name = raw
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, MAX_NAME_LENGTH);
  return name.length >= 2 ? name : '';
}

/** Applies a (possibly invalid/empty) name; '' clears it. */
export function setName(save: SaveData, raw: string): SaveData {
  const name = sanitizeName(raw);
  return { ...save, name: name === '' ? undefined : name };
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

export function awardBadge(save: SaveData, badgeId: string): SaveData {
  if (save.badges.includes(badgeId)) {
    return save;
  }
  return { ...save, badges: [...save.badges, badgeId] };
}

export function updateSettings(save: SaveData, partial: Partial<ParentSettings>): SaveData {
  return { ...save, settings: { ...save.settings, ...partial } };
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
  const parentHintSeen =
    'parentHintSeen' in value && typeof value.parentHintSeen === 'boolean'
      ? value.parentHintSeen
      : fallback.parentHintSeen;
  const easierTracing =
    'easierTracing' in value && typeof value.easierTracing === 'boolean'
      ? value.easierTracing
      : fallback.easierTracing;
  const skin =
    'skin' in value && typeof value.skin === 'string' && skinById(value.skin) !== undefined
      ? value.skin
      : fallback.skin;
  const volume = 'volume' in value ? asVolume(value.volume, fallback.volume) : fallback.volume;
  return { easierTracing, muted, parentHintSeen, skin, volume };
}

function asClearedList(value: unknown): string[] {
  if (typeof value !== 'object' || value === null) {
    return [];
  }
  return 'cleared' in value ? asStringArray(value.cleared) : [];
}

function asPackBadgeEarned(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return 'badge' in value && typeof value.badge === 'boolean' ? value.badge : false;
}

/** `dino-1` -> `pre-1`, `construction-1` -> `pre-5`, `dino-bonus` -> `pre-bonus-1`; unknown ids drop. */
function migrateLevelId(id: string): string | null {
  if (id.startsWith('pre-') || id.startsWith('num-')) {
    return id;
  }
  const bonusSlot = LEGACY_BONUS_SLOTS[id];
  if (bonusSlot !== undefined) {
    return bonusSlot;
  }
  const slot = /^(dino|construction|animals)-([1-4])$/.exec(id);
  const theme = slot?.[1];
  const index = slot?.[2];
  if (theme !== undefined && index !== undefined) {
    const offset = LEGACY_SLOT_OFFSETS[theme];
    if (offset !== undefined) {
      return `pre-${offset + Number(index)}`;
    }
  }
  return null;
}

function migrateLevelIds(ids: readonly string[]): string[] {
  const migrated: string[] = [];
  for (const id of ids) {
    const mapped = migrateLevelId(id);
    if (mapped !== null) {
      migrated.push(mapped);
    }
  }
  return migrated;
}

/** v1/v2 -> v3: world slots merge with numerals, world badges become trophies. */
function migrateLegacySave(parsed: object, settings: ParentSettings): SaveData {
  const levels = 'completedLevels' in parsed ? asStringArray(parsed.completedLevels) : [];
  const pack = 'pack' in parsed ? parsed.pack : undefined;
  const badges = 'badges' in parsed ? asStringArray(parsed.badges) : [];
  return {
    // Migration literals are historical wire formats: 'numbers-badge' is the
    // exact id v2 wrote, so it must not be re-pointed at the live registry.
    badges: asPackBadgeEarned(pack) ? ['numbers-badge'] : [],
    completedLevels: [...migrateLevelIds(levels), ...migrateLevelIds(asClearedList(pack))],
    settings,
    trophies: badges.filter((id) => LEGACY_THEME_IDS.has(id)),
    version: SAVE_VERSION,
  };
}

function sanitizeSave(parsed: unknown): SaveData {
  const fallback = createDefaultSave();
  if (typeof parsed !== 'object' || parsed === null) {
    return fallback;
  }
  if (!('version' in parsed)) {
    return fallback;
  }
  const version: unknown = parsed.version;
  if (version !== 1 && version !== 2 && version !== SAVE_VERSION) {
    return fallback;
  }
  const settings =
    'settings' in parsed ? asSettings(parsed.settings, fallback.settings) : fallback.settings;
  if (version === SAVE_VERSION) {
    const name =
      'name' in parsed && typeof parsed.name === 'string' ? sanitizeName(parsed.name) : '';
    return {
      badges: 'badges' in parsed ? asStringArray(parsed.badges) : fallback.badges,
      completedLevels:
        'completedLevels' in parsed
          ? asStringArray(parsed.completedLevels)
          : fallback.completedLevels,
      ...(name === '' ? {} : { name }),
      settings,
      trophies: 'trophies' in parsed ? asStringArray(parsed.trophies) : fallback.trophies,
      version: SAVE_VERSION,
    };
  }
  return migrateLegacySave(parsed, settings);
}
