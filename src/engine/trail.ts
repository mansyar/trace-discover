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
  const target =
    finishingLoop || isFinishingAtEnd(trail, state, x, y)
      ? trail.total
      : arcLengthAt(trail, nearest);
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

/**
 * Finger dwelling within tolerance of an open path's end while the tip is past
 * halfway: finish intent. Without it, a fingertip that stops a few px short
 * (or endpoint projection float rounding) strands the frontier just below the
 * total and the level never completes.
 */
function isFinishingAtEnd(trail: Trail, state: TrailState, x: number, y: number): boolean {
  if (state.frontier <= trail.total / 2) {
    return false;
  }
  const last = trail.points[trail.points.length - 1];
  if (!last) {
    return false;
  }
  return Math.hypot(x - last.x, y - last.y) <= trail.config.tolerance;
}

/** Ready-to-trace path for a level with one or more ordered strokes. */
export interface MultiTrail {
  /** Prepared paths, one per stroke, traced in order. */
  readonly strokes: readonly Trail[];
  /** Sum of all stroke lengths (px). */
  readonly total: number;
  readonly config: TrailConfig;
}

/** Multi-stroke progress: the active stroke plus its frontier. */
export interface MultiTrailState extends TrailState {
  /** Index of the stroke currently being traced; only ever increases. */
  readonly strokeIndex: number;
}

/** Fresh state for a new multi-stroke level attempt. */
export const MULTI_TRAIL_START: MultiTrailState = {
  frontier: 0,
  strokeIndex: 0,
  tracing: false,
};

/** Marks a finger down on a multi-stroke trail. */
export function beginMultiStroke(state: MultiTrailState): MultiTrailState {
  return { ...state, tracing: true };
}

/** Marks a finger up; per-stroke progress is kept. */
export function endMultiStroke(state: MultiTrailState): MultiTrailState {
  return { ...state, tracing: false };
}

/** Prepares each stroke (e.g. from `levelToPath`) for sequential tracing. */
export function createMultiTrail(
  strokePoints: readonly (readonly Point[])[],
  config: TrailConfig,
): MultiTrail {
  const strokes = strokePoints.map((points) => createTrail(points, config));
  return {
    strokes,
    total: strokes.reduce((sum, stroke) => sum + stroke.total, 0),
    config,
  };
}

/**
 * Advances the frontier one frame on the active stroke. When that stroke
 * reaches its end, tracing hands over to the next stroke immediately (the next
 * stroke lights up as the active one); the finger must still start near its
 * start point before the frontier advances (the same gates as a fresh touch
 * apply). Completed strokes are never revisited, so the per-stroke frontier
 * and the stroke index never decrease.
 */
export function advanceMultiTrail(
  trail: MultiTrail,
  state: MultiTrailState,
  x: number,
  y: number,
  dtSeconds: number,
): MultiTrailState {
  if (!state.tracing) {
    return state;
  }
  const stroke = trail.strokes[state.strokeIndex];
  if (!stroke) {
    return state;
  }
  const advanced = advanceTrail(stroke, state, x, y, dtSeconds);
  if (advanced.frontier === state.frontier) {
    return state;
  }
  if (advanced.frontier >= stroke.total && trail.strokes[state.strokeIndex + 1]) {
    // Completed: hand over immediately so the next stroke lights up as the
    // one to trace. The finger still has to start near its start point
    // (the same tip-gap gate that guards every fresh stroke).
    return { frontier: 0, strokeIndex: state.strokeIndex + 1, tracing: true };
  }
  return { frontier: advanced.frontier, strokeIndex: state.strokeIndex, tracing: true };
}

/** Point on the active stroke at the frontier, clamped to that stroke's extent. */
export function multiTipPosition(trail: MultiTrail, state: MultiTrailState): Point {
  const stroke = trail.strokes[state.strokeIndex];
  if (!stroke) {
    return { x: 0, y: 0 };
  }
  return pointAtLength(stroke.points, stroke.cumulative, state.frontier);
}

/** Arc length from the sequence start up to (but not including) one stroke. */
export function strokeStartArc(trail: MultiTrail, index: number): number {
  let start = 0;
  for (let i = 0; i < index; i += 1) {
    start += trail.strokes[i]?.total ?? 0;
  }
  return start;
}

/** Point on the whole sequence at a global arc distance, clamped to the end. */
export function pointAtSequence(trail: MultiTrail, distance: number): Point {
  let remaining = distance;
  for (const stroke of trail.strokes) {
    if (remaining <= stroke.total) {
      return pointAtLength(stroke.points, stroke.cumulative, remaining);
    }
    remaining -= stroke.total;
  }
  const last = trail.strokes[trail.strokes.length - 1];
  return last ? pointAtLength(last.points, last.cumulative, last.total) : { x: 0, y: 0 };
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
