import { RuntimeLoader } from '@rive-app/canvas-lite';
import bundledWasmUrl from '@rive-app/canvas-lite/rive.wasm?url';

// The Rive web runtime defaults to fetching its .wasm from a CDN (unpkg, with
// a jsdelivr fallback). This app is fully offline: pin both URLs at the
// bundler-emitted local asset so no character load ever touches the network.
export function pinLocalWasm(): void {
  RuntimeLoader.setWasmUrl(bundledWasmUrl);
  RuntimeLoader.setWasmFallbackUrl(bundledWasmUrl);
}
