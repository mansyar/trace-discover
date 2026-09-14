import { RuntimeLoader } from '@rive-app/canvas-lite';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { pinLocalWasm } from './wasm';

vi.mock('@rive-app/canvas-lite', () => ({
  RuntimeLoader: { setWasmFallbackUrl: vi.fn(), setWasmUrl: vi.fn() },
}));

vi.mock('@rive-app/canvas-lite/rive.wasm?url', () => ({
  default: '/assets/rive-pinned.wasm',
}));

const loader = vi.mocked(RuntimeLoader);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('pinLocalWasm', () => {
  it('points the primary runtime at the bundled local wasm', () => {
    pinLocalWasm();

    expect(loader.setWasmUrl).toHaveBeenCalledTimes(1);
    expect(loader.setWasmUrl).toHaveBeenCalledWith('/assets/rive-pinned.wasm');
  });

  it('keeps the fallback offline too (never a CDN fetch)', () => {
    pinLocalWasm();

    expect(loader.setWasmFallbackUrl).toHaveBeenCalledWith('/assets/rive-pinned.wasm');
    for (const setter of [loader.setWasmUrl, loader.setWasmFallbackUrl]) {
      const url = String(setter.mock.calls[0]?.[0] ?? '');
      expect(url.startsWith('http')).toBe(false);
    }
  });
});
