import { describe, expect, it } from 'vitest';
import {
  presetForInstrument,
  TOY_PIANO_PRESET,
  type TonePlayer,
  type ToneSpec,
} from '../audio/synth';
import { hopPlacement, hopTimeline } from '../character/hops';
import { pointAtSequence } from '../engine/trail';
import type { Point } from '../engine/types';
import { type LevelDef, levelToPath } from '../packs/level';
import { NUMERAL_LEVELS } from '../packs/numbers';
import { PRE_LEVELS } from '../packs/pre';
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
  const found = PRE_LEVELS[index];
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

function numeral(id: string): LevelDef {
  const found = NUMERAL_LEVELS.find((candidate) => candidate.id === id);
  if (!found) {
    throw new Error(`Numeral ${id} is missing.`);
  }
  return found;
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

  it('runs a two-stroke numeral as one session: hand-over, chimes, parked mascot', () => {
    const f = fakes();
    const numeral = NUMERAL_LEVELS.find((candidate) => candidate.id === 'num-4');
    if (!numeral) {
      throw new Error('Numeral num-4 is missing.');
    }
    const session = createSession(numeral, {
      character: f.character,
      onEvent: (event) => void f.events.push(event),
      player: f.player,
      seed: 7,
      settings: () => ({ easierTracing: false }),
    });
    const paths = levelToPath(numeral);
    const first = paths[0];
    const second = paths[1];
    if (!first || !second) {
      throw new Error('num-4 must have two strokes.');
    }
    session.pointerDown(point(first, 0));
    for (let i = 2; i < first.length; i += 2) {
      session.pointerMove(point(first, i));
      session.update(16);
      session.update(16);
    }
    session.pointerMove(point(first, first.length - 1));
    for (let u = 0; u < 40; u += 1) {
      session.update(16);
    }
    session.pointerUp();
    expect(session.success).toBe(false);
    // Completing the bar hands the glow over to the stem immediately.
    expect(session.snapshot().multiState.strokeIndex).toBe(1);
    session.pointerDown(point(second, 0));
    for (let i = 2; i < second.length; i += 2) {
      session.pointerMove(point(second, i));
      session.update(16);
      session.update(16);
    }
    session.pointerMove(point(second, second.length - 1));
    for (let u = 0; u < 40; u += 1) {
      session.update(16);
    }
    expect(session.snapshot().multiState.strokeIndex).toBe(1);
    for (let u = 0; u < 500; u += 1) {
      session.update(16);
    }
    expect(session.success).toBe(true);
    // 5 checkpoint chimes + 3 chord tones + 4 arpeggio notes.
    expect(f.specs).toHaveLength(12);
    expect(f.fired).toEqual(['celebrate']);
    const charPos = session.snapshot().charPos;
    expect(charPos.x).toBeCloseTo(215, 0);
    expect(charPos.y).toBeCloseTo(410, 0);
  });

  it('clamps nudge hints to the active stroke', () => {
    const f = fakes();
    const numeral = NUMERAL_LEVELS.find((candidate) => candidate.id === 'num-4');
    if (!numeral) {
      throw new Error('Numeral num-4 is missing.');
    }
    const session = createSession(numeral, {
      character: f.character,
      onEvent: (event) => void f.events.push(event),
      player: f.player,
      seed: 7,
      settings: () => ({ easierTracing: false }),
    });
    const first = levelToPath(numeral)[0];
    if (!first) {
      throw new Error('num-4 must have a first stroke.');
    }
    session.pointerDown(point(first, 0));
    // Stops short of the end so this stroke is still the active one.
    for (let i = 2; i < first.length - 4; i += 2) {
      session.pointerMove(point(first, i));
      session.update(16);
      session.update(16);
    }
    session.pointerUp();
    for (let u = 0; u < 130; u += 1) {
      session.update(16);
    }
    const snapshot = session.snapshot();
    const active = snapshot.multi.strokes[0];
    if (!active) {
      throw new Error('num-4 must have a first stroke.');
    }
    expect(snapshot.nudgeAt).toBe(active.total);
  });
});

