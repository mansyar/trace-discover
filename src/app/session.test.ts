import { describe, expect, it } from 'vitest';
import type { TonePlayer, ToneSpec } from '../audio/synth';
import type { Point } from '../engine/types';
import { DINO_LEVELS } from '../themes/dino';
import { type LevelDef, levelToPath } from '../themes/level';
import { createSession, type SessionEvent } from './session';

function fakes() {
  const specs: ToneSpec[] = [];
  const fired: string[] = [];
  const events: SessionEvent[] = [];
  const player: TonePlayer = {
    play: (spec: ToneSpec): void => {
      specs.push(spec);
    },
  };
  return {
    character: {
      fire: (trigger: string): boolean => {
        fired.push(trigger);
        return true;
      },
    },
    events,
    fired,
    player,
    specs,
  };
}

function point(points: readonly Point[], index: number): Point {
  const found = points[index];
  if (!found) {
    throw new Error(`Path point ${index} is missing.`);
  }
  return found;
}

function level(index: number): LevelDef {
  const found = DINO_LEVELS[index];
  if (!found) {
    throw new Error(`Dino level ${index} is missing.`);
  }
  return found;
}

function firstStroke(level: LevelDef): readonly Point[] {
  const points = levelToPath(level)[0];
  if (!points) {
    throw new Error(`Level ${level.id} has no strokes.`);
  }
  return points;
}

const DINO_1 = level(0);

function tracePath(
  session: ReturnType<typeof createSession>,
  stride: number,
  updatesPerMove: number,
): void {
  const points = firstStroke(DINO_1);
  session.pointerDown(point(points, 0));
  for (let i = stride; i < points.length; i += stride) {
    session.pointerMove(point(points, i));
    for (let u = 0; u < updatesPerMove; u += 1) {
      session.update(16);
    }
  }
  session.pointerMove(point(points, points.length - 1));
  for (let u = 0; u < 40; u += 1) {
    session.update(16);
  }
}

describe('level session', () => {
  it('traces a full level to done: chimes, celebration, confetti, parked mascot', () => {
    const f = fakes();
    const session = createSession(DINO_1, {
      character: f.character,
      onEvent: (event) => void f.events.push(event),
      player: f.player,
      seed: 7,
      settings: () => ({ easierTracing: false }),
    });
    tracePath(session, 2, 2);
    // Run the completion timeline to the end (~5.4 s of choreography).
    for (let u = 0; u < 400; u += 1) {
      session.update(16);
    }
    expect(session.success).toBe(true);
    // 5 checkpoint chimes + 3 chord tones + 4 arpeggio notes.
    expect(f.specs).toHaveLength(12);
    expect(f.fired).toEqual(['celebrate']);
    expect(session.snapshot().confetti.length).toBeGreaterThan(0);
    const charPos = session.snapshot().charPos;
    expect(charPos.x).toBeCloseTo(215, 0);
    expect(charPos.y).toBeCloseTo(410, 0);
  });

  it('keeps progress across a finger lift and finishes after resume', () => {
    const f = fakes();
    const session = createSession(DINO_1, {
      character: f.character,
      onEvent: (event) => void f.events.push(event),
      player: f.player,
      seed: 7,
      settings: () => ({ easierTracing: false }),
    });
    const points = firstStroke(DINO_1);
    session.pointerDown(point(points, 0));
    for (let i = 2; i < points.length / 2; i += 2) {
      session.pointerMove(point(points, i));
      session.update(16);
      session.update(16);
    }
    const halfway = session.snapshot().frontier;
    expect(halfway).toBeGreaterThan(0);
    session.pointerUp();
    for (let u = 0; u < 10; u += 1) {
      session.update(16);
    }
    expect(session.snapshot().frontier).toBe(halfway);
    // Resume near the tip and finish.
    const tip = session.snapshot().tip;
    session.pointerDown(tip);
    for (let i = Math.floor(points.length / 2); i < points.length; i += 2) {
      session.pointerMove(point(points, i));
      session.update(16);
      session.update(16);
    }
    session.pointerMove(point(points, points.length - 1));
    for (let u = 0; u < 60; u += 1) {
      session.update(16);
    }
    for (let u = 0; u < 400; u += 1) {
      session.update(16);
    }
    expect(session.success).toBe(true);
  });

  it('widens tolerance after repeated nudges and reports it once', () => {
    const f = fakes();
    const session = createSession(DINO_1, {
      character: f.character,
      onEvent: (event) => void f.events.push(event),
      player: f.player,
      seed: 7,
      settings: () => ({ easierTracing: false }),
    });
    for (let u = 0; u < 500; u += 1) {
      session.update(16);
    }
    expect(session.snapshot().hintVisible).toBe(true);
    expect(f.events.filter((event) => event.type === 'assist-widened')).toHaveLength(1);
  });

  it('does not finish when the finger only taps the goal', () => {
    const f = fakes();
    const session = createSession(DINO_1, {
      character: f.character,
      onEvent: (event) => void f.events.push(event),
      player: f.player,
      seed: 7,
      settings: () => ({ easierTracing: false }),
    });
    const points = firstStroke(DINO_1);
    session.pointerDown(point(points, points.length - 1));
    for (let u = 0; u < 120; u += 1) {
      session.update(16);
    }
    expect(session.success).toBe(false);
    expect(session.snapshot().frontier).toBe(0);
  });
});
