// Wide-field level projection: authored levels target the portrait reference
// field; in the wide field a level's geometry is uniformly centred (never
// magnified, never shrunk unless it overflows the wide margins) so single
// glyphs sit in the middle of the landscape box without touching the art.
import type { Point } from '../engine/types';
import { LANDSCAPE_FIELD_HEIGHT, LANDSCAPE_FIELD_WIDTH, type Orientation } from '../field';
import type { LevelDef } from './level';

const MARGIN = 24;

interface Bounds {
  readonly maxX: number;
  readonly maxY: number;
  readonly minX: number;
  readonly minY: number;
}

function boundsOf(level: LevelDef): Bounds | null {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const stroke of level.strokes) {
    for (const point of stroke) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
  }
  return Number.isFinite(minX) ? { maxX, maxY, minX, minY } : null;
}

function landscapeScale(bounds: Bounds): number {
  const width = Math.max(bounds.maxX - bounds.minX, 1);
  const height = Math.max(bounds.maxY - bounds.minY, 1);
  return Math.min(
    1,
    (LANDSCAPE_FIELD_WIDTH - MARGIN * 2) / width,
    (LANDSCAPE_FIELD_HEIGHT - MARGIN * 2) / height,
  );
}

/** Uniform scale the landscape projection applies to a level (1 in portrait). */
export function projectionScale(level: LevelDef, orientation: Orientation): number {
  if (orientation === 'portrait') {
    return 1;
  }
  const bounds = boundsOf(level);
  return bounds ? landscapeScale(bounds) : 1;
}

/** Projects a level for the active design space; portrait is the authored space. */
export function levelForOrientation(level: LevelDef, orientation: Orientation): LevelDef {
  if (orientation === 'portrait') {
    return level;
  }

  const bounds = boundsOf(level);
  if (!bounds) {
    return { ...level, goal: { ...level.goal } };
  }

  const scale = landscapeScale(bounds);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const mapPoint = (point: Point): Point => ({
    x: LANDSCAPE_FIELD_WIDTH / 2 + (point.x - centerX) * scale,
    y: LANDSCAPE_FIELD_HEIGHT / 2 + (point.y - centerY) * scale,
  });

  return {
    ...level,
    goal: mapPoint(level.goal),
    strokes: level.strokes.map((stroke) => stroke.map(mapPoint)),
  };
}
