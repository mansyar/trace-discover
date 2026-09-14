import { Rive } from '@rive-app/canvas-lite';

import type { RiveConfig, RiveRuntime } from './character';
import { pinLocalWasm } from './wasm';

/** Adapts the official canvas-lite runtime to the app's minimal `RiveRuntime` surface. */
export function canvasLiteFactory(config: RiveConfig): RiveRuntime {
  pinLocalWasm();
  return new Rive({
    autoplay: config.autoplay,
    canvas: config.canvas,
    onLoad: config.onLoad,
    onLoadError: () => {
      config.onLoadError(new Error('rive failed to load'));
    },
    src: config.src,
    stateMachines: config.stateMachines,
  });
}
