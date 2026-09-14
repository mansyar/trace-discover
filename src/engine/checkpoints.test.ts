import { describe, expect, it } from 'vitest';
import { CHECKPOINT_START, createCheckpoints, evaluateCheckpoints } from './checkpoints';
import { resample } from './path';
import { advanceTrail, beginStroke, createTrail, TRAIL_START } from './trail';
import type { Point } from './types';

/** Straight 400 px path resampled at 10 px spacing. */
function straightPath(): Point[] {
  return resample(
    [
      { x: 0, y: 0 },
      { x: 400, y: 0 },
    ],
    10,
  );
}

describe('checkpoints', () => {
  it('divides the trail into equal boundaries ending at the total length', () => {
    const trail = createTrail(straightPath(), { tolerance: 50, maxAdvanceSpeed: 600 });
    const checkpoints = createCheckpoints(trail, 4);
    expect(checkpoints.boundaries).toEqual([100, 200, 300, 400]);
  });

  it('emits one ordered checkpoint event per boundary crossed (inclusive)', () => {
    const trail = createTrail(straightPath(), { tolerance: 50, maxAdvanceSpeed: 600 });
    const checkpoints = createCheckpoints(trail, 4);
    const before = evaluateCheckpoints(checkpoints, CHECKPOINT_START, 99);
    expect(before.events).toEqual([]);
    expect(before.state.passed).toBe(0);
    const at = evaluateCheckpoints(checkpoints, before.state, 100);
    expect(at.events).toEqual([{ type: 'checkpoint', index: 0 }]);
    expect(at.state.passed).toBe(1);
  });

  it('emits multiple ordered events when the frontier jumps several boundaries', () => {
    const trail = createTrail(straightPath(), { tolerance: 50, maxAdvanceSpeed: 600 });
    const checkpoints = createCheckpoints(trail, 4);
    const result = evaluateCheckpoints(checkpoints, CHECKPOINT_START, 250);
    expect(result.events).toEqual([
      { type: 'checkpoint', index: 0 },
      { type: 'checkpoint', index: 1 },
    ]);
    expect(result.state.passed).toBe(2);
  });

  it('never re-emits already passed checkpoints', () => {
    const trail = createTrail(straightPath(), { tolerance: 50, maxAdvanceSpeed: 600 });
    const checkpoints = createCheckpoints(trail, 4);
    const first = evaluateCheckpoints(checkpoints, CHECKPOINT_START, 150);
    expect(first.events).toEqual([{ type: 'checkpoint', index: 0 }]);
    const again = evaluateCheckpoints(checkpoints, first.state, 160);
    expect(again.events).toEqual([]);
    const next = evaluateCheckpoints(checkpoints, again.state, 210);
    expect(next.events).toEqual([{ type: 'checkpoint', index: 1 }]);
  });

  it('detects completion at the end of the trail', () => {
    const trail = createTrail(straightPath(), { tolerance: 50, maxAdvanceSpeed: 600 });
    const checkpoints = createCheckpoints(trail, 4);
    const result = evaluateCheckpoints(checkpoints, CHECKPOINT_START, 400);
    expect(result.events).toEqual([
      { type: 'checkpoint', index: 0 },
      { type: 'checkpoint', index: 1 },
      { type: 'checkpoint', index: 2 },
      { type: 'complete' },
    ]);
    expect(result.state.completed).toBe(true);
    expect(result.state.passed).toBe(4);
  });

  it('stays completed and emits nothing afterwards', () => {
    const trail = createTrail(straightPath(), { tolerance: 50, maxAdvanceSpeed: 600 });
    const checkpoints = createCheckpoints(trail, 4);
    const done = evaluateCheckpoints(checkpoints, CHECKPOINT_START, 400);
    const after = evaluateCheckpoints(checkpoints, done.state, 400);
    expect(after.events).toEqual([]);
    expect(after.state.completed).toBe(true);
  });

  it('treats a single checkpoint as pure completion', () => {
    const trail = createTrail(straightPath(), { tolerance: 50, maxAdvanceSpeed: 600 });
    const checkpoints = createCheckpoints(trail, 1);
    const before = evaluateCheckpoints(checkpoints, CHECKPOINT_START, 399);
    expect(before.events).toEqual([]);
    const at = evaluateCheckpoints(checkpoints, before.state, 400);
    expect(at.events).toEqual([{ type: 'complete' }]);
    expect(at.state.completed).toBe(true);
  });

  it('supports fractional boundaries', () => {
    const trail = createTrail(straightPath(), { tolerance: 50, maxAdvanceSpeed: 600 });
    const checkpoints = createCheckpoints(trail, 3);
    expect(checkpoints.boundaries[0]).toBeCloseTo(400 / 3, 9);
    const result = evaluateCheckpoints(checkpoints, CHECKPOINT_START, 134);
    expect(result.events).toEqual([{ type: 'checkpoint', index: 0 }]);
  });

  it('integrates with trail progress to detect completion', () => {
    const trail = createTrail(straightPath(), { tolerance: 50, maxAdvanceSpeed: 600 });
    const checkpoints = createCheckpoints(trail, 4);
    let trailState = beginStroke(TRAIL_START);
    for (let x = 0; x <= 400; x += 5) {
      trailState = advanceTrail(trail, trailState, x, 0, 1 / 60);
    }
    for (let i = 0; i < 10; i += 1) {
      trailState = advanceTrail(trail, trailState, 400, 0, 1 / 60);
    }
    expect(trailState.frontier).toBeCloseTo(400, 9);
    const result = evaluateCheckpoints(checkpoints, CHECKPOINT_START, trailState.frontier);
    expect(result.state.completed).toBe(true);
    expect(result.events[result.events.length - 1]).toEqual({ type: 'complete' });
  });
});
