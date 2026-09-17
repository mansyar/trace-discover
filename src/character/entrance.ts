// Level-start entrance: the mascot hops up from below the field edge to its
// waiting spot, then settles at rest (early input settles it instantly).
// Pure timeline math — the shell wires positions and input.

import type { Point } from '../engine/types';
import { FIELD_HEIGHT } from '../field';

/** Entrance timing/spacing knobs (device-tuned at the acceptance pass). */
export const ENTRANCE_DURATION_MS = 750;
export const ENTRANCE_HOP_HEIGHT = 40;
export const ENTRANCE_START_MARGIN = 90;

export interface EntranceTimeline {
  readonly durationMs: number;
  readonly hopHeight: number;
  readonly rest: Point;
  readonly start: Point;
}

export interface EntranceState {
  readonly elapsedMs: number;
  readonly settled: boolean;
}

export function createEntrance(rest: Point): EntranceTimeline {
  return {
    durationMs: ENTRANCE_DURATION_MS,
    hopHeight: ENTRANCE_HOP_HEIGHT,
    rest,
    start: { x: rest.x, y: FIELD_HEIGHT + ENTRANCE_START_MARGIN },
  };
}

export function entranceStart(): EntranceState {
  return { elapsedMs: 0, settled: false };
}

export function stepEntrance(
  timeline: EntranceTimeline,
  state: EntranceState,
  dtMs: number,
): EntranceState {
  if (state.settled) {
    return state;
  }
  const elapsedMs = Math.min(timeline.durationMs, state.elapsedMs + Math.max(0, dtMs));
  return { elapsedMs, settled: elapsedMs >= timeline.durationMs };
}

/** Early input (the child already touching the path) ends the entrance now. */
export function settleEntrance(timeline: EntranceTimeline, state: EntranceState): EntranceState {
  if (state.settled) {
    return state;
  }
  return { elapsedMs: timeline.durationMs, settled: true };
}

/** Eased hop-in: rises fast, one soft arc, lands exactly at rest. */
export function entrancePos(timeline: EntranceTimeline, state: EntranceState): Point {
  if (state.settled) {
    return timeline.rest;
  }
  const progress = Math.min(1, state.elapsedMs / timeline.durationMs);
  const eased = 1 - (1 - progress) ** 3;
  const lift = Math.sin(Math.PI * progress) * timeline.hopHeight;
  return {
    x: timeline.start.x + (timeline.rest.x - timeline.start.x) * eased,
    y: timeline.start.y + (timeline.rest.y - timeline.start.y) * eased - lift,
  };
}
