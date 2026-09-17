// Pack level schema: a playable level is authoring-time data only; the runtime
// builds trail paths from it. Presentation (character, backdrop, accent) lives
// in the skin registry — levels carry no theme.

import { catmullRom, resample } from '../engine/path';
import type { Point, StrokePattern } from '../engine/types';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';

/** A playable level: authoring-time data only; runtime builds the trail from it. */
export interface LevelDef {
  readonly goal: Point;
  /** Bundle path of the goal vignette drawn at the trail end (and as its sticker). */
  readonly goalArt: string;
  readonly id: string;
  readonly stroke: StrokePattern;
  /** Ordered strokes traced in sequence; v1 content converts to exactly one. */
  readonly strokes: readonly (readonly Point[])[];
}

/** Field-edge keep-out band shared by the validator and authoring tools (px). */
export const MARGIN = 24;
const SEGMENT_SAMPLES = 24;
const POINT_SPACING = 8;

function outsideMargin(point: Point, fieldWidth: number, fieldHeight: number): boolean {
  return (
    point.x < MARGIN ||
    point.x > fieldWidth - MARGIN ||
    point.y < MARGIN ||
    point.y > fieldHeight - MARGIN
  );
}

/** Returns human-readable problems; an empty array means the level is well-formed. */
export function validateLevel(
  level: LevelDef,
  fieldWidth: number = FIELD_WIDTH,
  fieldHeight: number = FIELD_HEIGHT,
): string[] {
  const problems: string[] = [];
  if (level.id === '') {
    problems.push('missing id');
  }
  if (level.strokes.length === 0) {
    problems.push('needs at least one stroke');
    return problems;
  }
  level.strokes.forEach((stroke, strokeIndex) => {
    if (stroke.length < 2) {
      problems.push(`stroke ${strokeIndex} needs at least 2 control points`);
      return;
    }
    stroke.forEach((point, index) => {
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
        problems.push(`stroke ${strokeIndex} non-finite control point at index ${index}`);
        return;
      }
      if (outsideMargin(point, fieldWidth, fieldHeight)) {
        problems.push(`stroke ${strokeIndex} control point ${index} outside field margin`);
      }
      const previous = stroke[index - 1];
      if (previous && previous.x === point.x && previous.y === point.y) {
        problems.push(
          `stroke ${strokeIndex} duplicate consecutive control point at index ${index}`,
        );
      }
    });
  });
  if (!Number.isFinite(level.goal.x) || !Number.isFinite(level.goal.y)) {
    problems.push('non-finite goal');
  } else if (outsideMargin(level.goal, fieldWidth, fieldHeight)) {
    problems.push('goal outside field margin');
  }
  if (level.goalArt === '') {
    problems.push('missing goal art');
  }
  return problems;
}

/** Smooths and resamples each stroke in order; v1 levels yield exactly one path. */
export function levelToPath(level: LevelDef): Point[][] {
  return level.strokes.map((stroke) =>
    resample(catmullRom(stroke, SEGMENT_SAMPLES), POINT_SPACING),
  );
}
