import { describe, expect, it } from 'vitest';
import { resample } from '../engine/path';
import { createMultiTrail, createTrail, MULTI_TRAIL_START, TRAIL_START } from '../engine/trail';
import type { Point } from '../engine/types';
import {
  buildMultiPathVisual,
  buildPathVisual,
  drawMultiPath,
  drawPath,
  type PathStyle,
  strokeVisualStates,
} from './renderPath';

function straightPath(): Point[] {
  return resample(
    [
      { x: 0, y: 0 },
      { x: 400, y: 0 },
    ],
    10,
  );
}

const trail = createTrail(straightPath(), { tolerance: 50, maxAdvanceSpeed: 600 });

/** Two crossing strokes (300 px each): horizontal then vertical. */
function crossingPaths(): Point[][] {
  return [
    resample(
      [
        { x: 0, y: 150 },
        { x: 300, y: 150 },
      ],
      10,
    ),
    resample(
      [
        { x: 150, y: 0 },
        { x: 150, y: 300 },
      ],
      10,
    ),
  ];
}

const multi = createMultiTrail(crossingPaths(), { tolerance: 50, maxAdvanceSpeed: 600 });

const STYLE: PathStyle = {
  ribbonWidth: 64,
  outlineWidth: 6,
  dotRadius: 7,
  dotSpacing: 40,
  paintColor: '#f2a65a',
  ribbonColor: '#bcd9ec',
  outlineColor: '#2e4a63',
  dotColor: '#5ea7d8',
  tipColor: '#e8c15a',
  tipRadius: 14,
};

describe('buildPathVisual', () => {
  it('reveals the sub-path behind the frontier, ending exactly at it', () => {
    const visual = buildPathVisual(trail, { frontier: 45, tracing: true }, 100);
    expect(visual.reveal).toHaveLength(6);
    expect(visual.reveal[visual.reveal.length - 1]).toEqual({ x: 45, y: 0 });
  });

  it('reveals nothing before the first progress', () => {
    expect(buildPathVisual(trail, TRAIL_START, 100).reveal).toEqual([]);
  });

  it('reveals the whole path when complete', () => {
    const visual = buildPathVisual(trail, { frontier: 400, tracing: false }, 100);
    expect(visual.reveal).toHaveLength(41);
    expect(visual.reveal[visual.reveal.length - 1]).toEqual({ x: 400, y: 0 });
  });

  it('places marching dots every spacing px, skipping the endpoints', () => {
    const visual = buildPathVisual(trail, TRAIL_START, 100);
    expect(visual.dots).toEqual([
      { x: 100, y: 0 },
      { x: 200, y: 0 },
      { x: 300, y: 0 },
    ]);
  });

  it('returns no dots for non-positive spacing', () => {
    expect(buildPathVisual(trail, TRAIL_START, 0).dots).toEqual([]);
  });

  it('reports the glowing tip position at the frontier', () => {
    const visual = buildPathVisual(trail, { frontier: 15, tracing: true }, 100);
    expect(visual.tip).toEqual({ x: 15, y: 0 });
  });
});

describe('drawPath', () => {
  it('draws ribbon, paint reveal, dots, and tip without throwing', () => {
    const ops: string[] = [];
    const ctx = fakeContext(ops);
    drawPath(ctx, trail, { frontier: 150, tracing: true }, STYLE);
    const strokes = ops.filter((op) => op === 'stroke').length;
    expect(strokes).toBeGreaterThanOrEqual(3);
    expect(ops).toContain('arc');
  });
});

describe('strokeVisualStates', () => {
  it('marks the first stroke active and the rest upcoming from a fresh start', () => {
    expect(strokeVisualStates(multi, MULTI_TRAIL_START)).toEqual(['active', 'upcoming']);
  });

  it('marks earlier strokes completed and the current one active', () => {
    const states = strokeVisualStates(multi, { frontier: 50, strokeIndex: 1, tracing: true });
    expect(states).toEqual(['completed', 'active']);
  });

  it('keeps the final stroke active once its frontier is complete', () => {
    const states = strokeVisualStates(multi, { frontier: 300, strokeIndex: 1, tracing: true });
    expect(states).toEqual(['completed', 'active']);
  });
});

describe('buildMultiPathVisual', () => {
  it('reveals the active stroke up to the frontier with dots, tip and star data', () => {
    const visual = buildMultiPathVisual(
      multi,
      { frontier: 45, strokeIndex: 0, tracing: true },
      100,
    );
    const active = visual[0];
    expect(active?.state).toBe('active');
    expect(active?.reveal[active.reveal.length - 1]).toEqual({ x: 45, y: 150 });
    expect(active?.dots).toEqual([
      { x: 100, y: 150 },
      { x: 200, y: 150 },
    ]);
    expect(active?.tip).toEqual({ x: 45, y: 150 });
    expect(active?.start).toEqual({ x: 0, y: 150 });
    expect(active?.end).toEqual({ x: 300, y: 150 });
  });

  it('paints completed strokes fully and without dots or tip', () => {
    const visual = buildMultiPathVisual(
      multi,
      { frontier: 10, strokeIndex: 1, tracing: true },
      100,
    );
    const completed = visual[0];
    expect(completed?.state).toBe('completed');
    expect(completed?.reveal).toHaveLength(31);
    expect(completed?.reveal[completed.reveal.length - 1]).toEqual({ x: 300, y: 150 });
    expect(completed?.dots).toEqual([]);
    expect(completed?.tip).toBeNull();
  });

  it('keeps upcoming strokes whole but faint (no reveal, dots or tip)', () => {
    const visual = buildMultiPathVisual(
      multi,
      { frontier: 45, strokeIndex: 0, tracing: true },
      100,
    );
    const upcoming = visual[1];
    expect(upcoming?.state).toBe('upcoming');
    expect(upcoming?.points).toHaveLength(31);
    expect(upcoming?.reveal).toEqual([]);
    expect(upcoming?.dots).toEqual([]);
    expect(upcoming?.tip).toBeNull();
    expect(upcoming?.start).toEqual({ x: 150, y: 0 });
    expect(upcoming?.end).toEqual({ x: 150, y: 300 });
  });
});

describe('drawMultiPath', () => {
  it('draws the faint upcoming stroke, the active stroke and the tip', () => {
    const ops: string[] = [];
    const ctx = fakeContext(ops);
    drawMultiPath(ctx, multi, { frontier: 10, strokeIndex: 0, tracing: true }, STYLE);
    expect(ops.filter((op) => op === 'stroke').length).toBeGreaterThanOrEqual(5);
    expect(ops).toContain('save');
    expect(ops).toContain('restore');
    expect(ops).toContain('arc');
  });
});

/** Minimal recording stub: drawPath only touches 2D-context methods and props. */
function fakeContext(ops: string[]): CanvasRenderingContext2D {
  const ctx = {
    beginPath: () => ops.push('beginPath'),
    moveTo: () => ops.push('moveTo'),
    lineTo: () => ops.push('lineTo'),
    closePath: () => ops.push('closePath'),
    stroke: () => ops.push('stroke'),
    fill: () => ops.push('fill'),
    arc: () => ops.push('arc'),
    save: () => ops.push('save'),
    restore: () => ops.push('restore'),
    globalAlpha: 1,
    lineWidth: 0,
    strokeStyle: '',
    fillStyle: '',
    lineCap: 'round',
    lineJoin: 'round',
  };
  return ctx as unknown as CanvasRenderingContext2D;
}