describe('numeral reward plan', () => {
  function traceNumeral(session: ReturnType<typeof createSession>, points: readonly Point[]): void {
    session.pointerDown(point(points, 0));
    for (let i = 2; i < points.length; i += 2) {
      session.pointerMove(point(points, i));
      session.update(16);
      session.update(16);
    }
    session.pointerMove(point(points, points.length - 1));
    for (let u = 0; u < 60; u += 1) {
      session.update(16);
    }
    session.pointerUp();
  }

  function settleToReward(session: ReturnType<typeof createSession>): void {
    for (let u = 0; u < 100 && session.snapshot().completion.stage !== 'hop'; u += 1) {
      session.update(16);
    }
  }

  it('schedules one toy-piano note per hop and lifts the guide along the arc', () => {
    const f = fakes();
    const plan = hopTimeline(3);
    const target = numeral('num-3');
    const session = createSession(target, {
      character: f.character,
      hopPlan: plan,
      onEvent: (event) => void f.events.push(event),
      player: f.player,
      seed: 7,
      settings: () => ({ easierTracing: false }),
    });
    traceNumeral(session, firstStroke(target));
    settleToReward(session);
    const toy = f.specs.filter(
      (spec) => spec.type === TOY_PIANO_PRESET.type && spec.gain === TOY_PIANO_PRESET.gain,
    );
    expect(toy).toHaveLength(3);
    toy.forEach((spec, index) => {
      expect(spec.delay).toBeCloseTo((plan.hopMs * (index + 1)) / 1000, 9);
    });
    const frequencies = toy.map((spec) => spec.frequency);
    expect(frequencies[1]).toBeGreaterThan(frequencies[0] ?? 0);
    expect(frequencies[2]).toBeGreaterThan(frequencies[1] ?? 0);
    for (let u = 0; u < 13; u += 1) {
      session.update(16);
    }
    const mid = session.snapshot();
    const placement = hopPlacement(plan, mid.completion.elapsedMs);
    const base = pointAtSequence(mid.multi, mid.multi.total * placement.progress);
    expect(base.y - mid.charPos.y).toBeGreaterThan(20);
    expect(mid.charPos.x).toBeCloseTo(base.x, 3);
    for (let u = 0; u < 400 && !session.success; u += 1) {
      session.update(16);
    }
    expect(session.success).toBe(true);
    expect(f.fired).toEqual(['celebrate']);
  });

  it('gives 0 a single midpoint note on its ring move', () => {
    const f = fakes();
    const target = numeral('num-0');
    const session = createSession(target, {
      character: f.character,
      hopPlan: hopTimeline(0),
      onEvent: (event) => void f.events.push(event),
      player: f.player,
      seed: 7,
      settings: () => ({ easierTracing: false }),
    });
    traceNumeral(session, firstStroke(target));
    settleToReward(session);
    const toy = f.specs.filter(
      (spec) => spec.type === TOY_PIANO_PRESET.type && spec.gain === TOY_PIANO_PRESET.gain,
    );
    expect(toy).toHaveLength(1);
    expect(toy[0]?.delay).toBeCloseTo(0.45, 9);
    for (let u = 0; u < 400 && !session.success; u += 1) {
      session.update(16);
    }
    expect(session.success).toBe(true);
  });

  it('lets easier tracing widen the corridor for numerals', () => {
    const target = numeral('num-1');
    const stroke = firstStroke(target);
    const offset = 60;
    const plain = fakes();
    const eased = fakes();
    const base = createSession(target, {
      character: plain.character,
      onEvent: (event) => void plain.events.push(event),
      player: plain.player,
      seed: 7,
      settings: () => ({ easierTracing: false }),
    });
    const wider = createSession(target, {
      character: eased.character,
      onEvent: (event) => void eased.events.push(event),
      player: eased.player,
      seed: 7,
      settings: () => ({ easierTracing: true }),
    });
    const start = point(stroke, 0);
    base.pointerDown(start);
    wider.pointerDown(start);
    for (let i = 1; i < stroke.length; i += 1) {
      const p = point(stroke, i);
      base.pointerMove({ x: p.x + offset, y: p.y });
      wider.pointerMove({ x: p.x + offset, y: p.y });
      base.update(16);
      wider.update(16);
    }
    expect(base.snapshot().multiState.frontier).toBe(0);
    expect(wider.snapshot().multiState.frontier).toBeGreaterThan(0);
  });
});

const TWO_STROKE: LevelDef = {
  goal: { x: 300, y: 400 },
  goalArt: '/art/goal/reflow.webp',
  id: 'reflow-two',
  stroke: 'line',
  strokes: [
    [
      { x: 100, y: 200 },
      { x: 300, y: 200 },
    ],
    [
      { x: 100, y: 400 },
      { x: 300, y: 400 },
    ],
  ],
};

/** Same shape scaled by `factor` — stands in for a re-laid design space. */
function scaledLevel(source: LevelDef, factor: number): LevelDef {
  return {
    ...source,
    goal: { x: source.goal.x * factor, y: source.goal.y * factor },
    strokes: source.strokes.map((stroke) =>
      stroke.map((p) => ({ x: p.x * factor, y: p.y * factor })),
    ),
  };
}

function strokePath(source: LevelDef, index: number): readonly Point[] {
  const path = levelToPath(source)[index];
  if (!path) {
    throw new Error(`Stroke ${index} of ${source.id} is missing.`);
  }
  return path;
}

function walkStroke(
  session: ReturnType<typeof createSession>,
  path: readonly Point[],
  from: number,
  to: number,
): void {
  for (let i = from; i < to; i += 2) {
    session.pointerMove(point(path, i));
    session.update(16);
    session.update(16);
  }
}

