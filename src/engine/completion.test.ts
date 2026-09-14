import { describe, expect, it } from 'vitest';

import {
  COMPLETION_START,
  type CompletionEvent,
  type CompletionState,
  DEFAULT_COMPLETION_CONFIG,
  hopDurationMs,
  stepCompletion,
  travelProgress,
} from './completion';

function runSequence(totalLength: number, dtMs: number) {
  let state: CompletionState = COMPLETION_START;
  const events: CompletionEvent[] = [];
  for (let frame = 0; frame < 400 && state.stage !== 'done'; frame += 1) {
    const stepped = stepCompletion(DEFAULT_COMPLETION_CONFIG, state, dtMs, totalLength);
    events.push(...stepped.events);
    state = stepped.state;
  }
  return { events, state };
}

describe('hopDurationMs', () => {
  it('clamps to min and max around the path-length estimate', () => {
    expect(hopDurationMs(DEFAULT_COMPLETION_CONFIG, 100)).toBe(800);
    expect(hopDurationMs(DEFAULT_COMPLETION_CONFIG, 1000)).toBeCloseTo(2380.95, 1);
    expect(hopDurationMs(DEFAULT_COMPLETION_CONFIG, 5000)).toBe(3000);
  });
});

describe('stepCompletion', () => {
  it('runs the full choreography with one burst at half way', () => {
    const { events, state } = runSequence(1000, 100);
    expect(events).toEqual([
      'hopStart',
      'burst',
      'land',
      'celebrateStart',
      'confettiStart',
      'stickerStart',
      'done',
    ]);
    expect(state.stage).toBe('done');
  });

  it('does not burst before the half-way point', () => {
    const earlyHop: CompletionState = { burstFired: false, elapsedMs: 0, stage: 'hop' };
    const stepped = stepCompletion(DEFAULT_COMPLETION_CONFIG, earlyHop, 100, 1000);
    expect(stepped.events).toEqual([]);
    expect(stepped.state.stage).toBe('hop');
  });

  it('stays done with no further events', () => {
    const done: CompletionState = { burstFired: true, elapsedMs: 0, stage: 'done' };
    const stepped = stepCompletion(DEFAULT_COMPLETION_CONFIG, done, 100, 1000);
    expect(stepped.events).toEqual([]);
    expect(stepped.state.stage).toBe('done');
  });
});

describe('travelProgress', () => {
  it('is 0 during glow, crosses half mid-hop, and ends at 1', () => {
    expect(travelProgress(COMPLETION_START, DEFAULT_COMPLETION_CONFIG, 1000)).toBe(0);
    const hopMs = hopDurationMs(DEFAULT_COMPLETION_CONFIG, 1000);
    const mid: CompletionState = { burstFired: false, elapsedMs: hopMs / 2, stage: 'hop' };
    expect(travelProgress(mid, DEFAULT_COMPLETION_CONFIG, 1000)).toBeCloseTo(0.5, 6);
    const celebrating: CompletionState = { burstFired: true, elapsedMs: 0, stage: 'celebrate' };
    expect(travelProgress(celebrating, DEFAULT_COMPLETION_CONFIG, 1000)).toBe(1);
  });
});
