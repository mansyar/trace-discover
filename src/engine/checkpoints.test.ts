import { describe, expect, it } from 'vitest';
import {
  CHECKPOINT_START,
  createCheckpoints,
  createMultiCheckpoints,
  evaluateCheckpoints,
  evaluateMultiCheckpoints,
} from './checkpoints';
import { resample } from './path';
import {
  advanceMultiTrail,
  advanceTrail,
  beginMultiStroke,
  beginStroke,
  createMultiTrail,
  createTrail,
  MULTI_TRAIL_START,
  TRAIL_START,
} from './trail';
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

describe('multi-stroke checkpoints', () => {
  const config = { tolerance: 50, maxAdvanceSpeed: 600 };
  const FRAME = 1 / 60;

  /** Two 300 px strokes in sequence: horizontal, then vertical. */
  function sequencePaths(): Point[][] {
    return [
      resample(
        [
          { x: 0, y: 150 },
          { x: 300, y: 150 },
        ],
        10,
      ),
      resample(
        [
          { x: 150, y: 0 },
          { x: 150, y: 300 },
        ],
        10,
      ),
    ];
  }

  it('divides the whole sequence into equal global boundaries with per-stroke starts', () => {
    const trail = createMultiTrail(sequencePaths(), config);
    const checkpoints = createMultiCheckpoints(trail, 4);
    expect(checkpoints.boundaries).toEqual([150, 300, 450, 600]);
    expect(checkpoints.strokeStarts).toEqual([0, 300]);
  });

  it('fires ordered chime events across the sequence and completes only at the end', () => {
    const trail = createMultiTrail(sequencePaths(), config);
    const checkpoints = createMultiCheckpoints(trail, 3);
    let trailState = beginMultiStroke(MULTI_TRAIL_START);
    let checkpointState = CHECKPOINT_START;
    const events: string[] = [];
    const step = (x: number, y: number) => {
      trailState = advanceMultiTrail(trail, trailState, x, y, FRAME);
      const result = evaluateMultiCheckpoints(
        checkpoints,
        checkpointState,
        trailState.strokeIndex,
        trailState.frontier,
      );
      checkpointState = result.state;
      for (const event of result.events) {
        events.push(event.type === 'checkpoint' ? `cp${event.index}` : 'complete');
      }
    };
    for (let x = 10; x <= 300; x += 10) {
      step(x, 150);
    }
    const completedMidway = checkpointState.completed;
    for (let y = 10; y <= 300; y += 10) {
      step(150, y);
    }
    expect(completedMidway).toBe(false);
    expect(events).toEqual(['cp0', 'cp1', 'complete']);
    expect(checkpointState.completed).toBe(true);
    expect(trailState.strokeIndex).toBe(1);
    expect(trailState.frontier).toBeCloseTo(300, 9);
  });

  it('fires every boundary in order when evaluation resumes after a skipped stretch', () => {
    const trail = createMultiTrail(sequencePaths(), config);
    const checkpoints = createMultiCheckpoints(trail, 4);
    const result = evaluateMultiCheckpoints(checkpoints, CHECKPOINT_START, 1, 0);
    expect(result.events).toEqual([
      { type: 'checkpoint', index: 0 },
      { type: 'checkpoint', index: 1 },
    ]);
    expect(result.state.passed).toBe(2);
    expect(result.state.completed).toBe(false);
  });

  it('does not complete when only the first stroke is finished', () => {
    const trail = createMultiTrail(sequencePaths(), config);
    const checkpoints = createMultiCheckpoints(trail, 4);
    const result = evaluateMultiCheckpoints(checkpoints, CHECKPOINT_START, 0, 300);
    expect(result.state.completed).toBe(false);
    expect(result.events).toEqual([
      { type: 'checkpoint', index: 0 },
      { type: 'checkpoint', index: 1 },
    ]);
  });

  it('marks completion after the final stroke and stays completed', () => {
    const trail = createMultiTrail(sequencePaths(), config);
    const checkpoints = createMultiCheckpoints(trail, 4);
    const result = evaluateMultiCheckpoints(checkpoints, CHECKPOINT_START, 1, 300);
    expect(result.events).toEqual([
      { type: 'checkpoint', index: 0 },
      { type: 'checkpoint', index: 1 },
      { type: 'checkpoint', index: 2 },
      { type: 'complete' },
    ]);
    expect(result.state.completed).toBe(true);
    const after = evaluateMultiCheckpoints(checkpoints, result.state, 1, 300);
    expect(after.events).toEqual([]);
  });
});
