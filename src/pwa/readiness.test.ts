import { describe, expect, it, vi } from 'vitest';
import type { ContentWarmupProgress, ContentWarmupResult } from './contentCache';
import {
  bootReadiness,
  type ReadinessState,
  readinessFraction,
  startContentReadiness,
} from './readiness';

/** Records every gate state the driver reports, in order. */
function gateRecorder() {
  const states: ReadinessState[] = [];
  return { states, onState: (state: ReadinessState) => states.push(state) };
}

/** Warm-up harness: the driver starts it, the test reports and resolves it. */
function pendingWarmup() {
  let report: (progress: ContentWarmupProgress) => void = () => {};
  let settle: (result: ContentWarmupResult) => void = () => {};
  let reject: (error: Error) => void = () => {};
  const warmUp = vi.fn(
    (onProgress: (progress: ContentWarmupProgress) => void) =>
      new Promise<ContentWarmupResult>((resolve, rejectPromise) => {
        report = onProgress;
        settle = resolve;
        reject = rejectPromise;
      }),
  );
  return {
    warmUp,
    progress: (resolved: number, total: number): void => report({ resolved, total }),
    complete: (failed: readonly string[] = []): void =>
      settle({ cached: [], complete: failed.length === 0, failed }),
    reject: (error: Error): void => reject(error),
  };
}

/** Captures the warm-up start so a test can decide when it runs. */
function manualScheduler() {
  const tasks: (() => void)[] = [];
  return {
    tasks,
    schedule: (task: () => void): void => {
      tasks.push(task);
    },
    run: (): void => {
      for (const task of tasks) {
        task();
      }
    },
  };
}

describe('content readiness contract', () => {
  it('decides to play when every asset is already cached', () => {
    expect(bootReadiness({ cacheComplete: true, online: true })).toEqual({
      mode: 'play',
      reason: 'complete',
    });
  });

  it('decides to play while offline, so nothing waits on work that cannot finish', () => {
    expect(bootReadiness({ cacheComplete: false, online: false })).toEqual({
      mode: 'play',
      reason: 'offline',
    });
  });

  it('decides to wait only when the cache is incomplete and the device is online', () => {
    expect(bootReadiness({ cacheComplete: false, online: true })).toEqual({ mode: 'wait' });
  });

  it('treats an already cached inventory as complete even while offline', () => {
    expect(bootReadiness({ cacheComplete: true, online: false })).toEqual({
      mode: 'play',
      reason: 'complete',
    });
  });

  it('reports the resolved share of the inventory as the gate fill', () => {
    expect(readinessFraction({ resolved: 0, total: 187 })).toBe(0);
    expect(readinessFraction({ resolved: 47, total: 187 })).toBeCloseTo(47 / 187, 10);
    expect(readinessFraction({ resolved: 187, total: 187 })).toBe(1);
  });

  it('clamps the gate fill to 0..1 and never divides an empty inventory', () => {
    expect(readinessFraction({ resolved: 0, total: 0 })).toBe(0);
    expect(readinessFraction({ resolved: 200, total: 187 })).toBe(1);
  });

  it('releases immediately with no gate when every asset is already cached', async () => {
    const warm = pendingWarmup();
    const scheduler = manualScheduler();
    const gate = gateRecorder();

    const state = await startContentReadiness({
      cacheComplete: true,
      online: true,
      warmUp: warm.warmUp,
      schedule: scheduler.schedule,
      onState: gate.onState,
    });

    expect(state).toEqual({ ready: true, reason: 'complete', fraction: 1, failed: [] });
    expect(warm.warmUp).not.toHaveBeenCalled();
    expect(scheduler.tasks).toHaveLength(0);
    expect(gate.states).toEqual([state]);
  });

  it('releases immediately while offline without starting work that cannot finish', async () => {
    const warm = pendingWarmup();
    const scheduler = manualScheduler();
    const gate = gateRecorder();

    const state = await startContentReadiness({
      cacheComplete: false,
      online: false,
      warmUp: warm.warmUp,
      schedule: scheduler.schedule,
      onState: gate.onState,
    });

    expect(state).toEqual({ ready: true, reason: 'offline', fraction: 1, failed: [] });
    expect(warm.warmUp).not.toHaveBeenCalled();
    expect(scheduler.tasks).toHaveLength(0);
    expect(gate.states).toEqual([state]);
  });

  it('holds the gate until the warm-up resolves, filling with its progress', async () => {
    const warm = pendingWarmup();
    const scheduler = manualScheduler();
    const gate = gateRecorder();

    const pending = startContentReadiness({
      cacheComplete: false,
      online: true,
      warmUp: warm.warmUp,
      schedule: scheduler.schedule,
      onState: gate.onState,
    });

    expect(gate.states).toEqual([{ ready: false, reason: null, fraction: 0, failed: [] }]);
    expect(warm.warmUp).not.toHaveBeenCalled();

    scheduler.run();
    expect(warm.warmUp).toHaveBeenCalledTimes(1);
    warm.progress(47, 187);
    warm.progress(94, 187);

    expect(gate.states).toEqual([
      { ready: false, reason: null, fraction: 0, failed: [] },
      { ready: false, reason: null, fraction: 47 / 187, failed: [] },
      { ready: false, reason: null, fraction: 94 / 187, failed: [] },
    ]);

    warm.complete();
    const state = await pending;
    expect(state).toEqual({ ready: true, reason: 'warmed', fraction: 1, failed: [] });
    expect(gate.states.at(-1)).toBe(state);
  });

  it('releases with exhausted failures surfaced for dev QA', async () => {
    const warm = pendingWarmup();
    const scheduler = manualScheduler();
    const gate = gateRecorder();

    const pending = startContentReadiness({
      cacheComplete: false,
      online: true,
      warmUp: warm.warmUp,
      schedule: scheduler.schedule,
      onState: gate.onState,
    });
    scheduler.run();
    warm.complete(['/rive/dino.riv', '/art/backdrop/pre-1.webp']);

    const state = await pending;
    expect(state).toEqual({
      ready: true,
      reason: 'warmed',
      fraction: 1,
      failed: ['/rive/dino.riv', '/art/backdrop/pre-1.webp'],
    });
  });

  it('resolves once and cannot reverse on later signals', async () => {
    const warm = pendingWarmup();
    const scheduler = manualScheduler();
    const gate = gateRecorder();

    const pending = startContentReadiness({
      cacheComplete: false,
      online: true,
      warmUp: warm.warmUp,
      schedule: scheduler.schedule,
      onState: gate.onState,
    });
    scheduler.run();
    warm.complete();
    const state = await pending;

    const before = gate.states.length;
    warm.progress(1, 187);
    warm.complete();

    expect(gate.states).toHaveLength(before);
    expect(gate.states.filter((entry) => entry.ready)).toEqual([state]);
  });

  it('releases rather than trapping the child when the warm-up itself fails', async () => {
    const warm = pendingWarmup();
    const scheduler = manualScheduler();
    const gate = gateRecorder();

    const pending = startContentReadiness({
      cacheComplete: false,
      online: true,
      warmUp: warm.warmUp,
      schedule: scheduler.schedule,
      onState: gate.onState,
    });
    scheduler.run();
    warm.reject(new Error('warm-up exploded'));

    const state = await pending;
    expect(state).toEqual({ ready: true, reason: 'warmed', fraction: 1, failed: [] });
  });
});
