// Boot readiness for first-run offline resilience: the gate holds the splash
// until the content warm-up is finished, and must never become a dead end. An
// already-cached inventory and an offline device both release it immediately
// because waiting cannot gain anything, and a warm-up that exhausts its
// attempts, or throws outright, releases it too. Everything here is pure or
// injected, so src/main.ts stays wiring and every branch is testable.
import type { ContentWarmupProgress, ContentWarmupResult } from './contentCache';

/** Why the gate released. */
export type ReadinessReason = 'complete' | 'offline' | 'warmed';

export interface ReadinessInputs {
  /** Every shipped content asset is already cached. */
  readonly cacheComplete: boolean;
  /** The device reports connectivity at decision time. */
  readonly online: boolean;
}

/**
 * Boot decision, taken before any warm-up work is scheduled. `play` means the
 * gate never appears — there is nothing to gain from waiting.
 */
export type ReadinessPlan =
  | { readonly mode: 'play'; readonly reason: 'complete' | 'offline' }
  | { readonly mode: 'wait' };

export function bootReadiness(inputs: ReadinessInputs): ReadinessPlan {
  if (inputs.cacheComplete) {
    return { mode: 'play', reason: 'complete' };
  }
  if (!inputs.online) {
    return { mode: 'play', reason: 'offline' };
  }
  return { mode: 'wait' };
}

/**
 * Gate state the splash renders. The fill follows `resolved / total`, where an
 * exhausted asset still counts as resolved (the warm-up's own contract), so a
 * stalled indication is impossible; a resolved state reports `1` because
 * nothing is left to wait for.
 */
export interface ReadinessState {
  /** True once the app may leave the splash; never flips back. */
  readonly ready: boolean;
  /** How the gate released; null while it waits. */
  readonly reason: ReadinessReason | null;
  /** Gate fill 0..1, clamped; 1 once ready. */
  readonly fraction: number;
  /** Assets the warm-up could not cache, for dev QA; empty unless it ran and lost some. */
  readonly failed: readonly string[];
}

/** Gate fill for a progress report: `resolved / total`, clamped to 0..1. */
export function readinessFraction(progress: ContentWarmupProgress): number {
  if (progress.total <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, progress.resolved / progress.total));
}

export interface ContentReadinessOptions {
  /** Every shipped content asset is already cached. */
  readonly cacheComplete: boolean;
  /** The device reports connectivity at decision time. */
  readonly online: boolean;
  /** Runs the content warm-up, reporting progress after every asset. */
  readonly warmUp: (
    onProgress: (progress: ContentWarmupProgress) => void,
  ) => Promise<ContentWarmupResult>;
  /** Starts the warm-up off the boot frame (timer hook); never called on an escape. */
  readonly schedule: (task: () => void) => void;
  /** Every gate state in order; the terminal one is reported exactly once. */
  readonly onState?: (state: ReadinessState) => void;
}

/**
 * Drives the gate to its single resolution and resolves with the terminal
 * state: immediately on an escape (cache complete · offline), otherwise once
 * the warm-up settles — succeeded, exhausted, or thrown. Progress reported
 * after that is dropped, so readiness can never reverse.
 */
export function startContentReadiness(options: ContentReadinessOptions): Promise<ReadinessState> {
  const plan = bootReadiness({ cacheComplete: options.cacheComplete, online: options.online });
  if (plan.mode === 'play') {
    const state: ReadinessState = { ready: true, reason: plan.reason, fraction: 1, failed: [] };
    options.onState?.(state);
    return Promise.resolve(state);
  }
  return new Promise((resolve) => {
    let resolved = false;
    const report = (state: ReadinessState): void => {
      if (!resolved) {
        options.onState?.(state);
      }
    };
    // A warm-up that throws leaves no per-asset detail to name, but it still
    // releases the gate: an unnamed failure beats a child stuck on the splash.
    const settle = (failed: readonly string[]): void => {
      if (resolved) {
        return;
      }
      resolved = true;
      const state: ReadinessState = { ready: true, reason: 'warmed', fraction: 1, failed };
      options.onState?.(state);
      resolve(state);
    };
    report({ ready: false, reason: null, fraction: 0, failed: [] });
    options.schedule(() => {
      void options
        .warmUp((progress) => {
          report({ ready: false, reason: null, fraction: readinessFraction(progress), failed: [] });
        })
        .then(
          (result) => settle(result.failed),
          () => settle([]),
        );
    });
  });
}
