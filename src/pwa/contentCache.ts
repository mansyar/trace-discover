// PWA content-cache policy: keep boot-critical resources in the precache and
// expose the shipped content inventory for a background runtime-cache warm-up.
// The inventory is derived from Vite's public-asset view so new art and Rive
// files are included without maintaining a second hand-written URL list.
export const CONTENT_CACHE_NAME = 'trace-discover-content-v1';

export type AssetCacheKind = 'critical' | 'content' | 'unclassified';

const CRITICAL_FILES = new Set([
  '/index.html',
  '/manifest.webmanifest',
  '/registerSW.js',
  '/sw.js',
]);
const CRITICAL_PREFIXES = ['/assets/', '/icons/'];
const CONTENT_PREFIXES = ['/art/', '/rive/'];

/** Classifies a served URL so build/runtime policy cannot silently overlap. */
export function classifyAssetPath(path: string): AssetCacheKind {
  if (
    CRITICAL_FILES.has(path) ||
    CRITICAL_PREFIXES.some((prefix) => path.startsWith(prefix)) ||
    /^\/workbox-[^/]+\.js$/.test(path)
  ) {
    return 'critical';
  }
  if (CONTENT_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return 'content';
  }
  return 'unclassified';
}

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
