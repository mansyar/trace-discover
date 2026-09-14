import { describe, expect, it } from 'vitest';
import { resample } from './path';
import {
  advanceTrail,
  beginStroke,
  createTrail,
  endStroke,
  TRAIL_START,
  tipPosition,
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

/** Square 1600 px closed loop resampled at 10 px spacing (start == end). */
function loopPath(): Point[] {
  return resample(
    [
      { x: 0, y: 0 },
      { x: 400, y: 0 },
      { x: 400, y: 400 },
      { x: 0, y: 400 },
      { x: 0, y: 0 },
    ],
    10,
  );
}

const CONFIG = { tolerance: 50, maxAdvanceSpeed: 600 };
const FRAME = 1 / 60;

describe('trail-tip state machine', () => {
  it('advances the frontier while the finger stays within tolerance (tip chases, capped)', () => {
    const trail = createTrail(straightPath(), CONFIG);
    let state = beginStroke(TRAIL_START);
    state = advanceTrail(trail, state, 25, 20, FRAME);
    expect(state.frontier).toBeCloseTo(10, 9);
    state = advanceTrail(trail, state, 25, 20, FRAME);
    expect(state.frontier).toBeCloseTo(20, 9);
    state = advanceTrail(trail, state, 25, 20, FRAME);
    expect(state.frontier).toBeCloseTo(25, 9);
  });

  it('caps advance speed even for a fast within-tolerance swipe', () => {
    const trail = createTrail(straightPath(), CONFIG);
    const state = advanceTrail(trail, beginStroke(TRAIL_START), 45, 0, FRAME);
    expect(state.frontier).toBeCloseTo(10, 9);
  });

  it('ignores a jump to the far end of the path (fast swipe cannot skip)', () => {
    const trail = createTrail(straightPath(), CONFIG);
    const state = advanceTrail(trail, beginStroke(TRAIL_START), 400, 0, FRAME);
    expect(state.frontier).toBe(0);
  });

  it('does not advance when the finger strays off the path', () => {
    const trail = createTrail(straightPath(), CONFIG);
    const state = advanceTrail(trail, beginStroke(TRAIL_START), 25, 80, FRAME);
    expect(state.frontier).toBe(0);
  });

  it('keeps progress when the finger lifts', () => {
    const trail = createTrail(straightPath(), CONFIG);
    let state = beginStroke(TRAIL_START);
    state = advanceTrail(trail, state, 25, 0, FRAME);
    state = advanceTrail(trail, state, 25, 0, FRAME);
    state = endStroke(state);
    expect(state.tracing).toBe(false);
    expect(state.frontier).toBeCloseTo(20, 9);
    const idleUpdate = advanceTrail(trail, state, 25, 0, FRAME);
    expect(idleUpdate.frontier).toBeCloseTo(20, 9);
  });

  it('never decreases on backward drags', () => {
    const trail = createTrail(straightPath(), CONFIG);
    let state = beginStroke(TRAIL_START);
    state = advanceTrail(trail, state, 25, 0, FRAME);
    state = advanceTrail(trail, state, 25, 0, FRAME);
    state = advanceTrail(trail, state, 5, 0, FRAME);
    expect(state.frontier).toBeCloseTo(20, 9);
  });

  it('resumes from the frontier on a new touch', () => {
    const trail = createTrail(straightPath(), CONFIG);
    let state = beginStroke(TRAIL_START);
    state = advanceTrail(trail, state, 25, 0, FRAME);
    state = advanceTrail(trail, state, 25, 0, FRAME);
    state = endStroke(state);
    state = beginStroke(state);
    expect(state.tracing).toBe(true);
    state = advanceTrail(trail, state, 35, 0, FRAME);
    expect(state.frontier).toBeCloseTo(30, 9);
  });

  it('reports the tip at its arc position, clamped to the path', () => {
    const trail = createTrail(straightPath(), CONFIG);
    expect(tipPosition(trail, TRAIL_START)).toEqual({ x: 0, y: 0 });
    expect(tipPosition(trail, { frontier: 15, tracing: false })).toEqual({ x: 15, y: 0 });
    expect(tipPosition(trail, { frontier: 9999, tracing: false })).toEqual({ x: 400, y: 0 });
  });

  it('follows arc length around a corner', () => {
    const corner = resample(
      [
        { x: 0, y: 0 },
        { x: 0, y: 100 },
        { x: 100, y: 100 },
      ],
      10,
    );
    const trail = createTrail(corner, CONFIG);
    expect(tipPosition(trail, { frontier: 50, tracing: false })).toEqual({ x: 0, y: 50 });
    expect(tipPosition(trail, { frontier: 150, tracing: false })).toEqual({ x: 50, y: 100 });
  });

  it('handles an empty trail', () => {
    const trail = createTrail([], CONFIG);
    expect(tipPosition(trail, TRAIL_START)).toEqual({ x: 0, y: 0 });
  });

  it('finishes a closed loop when the finger dwells on the goal (start == end)', () => {
    const trail = createTrail(loopPath(), CONFIG);
    const points = trail.points;
    const goal = points[points.length - 1];
    if (!goal) {
      throw new Error('missing loop end');
    }
    let state = { ...beginStroke(TRAIL_START), frontier: trail.total * 0.9 };
    for (let frame = 0; frame < 30; frame += 1) {
      state = advanceTrail(trail, state, goal.x, goal.y, FRAME);
    }
    expect(state.frontier).toBeCloseTo(trail.total, 0);
  });

  it('still rejects a direct tap on the goal of an open path (no skip)', () => {
    const trail = createTrail(straightPath(), CONFIG);
    const state = { ...beginStroke(TRAIL_START), frontier: trail.total * 0.5 };
    const done = advanceTrail(trail, state, 400, 0, FRAME);
    expect(done.frontier).toBeCloseTo(trail.total * 0.5, 9);
  });

  it('handles a zero-length trail', () => {
    const trail = createTrail(
      [
        { x: 5, y: 5 },
        { x: 5, y: 5 },
      ],
      CONFIG,
    );
    expect(tipPosition(trail, { frontier: 0, tracing: false })).toEqual({ x: 5, y: 5 });
  });
});
