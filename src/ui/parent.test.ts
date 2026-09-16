import { describe, expect, it } from 'vitest';
import {
  changeVolume,
  holdProgress,
  PARENT_GATE_START,
  PARENT_HOLD_MS,
  stepParentGate,
  VOLUME_STEP,
} from './parent';

function hold(totalMs: number, stepMs: number): boolean {
  let state = PARENT_GATE_START;
  let opened = false;
  for (let elapsed = 0; elapsed < totalMs; elapsed += stepMs) {
    const step = stepParentGate(state, true, stepMs);
    state = step.state;
    opened = opened || step.opened;
  }
  return opened;
}

describe('stepParentGate', () => {
  it('stays closed on short holds', () => {
    expect(hold(PARENT_HOLD_MS - 500, 500)).toBe(false);
  });

  it('opens after the target hold in the zone', () => {
    expect(hold(PARENT_HOLD_MS, 500)).toBe(true);
  });

  it('drains gradually after release instead of resetting instantly', () => {
    const held = stepParentGate(PARENT_GATE_START, true, 2000).state;
    const drained = stepParentGate(held, false, 100).state;
    expect(drained.holdMs).toBeGreaterThan(0);
    expect(drained.holdMs).toBeLessThan(held.holdMs);
  });

  it('drains to rest after release and never opens', () => {
    let state = stepParentGate(PARENT_GATE_START, true, 2000).state;
    let opened = false;
    for (let i = 0; i < 10; i += 1) {
      const step = stepParentGate(state, false, 100);
      state = step.state;
      opened = opened || step.opened;
    }
    expect(opened).toBe(false);
    expect(state.holdMs).toBe(0);
  });

  it('resumes from the drained level when the finger returns', () => {
    let state = stepParentGate(PARENT_GATE_START, true, 1000).state;
    state = stepParentGate(state, false, 100).state;
    state = stepParentGate(state, true, 100).state;
    expect(state.holdMs).toBe(600);
  });

  it('fires open exactly once per continuous hold', () => {
    let state = PARENT_GATE_START;
    let opens = 0;
    for (let elapsed = 0; elapsed < PARENT_HOLD_MS + 2000; elapsed += 250) {
      const step = stepParentGate(state, true, 250);
      state = step.state;
      if (step.opened) {
        opens += 1;
      }
    }
    expect(opens).toBe(1);
  });

  it('ignores zero and negative time steps', () => {
    const state = stepParentGate(PARENT_GATE_START, true, 0).state;
    expect(state.holdMs).toBe(0);
    const rewound = stepParentGate(PARENT_GATE_START, true, -500).state;
    expect(rewound.holdMs).toBe(0);
  });
});

describe('holdProgress', () => {
  it('fills 0 → 1 across the hold and clamps past the threshold', () => {
    expect(holdProgress(PARENT_GATE_START)).toBe(0);
    expect(holdProgress({ holdMs: PARENT_HOLD_MS / 2 })).toBe(0.5);
    expect(holdProgress({ holdMs: PARENT_HOLD_MS })).toBe(1);
    expect(holdProgress({ holdMs: PARENT_HOLD_MS * 3 })).toBe(1);
  });
});

describe('changeVolume', () => {
  it('steps the volume by one notch', () => {
    expect(changeVolume(0.5, VOLUME_STEP)).toBe(0.6);
    expect(changeVolume(0.5, -VOLUME_STEP)).toBe(0.4);
  });

  it('clamps at silence and full volume', () => {
    expect(changeVolume(0.95, VOLUME_STEP)).toBe(1);
    expect(changeVolume(0.05, -VOLUME_STEP)).toBe(0);
  });
});
