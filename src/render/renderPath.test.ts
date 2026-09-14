import { describe, expect, it } from 'vitest';
import { resample } from '../engine/path';
import { createTrail, TRAIL_START } from '../engine/trail';
import type { Point } from '../engine/types';
import { buildPathVisual, drawPath, type PathStyle } from './renderPath';

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
    lineWidth: 0,
    strokeStyle: '',
    fillStyle: '',
    lineCap: 'round',
    lineJoin: 'round',
  };
  return ctx as unknown as CanvasRenderingContext2D;
}
