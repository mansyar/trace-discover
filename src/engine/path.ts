import type { Point } from './types';

/** Result of a nearest-point query against a path. */
export interface NearestResult {
  /** Index of the segment (vertex `index` → vertex `index + 1`) nearest the query. */
  readonly index: number;
  /** Distance from the query point to the nearest point on the path. */
  readonly distance: number;
  /** The nearest point on the path. */
  readonly point: Point;
  /** Unit tangent of the nearest segment (forward direction). */
  readonly tangent: Point;
}

const EPSILON = 1e-9;

/**
 * Smooths control points into a dense polyline using uniform Catmull-Rom
 * interpolation. The curve passes through every control point; the `n - 1`
 * segments contribute `samplesPerSegment` samples each, plus the final
 * control point (total `(n - 1) * samplesPerSegment + 1` points).
 */
export function catmullRom(controlPoints: readonly Point[], samplesPerSegment: number): Point[] {
  const first = controlPoints[0];
  if (!first) {
    return [];
  }
  if (controlPoints.length === 1) {
    return [{ ...first }];
  }
  const result: Point[] = [];
  for (let segment = 0; segment < controlPoints.length - 1; segment += 1) {
    const p0 = controlPoints[segment - 1] ?? first;
    const p1 = controlPoints[segment];
    const p2 = controlPoints[segment + 1];
    const p3 = controlPoints[segment + 2] ?? controlPoints[controlPoints.length - 1] ?? first;
    if (!p1 || !p2) {
      continue;
    }
    for (let i = 0; i < samplesPerSegment; i += 1) {
      result.push(catmullRomPoint(p0, p1, p2, p3, i / samplesPerSegment));
    }
  }
  const last = controlPoints[controlPoints.length - 1];
  result.push(last ? { ...last } : { ...first });
  return result;
}

/**
 * Resamples a polyline at an approximately constant pixel spacing. The
 * interval is adjusted so both endpoints stay exact (interval =
 * `totalLength / round(totalLength / spacing)`), and the result always
 * includes the first and last points.
 */
export function resample(points: readonly Point[], spacing: number): Point[] {
  const first = points[0];
  if (!first) {
    return [];
  }
  if (points.length === 1) {
    return [{ ...first }];
  }
  const last = points[points.length - 1] ?? first;
  const cumulative = cumulativeLengths(points);
  const total = cumulative[cumulative.length - 1] ?? 0;
  if (total <= EPSILON || !(spacing > EPSILON)) {
    return [{ ...first }, { ...last }];
  }
  const count = Math.max(1, Math.round(total / spacing));
  const result: Point[] = [];
  let segment = 0;
  for (let i = 0; i <= count; i += 1) {
    const target = (i * total) / count;
    while (segment < points.length - 2 && target > (cumulative[segment + 1] ?? total)) {
      segment += 1;
    }
    result.push(pointOnSegment(points, cumulative, segment, target));
  }
  return result;
}

/** Running arc length at each vertex; first entry is `0`, last entry is the total length. */
export function cumulativeLengths(points: readonly Point[]): number[] {
  const result: number[] = [0];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const from = points[i - 1];
    const to = points[i];
    if (from && to) {
      total += Math.hypot(to.x - from.x, to.y - from.y);
    }
    result.push(total);
  }
  return result;
}

/** Point on the polyline at `target` arc length, clamped to the path's extent. */
export function pointAtLength(
  points: readonly Point[],
  cumulative: readonly number[],
  target: number,
): Point {
  const total = cumulative[cumulative.length - 1] ?? 0;
  const clamped = Math.min(Math.max(target, 0), total);
  return pointOnSegment(points, cumulative, findSegment(cumulative, clamped), clamped);
}

/** Finds the nearest point on the path to `(x, y)`, with its distance and unit tangent. */
export function nearestOnPath(points: readonly Point[], x: number, y: number): NearestResult {
  const first = points[0];
  const second = points[1];
  if (!first || !second) {
    const point = first ?? { x: 0, y: 0 };
    return {
      index: 0,
      distance: Math.hypot(x - point.x, y - point.y),
      point: { ...point },
      tangent: { x: 1, y: 0 },
    };
  }
  let best = segmentResult(first, second, 0, x, y);
  for (let i = 1; i < points.length - 1; i += 1) {
    const from = points[i];
    const to = points[i + 1];
    if (!from || !to) {
      continue;
    }
    const candidate = segmentResult(from, to, i, x, y);
    if (candidate.distance < best.distance) {
      best = candidate;
    }
  }
  return best;
}

function catmullRomPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const t2 = t * t;
  const t3 = t2 * t;
  const x =
    0.5 *
    (2 * p1.x +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
  const y =
    0.5 *
    (2 * p1.y +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
  return { x, y };
}

function segmentResult(from: Point, to: Point, index: number, x: number, y: number): NearestResult {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq > EPSILON ? clamp01(((x - from.x) * dx + (y - from.y) * dy) / lengthSq) : 0;
  const point = { x: from.x + dx * t, y: from.y + dy * t };
  const length = Math.sqrt(lengthSq);
  return {
    index,
    distance: Math.hypot(x - point.x, y - point.y),
    point,
    tangent: length > EPSILON ? { x: dx / length, y: dy / length } : { x: 1, y: 0 },
  };
}

function findSegment(cumulative: readonly number[], target: number): number {
  for (let i = 0; i < cumulative.length - 1; i += 1) {
    const end = cumulative[i + 1];
    if (end !== undefined && target <= end) {
      return i;
    }
  }
  return Math.max(0, cumulative.length - 2);
}

function pointOnSegment(
  path: readonly Point[],
  cumulative: readonly number[],
  index: number,
  target: number,
): Point {
  const from = path[index];
  const to = path[index + 1];
  if (!from || !to) {
    return { x: 0, y: 0 };
  }
  const startLength = cumulative[index] ?? 0;
  const endLength = cumulative[index + 1] ?? startLength;
  const segmentLength = endLength - startLength;
  const t = segmentLength > EPSILON ? clamp01((target - startLength) / segmentLength) : 0;
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
