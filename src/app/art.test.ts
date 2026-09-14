import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadArtImage } from './art';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadArtImage', () => {
  it('resolves null when the platform has no Image constructor', async () => {
    vi.stubGlobal('Image', undefined);
    await expect(loadArtImage('/art/goal/dino-1.png')).resolves.toBeNull();
  });

  it('resolves the element once it loads', async () => {
    let instance: { onload: (() => void) | null; src: string } | null = null;
    vi.stubGlobal(
      'Image',
      vi.fn(function FakeImage(this: unknown) {
        instance = { onload: null, src: '' };
        return instance;
      }),
    );
    const pending = loadArtImage('/art/goal/dino-1.png');
    if (!instance) {
      throw new Error('expected an image instance');
    }
    const current = instance as { onload: (() => void) | null; src: string };
    current.onload?.();
    const element = await pending;
    expect(element).toBe(current);
  });

  it('resolves null when the file fails to load, never throwing', async () => {
    let instance: { onerror: (() => void) | null; src: string } | null = null;
    vi.stubGlobal(
      'Image',
      vi.fn(function FakeImage(this: unknown) {
        instance = { onerror: null, src: '' };
        return instance;
      }),
    );
    const pending = loadArtImage('/art/goal/missing.png');
    if (!instance) {
      throw new Error('expected an image instance');
    }
    const current = instance as { onerror: (() => void) | null; src: string };
    current.onerror?.();
    await expect(pending).resolves.toBeNull();
  });
});
