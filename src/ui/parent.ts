// Parent-zone gate: two fingers held in the corner zone for three
// continuous seconds opens the parent zone (volume, easier tracing,
// reset, install guide). Reset-with-confirm flow and install copy live
// in shell wiring; this module holds the testable timing + volume math.
export const PARENT_HOLD_MS = 3000;
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
  if (!qualifying) {
    return { opened: false, state: PARENT_GATE_START };
  }
  const holdMs = state.holdMs + Math.max(0, dtMs);
  return {
    opened: state.holdMs < PARENT_HOLD_MS && holdMs >= PARENT_HOLD_MS,
    state: { holdMs },
  };
}

export function changeVolume(current: number, delta: number): number {
  const stepped = Math.round((current + delta) * 10) / 10;
  return Math.min(1, Math.max(0, stepped));
}
