import { cumulativeLengths, type NearestResult, nearestOnPath, pointAtLength } from './path';
import type { Point } from './types';

/** Tuning for the trail-tip state machine, in play-field pixels. */
export interface TrailConfig {
  /** Max distance (px) the finger may stray from the path and the tip while still advancing. */
  readonly tolerance: number;
  /** Max frontier advance speed (px per second); caps how fast the tip chases the finger. */
  readonly maxAdvanceSpeed: number;
}

/** One straight run between two resampled path points. */
interface TrailSegment {
  readonly from: Point;
  readonly to: Point;
  readonly startLength: number;
  readonly endLength: number;
}

/** Prepared trail: dense points + arc lengths + tuning. */
export interface Trail {
  readonly points: readonly Point[];
  readonly cumulative: readonly number[];
  readonly segments: readonly TrailSegment[];
  readonly total: number;
  readonly config: TrailConfig;
}

/** Trail progress. `frontier` is an arc-length position (px); it never decreases. */
export interface TrailState {
  readonly frontier: number;
  readonly tracing: boolean;
}

/** Fresh state for a new level attempt. */
export const TRAIL_START: TrailState = { frontier: 0, tracing: false };

/** Prepares a dense path (e.g. from `catmullRom` + `resample`) for tracing. */
export function createTrail(points: readonly Point[], config: TrailConfig): Trail {
  const segments: TrailSegment[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const from = points[i - 1];
    const to = points[i];
    if (from && to) {
      const endLength = total + Math.hypot(to.x - from.x, to.y - from.y);
      segments.push({ from, to, startLength: total, endLength });
      total = endLength;
    }
  }
  return { points, cumulative: cumulativeLengths(points), segments, total, config };
}

/** Marks a finger down. */
export function beginStroke(state: TrailState): TrailState {
  return { ...state, tracing: true };
}

/** Marks a finger up; progress is kept. */
export function endStroke(state: TrailState): TrailState {
  return { ...state, tracing: false };
}

/**
 * Advances the frontier one frame toward the finger. The finger must be within
 * `tolerance` of both the path and the current tip; the advance per frame is
 * capped by `maxAdvanceSpeed`, and the frontier never decreases.
 */
export function advanceTrail(
  trail: Trail,
  state: TrailState,
  x: number,
  y: number,
  dtSeconds: number,
): TrailState {
  if (!state.tracing) {
    return state;
  }
  const nearest = nearestOnPath(trail.points, x, y);
  const tip = tipPosition(trail, state);
  const tipGap = Math.hypot(x - tip.x, y - tip.y);
  // Closed loop (bonus circles): start and goal coincide, so a finger dwelling
  // on the goal snaps to the path start by global-nearest and the tip can lag
  // past tolerance on the final stretch. Past halfway, a finger at the goal
  // means finish intent: resolve to the path end and let the capped tip catch
  // up. Open paths keep both gates, so goal taps still cannot skip.
  const finishingLoop = isFinishingClosedLoop(trail, state, x, y);
  if (
    !finishingLoop &&
    (nearest.distance > trail.config.tolerance || tipGap > trail.config.tolerance)
  ) {
    return state;
  }
  const target = finishingLoop ? trail.total : arcLengthAt(trail, nearest);
  const cappedTarget = Math.min(target, state.frontier + trail.config.maxAdvanceSpeed * dtSeconds);
  if (cappedTarget <= state.frontier) {
    return state;
  }
  return { frontier: cappedTarget, tracing: true };
}

/** Point on the path at the frontier, clamped to the trail's extent. */
export function tipPosition(trail: Trail, state: TrailState): Point {
  return pointAtLength(trail.points, trail.cumulative, state.frontier);
}

/** Finger at the goal of a closed loop with the tip past halfway: finish intent. */
function isFinishingClosedLoop(trail: Trail, state: TrailState, x: number, y: number): boolean {
  const points = trail.points;
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last || state.frontier <= trail.total / 2) {
    return false;
  }
  const closedGap = Math.hypot(last.x - first.x, last.y - first.y);
  if (closedGap > trail.config.tolerance) {
    return false;
  }
  return Math.hypot(x - last.x, y - last.y) <= trail.config.tolerance;
}

function arcLengthAt(trail: Trail, nearest: NearestResult): number {
  const segment = trail.segments[nearest.index];
  if (!segment) {
    return 0;
  }
  return (
    segment.startLength +
    Math.hypot(nearest.point.x - segment.from.x, nearest.point.y - segment.from.y)
  );
}
