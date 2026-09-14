import type { Trail } from './trail';

/** Checkpoint layout: arc-length positions where progress events fire. */
export interface Checkpoints {
  /** Crossing boundaries in order; the last one equals the trail's total length. */
  readonly boundaries: readonly number[];
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
  const boundaries: number[] = [];
  for (let i = 0; i < count; i += 1) {
    boundaries.push(i === count - 1 ? trail.total : (trail.total * (i + 1)) / count);
  }
  return { boundaries };
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