describe('session reflow', () => {
  it('keeps the stroke index and proportional frontier across a reflow', () => {
    const f = fakes();
    const session = createSession(TWO_STROKE, {
      character: f.character,
      onEvent: (event) => void f.events.push(event),
      player: f.player,
      seed: 7,
      settings: () => ({ easierTracing: false }),
    });
    const first = strokePath(TWO_STROKE, 0);
    const second = strokePath(TWO_STROKE, 1);
    session.pointerDown(point(first, 0));
    walkStroke(session, first, 1, first.length);
    walkStroke(session, second, 1, Math.floor(second.length / 4));
    const before = session.snapshot();
    expect(before.multiState.strokeIndex).toBe(1);
    expect(before.multiState.frontier).toBeGreaterThan(0);

    session.reflow(scaledLevel(TWO_STROKE, 0.5), 0.5);
    const after = session.snapshot();
    expect(after.multiState.strokeIndex).toBe(1);
    expect(after.multiState.frontier).toBeCloseTo(before.multiState.frontier * 0.5, 6);
    expect(after.multiState.tracing).toBe(false);
    expect(after.checkState).toEqual(before.checkState);
  });

  it('cancels an in-flight stroke on reflow and can still be finished', () => {
    const f = fakes();
    const session = createSession(TWO_STROKE, {
      character: f.character,
      onEvent: (event) => void f.events.push(event),
      player: f.player,
      seed: 7,
      settings: () => ({ easierTracing: false }),
    });
    const first = strokePath(TWO_STROKE, 0);
    session.pointerDown(point(first, 0));
    walkStroke(session, first, 1, Math.floor(first.length / 2));
    expect(session.snapshot().multiState.tracing).toBe(true);

    const half = scaledLevel(TWO_STROKE, 0.5);
    session.reflow(half, 0.5);
    const after = session.snapshot();
    expect(after.multiState.tracing).toBe(false);
    expect(after.multiState.frontier).toBeGreaterThan(0);
    session.pointerUp();

    const halfFirst = strokePath(half, 0);
    const halfSecond = strokePath(half, 1);
    const resumeIndex = Math.min(
      Math.max(1, Math.round(after.multiState.frontier / 8)),
      halfFirst.length - 1,
    );
    session.pointerDown(point(halfFirst, resumeIndex));
    walkStroke(session, halfFirst, resumeIndex + 1, halfFirst.length);
    walkStroke(session, halfSecond, 1, halfSecond.length);
    for (let u = 0; u < 400 && !session.success; u += 1) {
      session.update(16);
    }
    expect(session.success).toBe(true);
  });

  it('leaves a finished level untouched', () => {
    const f = fakes();
    const session = createSession(TWO_STROKE, {
      character: f.character,
      onEvent: (event) => void f.events.push(event),
      player: f.player,
      seed: 7,
      settings: () => ({ easierTracing: false }),
    });
    const first = strokePath(TWO_STROKE, 0);
    const second = strokePath(TWO_STROKE, 1);
    session.pointerDown(point(first, 0));
    walkStroke(session, first, 1, first.length);
    walkStroke(session, second, 1, second.length);
    for (let u = 0; u < 400 && !session.success; u += 1) {
      session.update(16);
    }
    expect(session.success).toBe(true);
    const before = session.snapshot();

    session.reflow(scaledLevel(TWO_STROKE, 2), 2);
    const after = session.snapshot();
    expect(after.multi.total).toBeCloseTo(before.multi.total, 9);
    expect(after.multiState).toEqual(before.multiState);
  });

  it('stays stable across repeated reflows', () => {
    const f = fakes();
    const session = createSession(TWO_STROKE, {
      character: f.character,
      onEvent: (event) => void f.events.push(event),
      player: f.player,
      seed: 7,
      settings: () => ({ easierTracing: false }),
    });
    const second = strokePath(TWO_STROKE, 1);
    const first = strokePath(TWO_STROKE, 0);
    session.pointerDown(point(first, 0));
    walkStroke(session, first, 1, first.length);
    walkStroke(session, second, 1, Math.floor(second.length / 4));
    const before = session.snapshot().multiState.frontier;

    for (let round = 0; round < 3; round += 1) {
      session.reflow(scaledLevel(TWO_STROKE, 0.5), 0.5);
      session.reflow(TWO_STROKE, 2);
    }
    expect(session.snapshot().multiState.frontier).toBeCloseTo(before, 3);
    expect(session.snapshot().multiState.tracing).toBe(false);
  });
});

describe('skin instrument audio', () => {
  it('plays chimes and completion through the skin instrument preset', () => {
    const f = fakes();
    const session = createSession(DINO_1, {
      character: f.character,
      instrument: () => presetForInstrument('bell'),
      onEvent: (event) => void f.events.push(event),
      player: f.player,
      seed: 7,
      settings: () => ({ easierTracing: false }),
    });
    tracePath(session, 2, 2);
    for (let u = 0; u < 400; u += 1) {
      session.update(16);
    }
    expect(session.success).toBe(true);
    expect(f.specs).toHaveLength(12);
    const bellChimes = f.specs.filter((spec) => spec.duration === 1.4);
    expect(bellChimes).toHaveLength(5);
    for (const spec of f.specs) {
      expect(spec.type).toBe('sine');
    }
  });
});
