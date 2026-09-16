// Storage acquisition and durability helpers: the app must boot and play even
// when the browser denies storage. The real `window.localStorage` is used when
// accessible; otherwise an in-memory fallback keeps the session running
// (progress is simply not persisted). Persistence is requested best-effort.
import type { SaveStorage } from './store';

/** Minimal view of the StorageManager surface behind `navigator.storage`. */
export interface PersistManager {
  persist?: () => Promise<boolean>;
  persisted?: () => Promise<boolean>;
}

/** In-memory `SaveStorage` for sessions where localStorage is inaccessible. */
export function createMemoryStorage(): SaveStorage {
  const data = new Map<string, string>();
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

/** The window's localStorage, or an in-memory fallback when access throws (storage blocked or denied). */
export function acquireSaveStorage(source?: { localStorage: SaveStorage }): SaveStorage {
  try {
    const storage = (source ?? window).localStorage;
    return storage ?? createMemoryStorage();
  } catch {
    return createMemoryStorage();
  }
}

/** Fire-and-forget persistent-storage request; denied, unsupported and rejected outcomes are all ignored. */
export function requestPersistence(manager?: PersistManager): void {
  try {
    const resolved: PersistManager = manager ?? navigator.storage;
    const persist = resolved.persist;
    if (persist === undefined) {
      return;
    }
    const request = (already: boolean): void => {
      if (!already) {
        void persist.call(resolved).catch(() => {});
      }
    };
    const persisted = resolved.persisted;
    if (persisted === undefined) {
      request(false);
      return;
    }
    void persisted
      .call(resolved)
      .then(request)
      .catch(() => {});
  } catch {
    // Storage Manager is optional surface; never let it break boot.
  }
}
