import { type NearestResult, nearestOnPath } from './path';
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

/** Prepared trail: dense points + arc-length segments + tuning. */
export interface Trail {
  readonly points: readonly Point[];
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
  return { points, segments, total, config };
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
  if (nearest.distance > trail.config.tolerance || tipGap > trail.config.tolerance) {
    return state;
  }
  const target = arcLengthAt(trail, nearest);
  const cappedTarget = Math.min(target, state.frontier + trail.config.maxAdvanceSpeed * dtSeconds);
  if (cappedTarget <= state.frontier) {
    return state;
  }
  return { frontier: cappedTarget, tracing: true };
}

/** Point on the path at the frontier, clamped to the trail's extent. */
export function tipPosition(trail: Trail, state: TrailState): Point {
  const target = Math.min(Math.max(state.frontier, 0), trail.total);
  const segment =
    trail.segments.find((candidate) => target <= candidate.endLength) ??
    trail.segments[trail.segments.length - 1];
  if (!segment) {
    return { x: 0, y: 0 };
  }
  const span = segment.endLength - segment.startLength;
  const t = span > 0 ? Math.min(1, Math.max(0, (target - segment.startLength) / span)) : 0;
  return {
    x: segment.from.x + (segment.to.x - segment.from.x) * t,
    y: segment.from.y + (segment.to.y - segment.from.y) * t,
  };
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
