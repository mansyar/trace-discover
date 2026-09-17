// Parent-zone gate: one finger held in the corner zone for ~2.5s opens the
// parent zone (volume, easier tracing, reset, install guide). Releasing early
// drains the held progress; a second finger is irrelevant. Reset-with-confirm
// flow and install copy live in shell wiring; this module holds the testable
// timing + volume math.
export const PARENT_HOLD_MS = 2500; // device-tuned within 2.0–3.0s
/** Time for a full hold to drain back to rest after the finger lifts. */
const PARENT_DRAIN_MS = 500;
export const VOLUME_STEP = 0.1;

export interface ParentGateState {
  readonly holdMs: number;
}

export const PARENT_GATE_START: ParentGateState = { holdMs: 0 };

export interface ParentGateStep {
  readonly opened: boolean;
  readonly state: ParentGateState;
}

export function stepParentGate(
  state: ParentGateState,
  qualifying: boolean,
  dtMs: number,
): ParentGateStep {
  const dt = Math.max(0, dtMs);
  if (!qualifying) {
    const holdMs = Math.max(0, state.holdMs - (dt * PARENT_HOLD_MS) / PARENT_DRAIN_MS);
    return { opened: false, state: { holdMs } };
  }
  const holdMs = state.holdMs + dt;
  return {
    opened: state.holdMs < PARENT_HOLD_MS && holdMs >= PARENT_HOLD_MS,
    state: { holdMs },
  };
}

/** Fills 0 → 1 across the hold; clamps once past the threshold. */
export function holdProgress(state: ParentGateState): number {
  return Math.min(1, state.holdMs / PARENT_HOLD_MS);
}

export function changeVolume(current: number, delta: number): number {
  const stepped = Math.round((current + delta) * 10) / 10;
  return Math.min(1, Math.max(0, stepped));
}

/** Filled pips (0–5) for the Sound card; clamps hostile values. */
export function volumePips(volume: number): number {
  return Math.ceil(Math.min(1, Math.max(0, volume)) * 5);
}
