import { describe, expect, it } from 'vitest';
import { ASSIST_START, DEFAULT_ASSIST_CONFIG, stepAssists, toleranceScale } from './assists';

const CONFIG = DEFAULT_ASSIST_CONFIG;
const TOTAL = 400;

function idle(frontier: number, dtMs: number) {
  return stepAssists(
    CONFIG,
    ASSIST_START,
    { advanced: false, touching: false, frontier, total: TOTAL },
    dtMs,
  );
}

describe('assists', () => {
  it('fires a nudge after 2 s without progress, targeting just ahead of the frontier', () => {
    const before = idle(0, 1999);
    expect(before.nudgeTarget).toBeNull();
    const at = idle(0, 2000);
    expect(at.nudgeTarget).toBe(120);
    expect(at.state.nudgesTotal).toBe(1);
  });

  it('clamps the nudge target to the trail end', () => {
    const at = idle(300, 2000);
    expect(at.nudgeTarget).toBe(TOTAL);
  });

  it('fires repeated nudges during one long idle stretch', () => {
    let step = idle(0, 2000);
    expect(step.state.nudgesTotal).toBe(1);
    step = stepAssists(
      CONFIG,
      step.state,
      { advanced: false, touching: false, frontier: 0, total: TOTAL },
      2000,
    );
    expect(step.nudgeTarget).not.toBeNull();
    expect(step.state.nudgesTotal).toBe(2);
    step = stepAssists(
      CONFIG,
      step.state,
      { advanced: false, touching: false, frontier: 0, total: TOTAL },
      2000,
    );
    expect(step.nudgeTarget).not.toBeNull();
    expect(step.state.nudgesTotal).toBe(3);
  });

  it('resets the idle timer and nudge countdown on progress', () => {
    const nudged = idle(0, 2000);
    expect(nudged.nudgeTarget).not.toBeNull();
    const progressed = stepAssists(
      CONFIG,
      nudged.state,
      { advanced: true, touching: true, frontier: 10, total: TOTAL },
      16,
    );
    expect(progressed.state.idleMs).toBe(0);
    expect(progressed.nudgeTarget).toBeNull();
    const waiting = stepAssists(
      CONFIG,
      progressed.state,
      { advanced: false, touching: true, frontier: 10, total: TOTAL },
      1999,
    );
    expect(waiting.nudgeTarget).toBeNull();
  });

  it('shows the hand hint after 4 s and hides it while touching', () => {
    const shown = idle(0, 4000);
    expect(shown.state.hintVisible).toBe(true);
    const touching = stepAssists(
      CONFIG,
      shown.state,
      { advanced: false, touching: true, frontier: 0, total: TOTAL },
      16,
    );
    expect(touching.state.hintVisible).toBe(false);
  });

  it('clears the hint when progress happens', () => {
    const shown = idle(0, 4000);
    expect(shown.state.hintVisible).toBe(true);
    const progressed = stepAssists(
      CONFIG,
      shown.state,
      { advanced: true, touching: false, frontier: 20, total: TOTAL },
      16,
    );
    expect(progressed.state.hintVisible).toBe(false);
  });

  it('widens tolerance only after 3 nudges in the level', () => {
    let step = idle(0, 2000);
    step = stepAssists(
      CONFIG,
      step.state,
      { advanced: false, touching: false, frontier: 0, total: TOTAL },
      2000,
    );
    expect(toleranceScale(CONFIG, step.state, false)).toBe(1);
    step = stepAssists(
      CONFIG,
      step.state,
      { advanced: false, touching: false, frontier: 0, total: TOTAL },
      2000,
    );
    expect(step.state.nudgesTotal).toBe(3);
    expect(toleranceScale(CONFIG, step.state, false)).toBe(CONFIG.widenFactor);
  });

  it('lets the parent override widen tolerance from the start', () => {
    expect(toleranceScale(CONFIG, ASSIST_START, true)).toBe(CONFIG.widenFactor);
    expect(toleranceScale(CONFIG, ASSIST_START, false)).toBe(1);
  });
});
