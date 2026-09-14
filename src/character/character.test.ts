import { describe, expect, it, vi } from 'vitest';

import { loadCharacter, type RiveConfig, type RiveFactory, type RiveRuntime } from './character';

function setup(inputNames: readonly string[]) {
  const inputs = inputNames.map((name) => ({ fire: vi.fn(), name }));
  const runtime: RiveRuntime = {
    cleanup: vi.fn(),
    resizeDrawingSurfaceToCanvas: vi.fn(),
    stateMachineInputs: vi.fn(() => inputs),
  };
  const state: { config: RiveConfig | null } = { config: null };
  const factory: RiveFactory = (config) => {
    state.config = config;
    return runtime;
  };
  const config = (): RiveConfig => {
    if (!state.config) {
      throw new Error('factory was not called');
    }
    return state.config;
  };
  return { config, factory, inputs, runtime };
}

const CANVAS = {} as unknown as HTMLCanvasElement;
const OPTIONS = { canvas: CANVAS, src: '/rive/dino.riv', stateMachine: 'State Machine 1' };

describe('loadCharacter', () => {
  it('creates the runtime with autoplay and the named state machine', () => {
    const fixture = setup(['celebrate']);
    loadCharacter({ ...OPTIONS, riveFactory: fixture.factory });

    const config = fixture.config();
    expect(config.src).toBe('/rive/dino.riv');
    expect(config.canvas).toBe(CANVAS);
    expect(config.autoplay).toBe(true);
    expect(config.stateMachines).toBe('State Machine 1');
  });

  it('resizes the drawing surface and reports ready when loaded', () => {
    const fixture = setup(['celebrate']);
    const onReady = vi.fn();
    loadCharacter({ ...OPTIONS, onReady, riveFactory: fixture.factory });

    fixture.config().onLoad();
    expect(fixture.runtime.resizeDrawingSurfaceToCanvas).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('fires a named trigger only after load', () => {
    const fixture = setup(['celebrate']);
    const character = loadCharacter({ ...OPTIONS, riveFactory: fixture.factory });

    expect(character.fire('celebrate')).toBe(false);
    fixture.config().onLoad();
    expect(character.fire('celebrate')).toBe(true);
    expect(character.fire('missing')).toBe(false);
    expect(fixture.inputs[0]?.fire).toHaveBeenCalledTimes(1);
  });

  it('forwards resize only after load', () => {
    const fixture = setup(['celebrate']);
    const character = loadCharacter({ ...OPTIONS, riveFactory: fixture.factory });

    character.resize();
    expect(fixture.runtime.resizeDrawingSurfaceToCanvas).not.toHaveBeenCalled();
    fixture.config().onLoad();
    character.resize();
    expect(fixture.runtime.resizeDrawingSurfaceToCanvas).toHaveBeenCalledTimes(2);
  });

  it('cleans up the runtime on dispose', () => {
    const fixture = setup(['celebrate']);
    const character = loadCharacter({ ...OPTIONS, riveFactory: fixture.factory });

    character.dispose();
    expect(fixture.runtime.cleanup).toHaveBeenCalledTimes(1);
  });

  it('stays inert when the runtime fails to load', () => {
    const fixture = setup(['celebrate']);
    const onError = vi.fn();
    const character = loadCharacter({ ...OPTIONS, onError, riveFactory: fixture.factory });

    const error = new Error('boom');
    fixture.config().onLoadError(error);
    expect(onError).toHaveBeenCalledWith(error);
    expect(character.fire('celebrate')).toBe(false);
    character.resize();
    expect(fixture.runtime.resizeDrawingSurfaceToCanvas).not.toHaveBeenCalled();
  });
});
