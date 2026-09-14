// Thin wrapper isolating the Rive runtime behind a minimal, mockable surface.
// Import naming mirrors the Rive JS API so wiring code reads naturally.

/** The subset of Rive constructor options this app uses. */
export interface RiveConfig {
  readonly autoplay: boolean;
  readonly canvas: HTMLCanvasElement;
  readonly onLoad: () => void;
  readonly onLoadError: (error: unknown) => void;
  readonly src: string;
  readonly stateMachines: string;
}

/** The subset of a state machine input this app uses (triggers only for now). */
export interface RiveInput {
  readonly fire?: () => void;
  readonly name: string;
}

/** The subset of a Rive runtime instance this app uses. */
export interface RiveRuntime {
  cleanup(): void;
  resizeDrawingSurfaceToCanvas(): void;
  stateMachineInputs(name: string): ReadonlyArray<RiveInput> | undefined;
}

/** Creates a runtime from config; the real adapter wraps `new Rive(...)`. */
export type RiveFactory = (config: RiveConfig) => RiveRuntime;

export interface CharacterOptions {
  readonly canvas: HTMLCanvasElement;
  readonly onError?: (error: unknown) => void;
  readonly onReady?: () => void;
  readonly riveFactory: RiveFactory;
  readonly src: string;
  readonly stateMachine: string;
}

export interface Character {
  dispose(): void;
  /** Fires a named state-machine trigger; false when not loaded or unknown. */
  fire(trigger: string): boolean;
  resize(): void;
}

/** Loads a character .riv and exposes trigger firing + resize + teardown. */
export function loadCharacter(options: CharacterOptions): Character {
  let loaded = false;
  const inputs = new Map<string, RiveInput>();
  const runtime = options.riveFactory({
    autoplay: true,
    canvas: options.canvas,
    onLoad: () => {
      loaded = true;
      runtime.resizeDrawingSurfaceToCanvas();
      for (const input of runtime.stateMachineInputs(options.stateMachine) ?? []) {
        inputs.set(input.name, input);
      }
      options.onReady?.();
    },
    onLoadError: (error) => {
      options.onError?.(error);
    },
    src: options.src,
    stateMachines: options.stateMachine,
  });
  return {
    dispose: () => {
      runtime.cleanup();
    },
    fire: (trigger) => {
      if (!loaded) {
        return false;
      }
      const input = inputs.get(trigger);
      if (!input?.fire) {
        return false;
      }
      input.fire();
      return true;
    },
    resize: () => {
      if (loaded) {
        runtime.resizeDrawingSurfaceToCanvas();
      }
    },
  };
}
