import { describe, expect, it, vi } from 'vitest';
import {
  CONTENT_ASSET_URLS,
  classifyAssetPath,
  createBrowserContentCacheStore,
  scheduleContentWarmup,
  warmContentAssets,
  type ContentWarmupProgress,
} from './contentCache';

const SHIPPED_CONTENT_KEYS = [
  ...Object.keys(import.meta.glob('/public/art/**/*')),
  ...Object.keys(import.meta.glob('/public/rive/*.riv')),
]
  .map((key) => key.replace(/^\/public/, ''))
  .sort();

function memoryStore(initial: readonly string[] = []) {
  const cached = new Set(initial);
  const has = vi.fn(async (url: string) => cached.has(url));
  const add = vi.fn(async (url: string) => {
    cached.add(url);
  });
  return { cached, has, add };
}

function progressReporter() {
  const reports: ContentWarmupProgress[] = [];
  return { reports, onProgress: (progress: ContentWarmupProgress) => reports.push(progress) };
}

describe('content cache contract', () => {
  it('classifies boot-critical and content paths explicitly', () => {
    expect(classifyAssetPath('/index.html')).toBe('critical');
    expect(classifyAssetPath('/assets/index-abc123.js')).toBe('critical');
    expect(classifyAssetPath('/assets/index-abc123.css')).toBe('critical');
    expect(classifyAssetPath('/assets/rive-abc123.wasm')).toBe('critical');
    expect(classifyAssetPath('/manifest.webmanifest')).toBe('critical');
    expect(classifyAssetPath('/icons/icon-192.png')).toBe('critical');
    expect(classifyAssetPath('/art/goal/pre-1.webp')).toBe('content');
    expect(classifyAssetPath('/rive/dino.riv')).toBe('content');
    expect(classifyAssetPath('/unknown/file.txt')).toBe('unclassified');
  });

  it('keeps the content inventory complete and duplicate-free', () => {
    expect(CONTENT_ASSET_URLS).toEqual(SHIPPED_CONTENT_KEYS);
    expect(new Set(CONTENT_ASSET_URLS).size).toBe(CONTENT_ASSET_URLS.length);
  });

  it('skips already cached content and deduplicates requested URLs', async () => {
    const store = memoryStore(['/art/goal/pre-1.webp']);

    const result = await warmContentAssets(
      ['/art/goal/pre-1.webp', '/art/goal/pre-1.webp', '/rive/dino.riv'],
      store,
    );

    expect(result).toEqual({
      cached: ['/rive/dino.riv'],
      complete: true,
      failed: [],
    });
    expect(store.has).toHaveBeenCalledTimes(2);
    expect(store.add).toHaveBeenCalledTimes(1);
  });

  it('creates a Cache API store with idempotent has/add operations', async () => {
    const cached = new Set<string>();
    const cache = {
      add: vi.fn(async (url: string) => {
        cached.add(url);
      }),
      match: vi.fn(async (url: string) => (cached.has(url) ? { url } : undefined)),
    };
    const storage = { open: vi.fn().mockResolvedValue(cache) };
    const store = createBrowserContentCacheStore(storage as unknown as CacheStorage);

    expect(await store.has('/art/goal/pre-1.webp')).toBe(false);
    await store.add('/art/goal/pre-1.webp');
    expect(await store.has('/art/goal/pre-1.webp')).toBe(true);
    expect(storage.open).toHaveBeenCalledWith('trace-discover-content-v1');
  });

  it('schedules warm-up only when online and does not run without an online signal', async () => {
    const store = memoryStore();
    const schedule = vi.fn((task: () => void) => task());
    const offlineSchedule = vi.fn((task: () => void) => task());

    scheduleContentWarmup({
      isOnline: () => false,
      schedule: offlineSchedule,
      store,
      urls: ['/art/goal/pre-1.webp'],
    });
    expect(offlineSchedule).not.toHaveBeenCalled();

    scheduleContentWarmup({
      isOnline: () => true,
      schedule,
      store,
      urls: ['/art/goal/pre-1.webp'],
    });
    await Promise.resolve();
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(store.add).toHaveBeenCalledWith('/art/goal/pre-1.webp');
  });

  it('continues after a partial failure and can recover on a later warm-up', async () => {
    let failOnce = true;
    const store = memoryStore();
    store.add.mockImplementation(async (url: string) => {
      if (url === '/art/goal/pre-1.webp' && failOnce) {
        throw new Error('temporary network failure');
      }
      store.cached.add(url);
    });

    const first = await warmContentAssets(['/art/goal/pre-1.webp', '/rive/dino.riv'], store, {
      retryDelayMs: () => 0,
    });
    failOnce = false;
    const second = await warmContentAssets(['/art/goal/pre-1.webp', '/rive/dino.riv'], store);

    expect(first).toEqual({
      cached: ['/rive/dino.riv'],
      complete: false,
      failed: ['/art/goal/pre-1.webp'],
    });
    expect(second).toEqual({
      cached: ['/art/goal/pre-1.webp'],
      complete: true,
      failed: [],
    });
  });
});

