// PWA content-cache policy: keep boot-critical resources in the precache and
// expose the shipped content inventory for a background runtime-cache warm-up.
// The inventory is derived from Vite's public-asset view so new art and Rive
// files are included without maintaining a second hand-written URL list.
import { CONTENT_CACHE_NAME } from './cachePolicy';

export type { AssetCacheKind } from './cachePolicy';
export { CONTENT_CACHE_NAME, classifyAssetPath } from './cachePolicy';

const ART_ASSET_KEYS = Object.keys(import.meta.glob('/public/art/**/*'));
const RIVE_ASSET_KEYS = Object.keys(import.meta.glob('/public/rive/*.riv'));

/** Every shipped content URL that must be cached before whole-app offline QA passes. */
export const CONTENT_ASSET_URLS: readonly string[] = [...ART_ASSET_KEYS, ...RIVE_ASSET_KEYS]
  .map((key) => key.replace(/^\/public/, ''))
  .sort();

export interface ContentCacheStore {
  add(url: string): Promise<void>;
  has(url: string): Promise<boolean>;
}

/** Adapts the browser Cache API to the small store used by warmContentAssets. */
export function createBrowserContentCacheStore(
  storage: CacheStorage = globalThis.caches,
): ContentCacheStore {
  let cachePromise: Promise<Cache> | null = null;
  const cache = (): Promise<Cache> => {
    cachePromise ??= storage.open(CONTENT_CACHE_NAME);
    return cachePromise;
  };
  return {
    add: async (url) => {
      await (await cache()).add(url);
    },
    has: async (url) => Boolean(await (await cache()).match(url)),
  };
}

export interface ContentWarmupResult {
  cached: readonly string[];
  complete: boolean;
  failed: readonly string[];
}

/**
 * Incremental warm-up progress. `resolved` counts every asset the warm-up is
 * finished with — already cached, newly cached, or permanently failed — so it
 * reaches `total` exactly once and never stalls before the warm-up ends.
 */
export interface ContentWarmupProgress {
  readonly resolved: number;
  readonly total: number;
}

export interface ContentWarmupOptions {
  /** Delivery attempts per asset, including the first. */
  readonly attempts?: number;
  /** Maximum assets fetched at once. */
  readonly concurrency?: number;
  /** Called after every asset resolves, with a monotonic count. */
  readonly onProgress?: (progress: ContentWarmupProgress) => void;
  /** Backoff before a retry; receives the 1-based attempt that just failed. */
  readonly retryDelayMs?: (attempt: number) => number;
}

const DEFAULT_ATTEMPTS = 3;
const DEFAULT_CONCURRENCY = 6;
/** Backoff between attempts: 250 ms after the first failure, then 750 ms for any further one. */
const RETRY_DELAYS_MS = [250, 750];

function retryDelayFor(attempt: number): number {
  return RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1] ?? 0;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Warms each unique content URL once, retaining successful work after failures.
 * Work runs with bounded concurrency and bounded retries so a slow network is
 * latency-bound rather than serial, and every asset settles exactly once.
 */
export async function warmContentAssets(
  urls: readonly string[],
  store: ContentCacheStore,
  options: ContentWarmupOptions = {},
): Promise<ContentWarmupResult> {
  const unique = [...new Set(urls)];
  const attempts = Math.max(1, options.attempts ?? DEFAULT_ATTEMPTS);
  const lanes = Math.min(Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY), unique.length);
  const retryDelayMs = options.retryDelayMs ?? retryDelayFor;
  const cached: string[] = [];
  const failed: string[] = [];
  let resolved = 0;
  let cursor = 0;

  const warmAsset = async (url: string): Promise<void> => {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        if (!(await store.has(url))) {
          await store.add(url);
          cached.push(url);
        }
        return;
      } catch {
        if (attempt === attempts) {
          failed.push(url);
          return;
        }
        const backoff = retryDelayMs(attempt);
        if (backoff > 0) {
          await wait(backoff);
        }
      }
    }
  };

  const lane = async (): Promise<void> => {
    while (cursor < unique.length) {
      const url = unique[cursor];
      cursor += 1;
      if (url === undefined) {
        return;
      }
      await warmAsset(url);
      resolved += 1;
      options.onProgress?.({ resolved, total: unique.length });
    }
  };

  if (unique.length === 0) {
    options.onProgress?.({ resolved: 0, total: 0 });
    return { cached, complete: true, failed };
  }

  await Promise.all(Array.from({ length: lanes }, lane));

  return { cached, complete: failed.length === 0, failed };
}

/**
 * True when every unique URL in the inventory is already in the content cache,
 * which is what lets a warm boot skip the readiness gate entirely. Sequential
 * on purpose: it runs once at boot, against a local Cache API, and stops at the
 * first miss rather than walking the rest of the inventory.
 */
export async function allContentCached(
  urls: readonly string[],
  store: ContentCacheStore,
): Promise<boolean> {
  for (const url of new Set(urls)) {
    if (!(await store.has(url))) {
      return false;
    }
  }
  return true;
}

export interface ContentWarmupScheduleOptions {
  isOnline: () => boolean;
  schedule: (task: () => void) => void;
  store: ContentCacheStore;
  urls?: readonly string[];
}

/** Schedules the full content warm-up only when the browser reports connectivity. */
export function scheduleContentWarmup(
  options: ContentWarmupScheduleOptions,
): Promise<ContentWarmupResult | null> {
  if (!options.isOnline()) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    options.schedule(() => {
      void warmContentAssets(options.urls ?? CONTENT_ASSET_URLS, options.store).then(resolve);
    });
  });
}
