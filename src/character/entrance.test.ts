// Entrance timeline: the mascot hops in from below the field edge when a
// level opens, then settles at its waiting spot. Early input settles it
// instantly so tracing is never waiting on the animation.

import { describe, expect, it } from 'vitest';
import { FIELD_HEIGHT } from '../field';
import {
  createEntrance,
  ENTRANCE_DURATION_MS,
  entrancePos,
  entranceStart,
  settleEntrance,
  stepEntrance,
} from './entrance';

const REST = { x: 215, y: 650 };

describe('createEntrance', () => {
  it('starts below the field bottom, straight under the rest spot', () => {
    const timeline = createEntrance(REST);
    expect(timeline.start.x).toBe(REST.x);
    expect(timeline.start.y).toBeGreaterThan(FIELD_HEIGHT);
    expect(timeline.rest).toBe(REST);
  });

  it('keeps the hop a quick beat: 600-900 ms', () => {
    expect(ENTRANCE_DURATION_MS).toBeGreaterThanOrEqual(600);
    expect(ENTRANCE_DURATION_MS).toBeLessThanOrEqual(900);
  });
});

describe('entrancePos', () => {
  it('begins at the start and ends exactly at rest', () => {
    const timeline = createEntrance(REST);
    expect(entrancePos(timeline, entranceStart())).toEqual(timeline.start);
    const done = stepEntrance(timeline, entranceStart(), ENTRANCE_DURATION_MS);
    expect(entrancePos(timeline, done)).toEqual(REST);
  });

  it('lifts above the straight-line path along the way', () => {
    const timeline = createEntrance(REST);
    const half = stepEntrance(timeline, entranceStart(), ENTRANCE_DURATION_MS / 2);
    const pos = entrancePos(timeline, half);
    const straightMid = (timeline.start.y + REST.y) / 2;
    expect(pos.y).toBeLessThan(straightMid);
    expect(pos.y).toBeGreaterThan(REST.y - timeline.hopHeight - 1);
  });

  it('never drifts off the rest column', () => {
    const timeline = createEntrance(REST);
    for (const elapsedMs of [0, 100, 350, 600, ENTRANCE_DURATION_MS]) {
      const state = stepEntrance(timeline, entranceStart(), elapsedMs);
      expect(entrancePos(timeline, state).x).toBe(REST.x);
    }
  });
});

describe('stepEntrance / settleEntrance', () => {
  it('advances, clamps, and stays settled once done', () => {
    const timeline = createEntrance(REST);
    let state = entranceStart();
    expect(state.settled).toBe(false);
    state = stepEntrance(timeline, state, 300);
    expect(state.elapsedMs).toBe(300);
    expect(state.settled).toBe(false);
    state = stepEntrance(timeline, state, 500);
    expect(state.elapsedMs).toBe(ENTRANCE_DURATION_MS);
    expect(state.settled).toBe(true);
    expect(stepEntrance(timeline, state, 100)).toBe(state);
  });

  it('early input settles immediately and lands at rest', () => {
    const timeline = createEntrance(REST);
    const early = settleEntrance(timeline, entranceStart());
    expect(early.settled).toBe(true);
    expect(entrancePos(timeline, early)).toEqual(REST);
  });

  it('is a no-op when already settled', () => {
    const timeline = createEntrance(REST);
    const early = settleEntrance(timeline, entranceStart());
    expect(settleEntrance(timeline, early)).toBe(early);
  });

  it('ignores negative frame steps (clock hiccups)', () => {
    const timeline = createEntrance(REST);
    const state = stepEntrance(timeline, entranceStart(), -50);
    expect(state.elapsedMs).toBe(0);
    expect(state.settled).toBe(false);
  });
});
