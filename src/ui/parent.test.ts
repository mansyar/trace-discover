import { describe, expect, it } from 'vitest';
import {
  changeVolume,
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

  it('opens after three continuous seconds in the zone', () => {
    expect(hold(PARENT_HOLD_MS, 500)).toBe(true);
  });

  it('restarts the timer when the hold breaks early', () => {
    let state = stepParentGate(PARENT_GATE_START, true, 2000).state;
    state = stepParentGate(state, false, 100).state;
    expect(state.holdMs).toBe(0);
    expect(hold(PARENT_HOLD_MS, 500)).toBe(true);
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
