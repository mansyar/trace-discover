// Level projection across design spaces: authored levels target the portrait
// phone reference field; in every other space a level's geometry is uniformly
// centred (never magnified, never shrunk unless it overflows that space's
// margins) so a single glyph sits in the middle of the box without touching the
// art, and the phone portrait reference stays byte-identical.
import type { Point } from '../engine/types';
import type { FieldSpace, Orientation } from '../field';
import { FIELD_SPACES } from '../field';
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

function fitScale(bounds: Bounds, space: FieldSpace): number {
  const width = Math.max(bounds.maxX - bounds.minX, 1);
  const height = Math.max(bounds.maxY - bounds.minY, 1);
  return Math.min(1, (space.width - MARGIN * 2) / width, (space.height - MARGIN * 2) / height);
}

/**
 * Uniform scale the projection applies to a level in a space: 1 in the authored
 * portrait phone space and for anything that already fits (the projection never
 * magnifies), shrinking only to clear the space's margins.
 */
export function projectionScaleFor(level: LevelDef, space: FieldSpace): number {
  if (space.id === 'phone-portrait') {
    return 1;
  }
  const bounds = boundsOf(level);
  return bounds ? fitScale(bounds, space) : 1;
}

/**
 * Projects a level into the active design space. The authored portrait phone
 * space is returned untouched (level geometry is authored there); every other
 * space centres the geometry uniformly, shrinking it only if it would overflow
 * that space's margins.
 */
export function levelForSpace(level: LevelDef, space: FieldSpace): LevelDef {
  if (space.id === 'phone-portrait') {
    return level;
  }

  const bounds = boundsOf(level);
  if (!bounds) {
    return { ...level, goal: { ...level.goal } };
  }

  const scale = fitScale(bounds, space);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const mapPoint = (point: Point): Point => ({
    x: space.width / 2 + (point.x - centerX) * scale,
    y: space.height / 2 + (point.y - centerY) * scale,
  });

  return {
    ...level,
    goal: mapPoint(level.goal),
    strokes: level.strokes.map((stroke) => stroke.map(mapPoint)),
  };
}

/** The authored phone reference space for an orientation. */
function phoneSpace(orientation: Orientation): FieldSpace {
  return orientation === 'landscape'
    ? FIELD_SPACES['phone-landscape']
    : FIELD_SPACES['phone-portrait'];
}

/** Uniform scale the phone-reference projection applies for an orientation. */
export function projectionScale(level: LevelDef, orientation: Orientation): number {
  return projectionScaleFor(level, phoneSpace(orientation));
}

/**
 * Projects a level for the phone reference of an orientation (the pre-tablet
 * entry point, kept for callers that only know the orientation).
 */
export function levelForOrientation(level: LevelDef, orientation: Orientation): LevelDef {
  return levelForSpace(level, phoneSpace(orientation));
}

/** Raw control-geometry length of a level: the sum of its stroke polylines. */
export function pathGeometryLength(level: LevelDef): number {
  let total = 0;
  for (const stroke of level.strokes) {
    for (let index = 1; index < stroke.length; index += 1) {
      const a = stroke[index - 1];
      const b = stroke[index];
      if (a && b) {
        total += Math.hypot(b.x - a.x, b.y - a.y);
      }
    }
  }
  return total;
}