describe('content warm-up progress', () => {
  it('reports one resolution per asset, counting already cached assets as resolved', async () => {
    const store = memoryStore(['/art/goal/pre-1.webp']);
    const progress = progressReporter();

    await warmContentAssets(
      ['/art/goal/pre-1.webp', '/rive/dino.riv', '/art/sticker/pre-1.webp'],
      store,
      { onProgress: progress.onProgress },
    );

    expect(progress.reports.map((report) => report.resolved)).toEqual([1, 2, 3]);
    expect(progress.reports.map((report) => report.total)).toEqual([3, 3, 3]);
    expect(store.has).toHaveBeenCalledWith('/art/goal/pre-1.webp');
  });

  it('reports a single empty resolution for an empty inventory', async () => {
    const store = memoryStore();
    const progress = progressReporter();

    await warmContentAssets([], store, { onProgress: progress.onProgress });

    expect(progress.reports).toEqual([{ resolved: 0, total: 0 }]);
    expect(store.add).not.toHaveBeenCalled();
  });

  it('never exceeds the inventory size or repeats a resolution', async () => {
    const store = memoryStore();
    store.add.mockImplementation(async (url: string) => {
      if (url.includes('unreachable')) {
        throw new Error('offline');
      }
      store.cached.add(url);
    });
    const progress = progressReporter();

    await warmContentAssets(['/art/goal/pre-1.webp', '/art/unreachable.webp'], store, {
      onProgress: progress.onProgress,
      retryDelayMs: () => 0,
    });

    const resolved = progress.reports.map((report) => report.resolved);
    expect(resolved).toEqual([...resolved].sort((left, right) => left - right));
    expect(new Set(resolved).size).toBe(resolved.length);
    expect(Math.max(...resolved)).toBe(2);
    expect(progress.reports.at(-1)).toEqual({ resolved: 2, total: 2 });
  });

  it('warms without a reporter', async () => {
    const store = memoryStore();

    const result = await warmContentAssets(['/rive/dino.riv'], store);

    expect(result).toEqual({ cached: ['/rive/dino.riv'], complete: true, failed: [] });
  });
});

describe('content warm-up retry and concurrency', () => {
  const MANY = Array.from({ length: 12 }, (_unused, index) => `/art/goal/level-${index}.webp`);

  it('never exceeds the configured concurrency while still overlapping work', async () => {
    const store = memoryStore();
    let inFlight = 0;
    let peak = 0;
    store.add.mockImplementation(async (url: string) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await Promise.resolve();
      await Promise.resolve();
      inFlight -= 1;
      store.cached.add(url);
    });

    const result = await warmContentAssets(MANY, store, { concurrency: 3 });

    expect(peak).toBeLessThanOrEqual(3);
    expect(peak).toBeGreaterThan(1);
    expect(store.add).toHaveBeenCalledTimes(MANY.length);
    expect(result.complete).toBe(true);
  });

  it('retries a transient failure and retains the eventual success', async () => {
    const store = memoryStore();
    let attempts = 0;
    store.add.mockImplementation(async (url: string) => {
      attempts += 1;
      if (attempts < 3) {
        throw new Error('transient network failure');
      }
      store.cached.add(url);
    });

    const result = await warmContentAssets(['/rive/dino.riv'], store, { retryDelayMs: () => 0 });

    expect(attempts).toBe(3);
    expect(result).toEqual({ cached: ['/rive/dino.riv'], complete: true, failed: [] });
  });

  it('backs off between attempts and stops at the configured attempt count', async () => {
    const store = memoryStore();
    const delays: number[] = [];
    store.add.mockRejectedValue(new Error('permanently unreachable'));

    const progress = progressReporter();
    const result = await warmContentAssets(['/rive/dino.riv'], store, {
      attempts: 3,
      onProgress: progress.onProgress,
      retryDelayMs: (attempt) => {
        delays.push(attempt);
        return 0;
      },
    });

    expect(store.add).toHaveBeenCalledTimes(3);
    expect(delays).toEqual([1, 2]);
    expect(result).toEqual({ cached: [], complete: false, failed: ['/rive/dino.riv'] });
    expect(progress.reports).toEqual([{ resolved: 1, total: 1 }]);
  });

  it('keeps other assets cached when one asset fails permanently', async () => {
    const store = memoryStore();
    store.add.mockImplementation(async (url: string) => {
      if (url === '/art/broken.webp') {
        throw new Error('404');
      }
      store.cached.add(url);
    });

    const result = await warmContentAssets(
      ['/art/broken.webp', '/rive/dino.riv', '/art/goal/pre-1.webp'],
      store,
      { attempts: 2, retryDelayMs: () => 0 },
    );

    expect([...result.cached].sort()).toEqual(['/art/goal/pre-1.webp', '/rive/dino.riv']);
    expect(result.failed).toEqual(['/art/broken.webp']);
    expect(result.complete).toBe(false);
    expect(store.cached).toContain('/rive/dino.riv');
  });
});
