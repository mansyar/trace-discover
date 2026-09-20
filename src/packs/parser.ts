// Pack JSON parser: turns raw JSON data (shape unknown at compile time) into a
// validated `PackEntry`. Unknown keys are rejected so authoring typos (e.g.
// `goals` for `goal`) fail loudly instead of silently changing behavior.
//
// Two layers, one contract: [1] shape checks below narrow `unknown` into the
// documented pack/level fields; [2] geometry + pack rules run in `json.ts`
// (validateLevel + createPackEntry). Problems throw a labeled error at load
// time so a malformed pack can never reach play.
import type { Point, StrokePattern } from '../engine/types';

export interface RawPack {
  readonly badgeId: string;
  readonly bonusUnlocks: readonly number[];
  readonly bonuses: readonly RawLevel[];
  readonly id: string;
  readonly levels: readonly RawLevel[];
  readonly menuFill: string;
}

export interface RawLevel {
  readonly goal: Point;
  readonly goalArt: string;
  readonly id: string;
  readonly stroke: StrokePattern;
  readonly strokes: readonly (readonly Point[])[];
}

const STROKE_PATTERNS: readonly StrokePattern[] = [
  'line',
  'wave',
  'arc',
  'zigzag',
  'circle',
  'loop',
  'spiral',
  'stairs',
];

const PACK_KEYS = ['badgeId', 'bonusUnlocks', 'bonuses', 'id', 'levels', 'menuFill'] as const;
const LEVEL_KEYS = ['goal', 'goalArt', 'id', 'stroke', 'strokes'] as const;
/** The only bundle path levels may reference art from (shared with `json.ts`). */
export const GOAL_ART_PREFIX = '/art/goal/';

/** Accepts only plain objects — arrays and null do not count. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Rejects unknown keys; returns the first offender. */
function unknownKey(value: Record<string, unknown>, allowed: readonly string[]): string | null {
  return Object.keys(value).find((key) => !allowed.includes(key)) ?? null;
}

/** Reads a required label string. Empty or non-string values are reported. */
function asId(value: unknown, what: string, at: string): string {
  if (typeof value !== 'string' || value === '') {
    throw new Error(`${at}: missing ${what}`);
  }
  return value;
}

function asFiniteNumber(value: unknown, what: string, at: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${at}: ${what} must be a finite number`);
  }
  return value;
}

function asPoint(value: unknown, what: string, at: string): Point {
  if (!isRecord(value)) {
    throw new Error(`${at}: ${what} must be an object`);
  }
  return {
    x: asFiniteNumber(value.x, `${what} x`, at),
    y: asFiniteNumber(value.y, `${what} y`, at),
  };
}

function asStrokes(value: unknown, at: string): readonly (readonly Point[])[] {
  if (!Array.isArray(value)) {
    throw new Error(`${at}: strokes must be an array`);
  }
  return value.map((stroke, index) => {
    if (!Array.isArray(stroke)) {
      throw new Error(`${at}: stroke ${index} must be an array of points`);
    }
    return stroke.map((point, pointIndex) => {
      if (!isRecord(point)) {
        throw new Error(`${at}: stroke ${index} point ${pointIndex} must be an object`);
      }
      return {
        x: asFiniteNumber(point.x, `stroke ${index} point ${pointIndex} x`, at),
        y: asFiniteNumber(point.y, `stroke ${index} point ${pointIndex} y`, at),
      };
    });
  });
}

/** Shape-checks one level against the documented schema. */
export function parseRawLevel(raw: unknown, at: string): RawLevel {
  if (!isRecord(raw)) {
    throw new Error(`${at}: level must be an object`);
  }
  const stray = unknownKey(raw, LEVEL_KEYS);
  if (stray !== null) {
    throw new Error(`${at}: unknown level key '${stray}'`);
  }
  const stroke = raw.stroke;
  if (typeof stroke !== 'string' || !STROKE_PATTERNS.includes(stroke as StrokePattern)) {
    throw new Error(`${at}: invalid stroke '${String(stroke)}'`);
  }
  const goalArt = raw.goalArt;
  if (typeof goalArt !== 'string' || goalArt === '' || !goalArt.startsWith(GOAL_ART_PREFIX)) {
    throw new Error(`${at}: goalArt must be a bundle path under ${GOAL_ART_PREFIX}`);
  }
  return {
    goal: asPoint(raw.goal, 'goal', at),
    goalArt,
    id: asId(raw.id, 'id', at),
    stroke: stroke as StrokePattern,
    strokes: asStrokes(raw.strokes, at),
  };
}

function asLevels(value: unknown, what: string, at: string): readonly RawLevel[] {
  if (!Array.isArray(value)) {
    throw new Error(`${what} must be an array`);
  }
  return value.map((level, index) => parseRawLevel(level, `${at} level ${index}`));
}

function asNumberList(value: unknown, what: string): readonly number[] {
  if (!Array.isArray(value)) {
    throw new Error(`${what} must be an array`);
  }
  return value.map((entry, index) => {
    if (typeof entry !== 'number' || !Number.isFinite(entry)) {
      throw new Error(`${what} entry ${index} must be a finite number`);
    }
    return entry;
  });
}

/**
 * Shape-checks raw pack data against the documented schema. `at` prefixes
 * nested level labels (default `level`, or `pack` for the collector's
 * pack-scoped paths).
 */
export function parseRawPack(raw: unknown, at = 'level'): RawPack {
  if (!isRecord(raw)) {
    throw new Error('pack must be an object');
  }
  const stray = unknownKey(raw, PACK_KEYS);
  if (stray !== null) {
    throw new Error(`unknown pack key '${stray}'`);
  }
  return {
    badgeId: asId(raw.badgeId, 'badgeId', 'pack'),
    bonusUnlocks: asNumberList(raw.bonusUnlocks ?? [], 'bonusUnlocks'),
    bonuses: asLevels(raw.bonuses ?? [], 'bonuses', at),
    id: asId(raw.id, 'pack id', 'pack'),
    levels: asLevels(raw.levels, 'levels', at),
    menuFill: asId(raw.menuFill, 'menuFill', 'pack'),
  };
}
