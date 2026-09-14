import { describe, expect, it } from 'vitest';
import { catmullRom, cumulativeLengths, nearestOnPath, resample } from './path';
import type { Point } from './types';

function at(points: readonly Point[], index: number): Point {
  const point = points[index];
  if (!point) {
    throw new Error(`Expected a point at index ${index}`);
  }
  return point;
}

describe('catmullRom', () => {
  it('passes through every control point and emits the expected sample count', () => {
    const control: Point[] = [
      { x: 0, y: 0 },
      { x: 50, y: 80 },
      { x: 100, y: 0 },
    ];
    const samples = catmullRom(control, 10);
    expect(samples).toHaveLength(21);
    expect(at(samples, 0)).toEqual({ x: 0, y: 0 });
    expect(at(samples, 10)).toEqual({ x: 50, y: 80 });
    expect(at(samples, 20)).toEqual({ x: 100, y: 0 });
  });

  it('produces a straight line for collinear control points', () => {
    const control: Point[] = [
      { x: 0, y: 10 },
      { x: 40, y: 10 },
      { x: 80, y: 10 },
    ];
    const samples = catmullRom(control, 4);
    expect(samples).toHaveLength(9);
    for (const point of samples) {
      expect(point.y).toBeCloseTo(10, 6);
    }
    for (let i = 1; i < samples.length; i += 1) {
      expect(at(samples, i).x).toBeGreaterThan(at(samples, i - 1).x);
    }
  });

  it('returns the input point for a single control point', () => {
    const samples = catmullRom([{ x: 7, y: 9 }], 8);
    expect(samples).toEqual([{ x: 7, y: 9 }]);
  });

  it('returns an empty path for no control points', () => {
    expect(catmullRom([], 8)).toEqual([]);
  });
});

describe('resample', () => {
  it('emits constant spacing and keeps both endpoints', () => {
    const line: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    const points = resample(line, 10);
    expect(points).toHaveLength(11);
    expect(at(points, 0).x).toBeCloseTo(0, 9);
    expect(at(points, 5).x).toBeCloseTo(50, 9);
    expect(at(points, 10).x).toBeCloseTo(100, 9);
  });

  it('adjusts the interval when spacing does not divide the length evenly', () => {
    const line: Point[] = [
      { x: 0, y: 0 },
      { x: 105, y: 0 },
    ];
    const points = resample(line, 10);
    expect(points).toHaveLength(12);
    expect(at(points, 11).x).toBeCloseTo(105, 9);
    const gap = at(points, 1).x - at(points, 0).x;
    for (let i = 1; i < points.length; i += 1) {
      expect(at(points, i).x - at(points, i - 1).x).toBeCloseTo(gap, 9);
    }
  });

  it('walks the corner of an L-shaped path at the right arc positions', () => {
    const path: Point[] = [
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
    ];
    const points = resample(path, 25);
    expect(points).toHaveLength(9);
    expect(at(points, 4)).toEqual({ x: 0, y: 100 });
    expect(at(points, 8)).toEqual({ x: 100, y: 100 });
  });

  it('returns both endpoints when spacing exceeds the path length', () => {
    const line: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    expect(resample(line, 500)).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
  });

  it('handles a single point', () => {
    expect(resample([{ x: 5, y: 5 }], 10)).toEqual([{ x: 5, y: 5 }]);
  });

  it('returns the endpoints for non-positive spacing', () => {
    const line: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    expect(resample(line, 0)).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]);
  });

  it('collapses a zero-length path to its endpoints', () => {
    const duplicated: Point[] = [
      { x: 5, y: 5 },
      { x: 5, y: 5 },
    ];
    expect(resample(duplicated, 10)).toEqual([
      { x: 5, y: 5 },
      { x: 5, y: 5 },
    ]);
  });

  it('returns an empty path for no points', () => {
    expect(resample([], 10)).toEqual([]);
  });
});

describe('cumulativeLengths', () => {
  it('accumulates segment lengths along the path', () => {
    const path: Point[] = [
      { x: 0, y: 0 },
      { x: 3, y: 4 },
      { x: 3, y: 14 },
    ];
    expect(cumulativeLengths(path)).toEqual([0, 5, 15]);
  });

  it('returns a single zero for a one-point path', () => {
    expect(cumulativeLengths([{ x: 1, y: 1 }])).toEqual([0]);
  });
});

describe('nearestOnPath', () => {
  const path: Point[] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ];

  it('projects onto the nearest segment with a normalized tangent', () => {
    const result = nearestOnPath(path, 30, 20);
    expect(result.point.x).toBeCloseTo(30, 9);
    expect(result.point.y).toBeCloseTo(0, 9);
    expect(result.distance).toBeCloseTo(20, 9);
    expect(result.index).toBe(0);
    expect(result.tangent.x).toBeCloseTo(1, 9);
    expect(result.tangent.y).toBeCloseTo(0, 9);
  });

  it('clamps to the path start', () => {
    const result = nearestOnPath(path, -30, 10);
    expect(result.point).toEqual({ x: 0, y: 0 });
    expect(result.distance).toBeCloseTo(Math.hypot(30, 10), 9);
  });

  it('clamps to the path end', () => {
    const result = nearestOnPath(path, 100, 150);
    expect(result.point).toEqual({ x: 100, y: 100 });
    expect(result.distance).toBeCloseTo(50, 9);
    expect(result.index).toBe(1);
  });

  it('finds the vertical segment of a multi-segment path', () => {
    const result = nearestOnPath(path, 110, 50);
    expect(result.point).toEqual({ x: 100, y: 50 });
    expect(result.distance).toBeCloseTo(10, 9);
    expect(result.index).toBe(1);
    expect(result.tangent).toEqual({ x: 0, y: 1 });
  });

  it('returns unit tangents on diagonal segments', () => {
    const diagonal: Point[] = [
      { x: 0, y: 0 },
      { x: 30, y: 40 },
    ];
    const result = nearestOnPath(diagonal, 15, 20);
    expect(result.distance).toBeCloseTo(0, 9);
    expect(result.tangent.x).toBeCloseTo(0.6, 9);
    expect(result.tangent.y).toBeCloseTo(0.8, 9);
  });

  it('skips zero-length segments', () => {
    const duplicated: Point[] = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    const result = nearestOnPath(duplicated, 50, 5);
    expect(result.point.x).toBeCloseTo(50, 9);
    expect(result.distance).toBeCloseTo(5, 9);
  });

  it('handles a one-point path', () => {
    const result = nearestOnPath([{ x: 2, y: 3 }], 2, 8);
    expect(result.point).toEqual({ x: 2, y: 3 });
    expect(result.distance).toBeCloseTo(5, 9);
  });

  it('handles an empty path', () => {
    const result = nearestOnPath([], 3, 4);
    expect(result.distance).toBeCloseTo(5, 9);
    expect(result.point).toEqual({ x: 0, y: 0 });
  });
});
