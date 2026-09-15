import type { MultiTrail, Trail } from './trail';

/** Checkpoint layout: arc-length positions where progress events fire. */
export interface Checkpoints {
  /** Crossing boundaries in order; the last one equals the trail's total length. */
  readonly boundaries: readonly number[];
}

/**
 * Multi-stroke checkpoint layout: boundaries span the whole stroke sequence as
 * global arc lengths; the last one equals the summed total. `strokeStarts`
 * maps an active stroke (plus its frontier) onto that global arc.
 */
export interface MultiCheckpoints extends Checkpoints {
  /** Global arc length at the start of each stroke (prefix sums). */
  readonly strokeStarts: readonly number[];
}

/** Checkpoint progress for one level attempt. */
export interface CheckpointState {
  /** Number of boundaries already crossed. */
  readonly passed: number;
  /** True once the final boundary (trail end) has been crossed. */
  readonly completed: boolean;
}

/** Fresh checkpoint state for a new level attempt. */
export const CHECKPOINT_START: CheckpointState = { passed: 0, completed: false };

/** Events emitted when the frontier crosses boundaries. */
export type CheckpointEvent =
  | { readonly type: 'checkpoint'; readonly index: number }
  | { readonly type: 'complete' };

/** Result of one evaluation step. */
export interface CheckpointResult {
  readonly state: CheckpointState;
  readonly events: readonly CheckpointEvent[];
}

/**
 * Divides the trail into `count` equal arc-length checkpoints. The last
 * boundary equals the trail's total length and represents completion.
 */
export function createCheckpoints(trail: Trail, count: number): Checkpoints {
  return { boundaries: equalBoundaries(trail.total, count) };
}

/**
 * Evaluates the frontier against the checkpoint plan, emitting every newly
 * crossed boundary in order. Crossing the final boundary emits `complete`
 * (instead of a checkpoint event) and marks the state completed.
 */
export function evaluateCheckpoints(
  checkpoints: Checkpoints,
  state: CheckpointState,
  frontier: number,
): CheckpointResult {
  if (state.completed) {
    return { state, events: [] };
  }
  const events: CheckpointEvent[] = [];
  let passed = state.passed;
  while (passed < checkpoints.boundaries.length) {
    const boundary = checkpoints.boundaries[passed];
    if (boundary === undefined || frontier < boundary) {
      break;
    }
    events.push(
      passed === checkpoints.boundaries.length - 1
        ? { type: 'complete' }
        : { type: 'checkpoint', index: passed },
    );
    passed += 1;
  }
  if (events.length === 0) {
    return { state, events };
  }
  return {
    state: { passed, completed: passed === checkpoints.boundaries.length },
    events,
  };
}

/**
 * Divides the whole stroke sequence into `count` equal global arc-length
 * checkpoints. The last boundary equals the sequence total and represents
 * completion.
 */
export function createMultiCheckpoints(trail: MultiTrail, count: number): MultiCheckpoints {
  const strokeStarts: number[] = [];
  let start = 0;
  for (const stroke of trail.strokes) {
    strokeStarts.push(start);
    start += stroke.total;
  }
  return { boundaries: equalBoundaries(trail.total, count), strokeStarts };
}

/**
 * Evaluates a multi-stroke position against the boundary plan by mapping
 * `(strokeIndex, frontier)` onto the global arc, so events fire in order
 * across strokes and `complete` only lands after the final stroke.
 */
export function evaluateMultiCheckpoints(
  checkpoints: MultiCheckpoints,
  state: CheckpointState,
  strokeIndex: number,
  frontier: number,
): CheckpointResult {
  const start = checkpoints.strokeStarts[strokeIndex] ?? 0;
  return evaluateCheckpoints(checkpoints, state, start + frontier);
}

/** Equal arc-length boundaries ending exactly at `total`. */
function equalBoundaries(total: number, count: number): number[] {
  const boundaries: number[] = [];
  for (let i = 0; i < count; i += 1) {
    boundaries.push(i === count - 1 ? total : (total * (i + 1)) / count);
  }
  return boundaries;
}
