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

/** Warms each unique content URL once, retaining successful work after failures. */
export async function warmContentAssets(
  urls: readonly string[],
  store: ContentCacheStore,
): Promise<ContentWarmupResult> {
  const cached: string[] = [];
  const failed: string[] = [];
  for (const url of new Set(urls)) {
    try {
      if (await store.has(url)) {
        continue;
      }
      await store.add(url);
      cached.push(url);
    } catch {
      failed.push(url);
    }
  }
  return { cached, complete: failed.length === 0, failed };
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
