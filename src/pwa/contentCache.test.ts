import { describe, expect, it, vi } from 'vitest';
import { CONTENT_ASSET_URLS, classifyAssetPath, warmContentAssets } from './contentCache';

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

  it('continues after a partial failure and can recover on a later warm-up', async () => {
    let failOnce = true;
    const store = memoryStore();
    store.add.mockImplementation(async (url: string) => {
      if (url === '/art/goal/pre-1.webp' && failOnce) {
        throw new Error('temporary network failure');
      }
      store.cached.add(url);
    });

    const first = await warmContentAssets(['/art/goal/pre-1.webp', '/rive/dino.riv'], store);
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
