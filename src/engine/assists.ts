/** Tuning for the no-fail assist system. */
export interface AssistConfig {
  /** Idle time (ms) before a star nudge fires. */
  readonly nudgeAfterMs: number;
  /** Idle time (ms) before the animated hand hint appears. */
  readonly hintAfterMs: number;
  /** Nudges in one level before tolerance quietly widens for the session. */
  readonly nudgesPerWiden: number;
  /** Arc-length lookahead (px) for the nudge target. */
  readonly lookaheadPx: number;
  /** Tolerance multiplier once assists kick in. */
  readonly widenFactor: number;
}

/** Spec defaults: 2 s nudge, 4 s hint, widen after 3 nudges, 1.5x tolerance. */
export const DEFAULT_ASSIST_CONFIG: AssistConfig = {
  nudgeAfterMs: 2000,
  hintAfterMs: 4000,
  nudgesPerWiden: 3,
  lookaheadPx: 120,
  widenFactor: 1.5,
};

/** Assist progress for one level attempt. */
export interface AssistState {
  /** Time since the frontier last advanced. */
  readonly idleMs: number;
  /** Nudges fired during the current idle stretch. */
  readonly nudgesThisIdle: number;
  /** Nudges fired during the whole level. */
  readonly nudgesTotal: number;
  /** Whether the animated hand hint should currently be visible. */
  readonly hintVisible: boolean;
}

/** Fresh assist state for a new level attempt. */
export const ASSIST_START: AssistState = {
  idleMs: 0,
  nudgesThisIdle: 0,
  nudgesTotal: 0,
  hintVisible: false,
};

/** Per-frame input for the assist system. */
export interface AssistInput {
  /** Did the frontier advance this frame? */
  readonly advanced: boolean;
  /** Is a finger currently down? */
  readonly touching: boolean;
  /** Current frontier arc position. */
  readonly frontier: number;
  /** Trail total length. */
  readonly total: number;
}

/** Result of one assist step. */
export interface AssistStep {
  readonly state: AssistState;
  /** Arc position a nudge should hint toward, or `null` when no nudge fired this frame. */
  readonly nudgeTarget: number | null;
}

/**
 * Advances the assist timers. Nudges fire every `nudgeAfterMs` of continuous
 * idle (2 s, then 4 s, then 6 s, ...) and point just ahead of the frontier.
 * The hand hint shows whenever the child is stuck past `hintAfterMs` and not
 * touching; it hides the moment a finger lands.
 */
export function stepAssists(
  config: AssistConfig,
  state: AssistState,
  input: AssistInput,
  dtMs: number,
): AssistStep {
  const idleMs = input.advanced ? 0 : state.idleMs + dtMs;
  let nudgesThisIdle = input.advanced ? 0 : state.nudgesThisIdle;
  let nudgesTotal = state.nudgesTotal;
  let nudgeTarget: number | null = null;
  if (!input.advanced && idleMs >= config.nudgeAfterMs * (nudgesThisIdle + 1)) {
    nudgeTarget = Math.min(input.frontier + config.lookaheadPx, input.total);
    nudgesThisIdle += 1;
    nudgesTotal += 1;
  }
  const hintVisible = !input.touching && idleMs >= config.hintAfterMs;
  return {
    state: { idleMs, nudgesThisIdle, nudgesTotal, hintVisible },
    nudgeTarget,
  };
}

/** Tolerance multiplier: parent override or 3+ nudges widen; otherwise 1. */
export function toleranceScale(
  config: AssistConfig,
  state: AssistState,
  parentEasier: boolean,
): number {
  return parentEasier || state.nudgesTotal >= config.nudgesPerWiden ? config.widenFactor : 1;
}
