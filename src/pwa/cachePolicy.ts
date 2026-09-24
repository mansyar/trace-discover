// Shared PWA cache policy used by both the Vite config and the browser runtime.
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
