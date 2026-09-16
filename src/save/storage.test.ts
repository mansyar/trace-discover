import { describe, expect, it, vi } from 'vitest';
import { acquireSaveStorage, createMemoryStorage, requestPersistence } from './storage';
import { SAVE_KEY } from './store';

const flush = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

describe('createMemoryStorage', () => {
  it('stores values in memory like a SaveStorage', () => {
    const storage = createMemoryStorage();
    expect(storage.getItem(SAVE_KEY)).toBeNull();
    storage.setItem(SAVE_KEY, '{"version":3}');
    expect(storage.getItem(SAVE_KEY)).toBe('{"version":3}');
  });
});

describe('acquireSaveStorage', () => {
  it('returns the real storage when accessible', () => {
    const storage = createMemoryStorage();
    expect(acquireSaveStorage({ localStorage: storage })).toBe(storage);
  });

  it('falls back to memory when localStorage access throws', () => {
    const denied = {
      get localStorage(): never {
        throw new Error('SecurityError');
      },
    };
    const storage = acquireSaveStorage(denied);
    storage.setItem(SAVE_KEY, 'kept');
    expect(storage.getItem(SAVE_KEY)).toBe('kept');
  });

  it('falls back to memory without a source (non-browser contexts)', () => {
    const storage = acquireSaveStorage();
    storage.setItem(SAVE_KEY, 'x');
    expect(storage.getItem(SAVE_KEY)).toBe('x');
  });
});

describe('requestPersistence', () => {
  it('requests persistence once when available and not already persisted', async () => {
    const persist = vi.fn(async () => true);
    const persisted = vi.fn(async () => false);
    requestPersistence({ persist, persisted });
    await flush();
    expect(persisted).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('skips the request when storage is already persisted', async () => {
    const persist = vi.fn(async () => true);
    requestPersistence({ persist, persisted: async () => true });
    await flush();
    expect(persist).not.toHaveBeenCalled();
  });

  it('requests persistence when persisted() is unavailable', async () => {
    const persist = vi.fn(async () => true);
    requestPersistence({ persist });
    await flush();
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('is a silent no-op when persist() is unavailable', () => {
    expect(() => requestPersistence({})).not.toThrow();
  });

  it('ignores a rejecting persist() request', async () => {
    const persist = vi.fn(async () => {
      throw new Error('denied');
    });
    requestPersistence({ persist });
    await flush();
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('ignores a rejecting persisted() check', async () => {
    const persist = vi.fn(async () => true);
    requestPersistence({
      persist,
      persisted: async () => {
        throw new Error('denied');
      },
    });
    await flush();
    expect(persist).not.toHaveBeenCalled();
  });

  it('survives a throwing StorageManager accessor', () => {
    const throwing = {
      get persist(): never {
        throw new Error('nope');
      },
    };
    expect(() => requestPersistence(throwing)).not.toThrow();
  });
});
