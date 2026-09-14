import { catmullRom, resample } from '../engine/path';
import type { Point, StrokePattern } from '../engine/types';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';

/** A playable level: authoring-time data only; runtime builds the trail from it. */
export interface LevelDef {
  readonly controlPoints: readonly Point[];
  readonly goal: Point;
  /** Bundle path of the goal vignette drawn at the trail end (and as its sticker). */
  readonly goalArt: string;
  readonly id: string;
  readonly stroke: StrokePattern;
  readonly theme: string;
}

/** A theme groups levels with their character and presentation metadata. */
export interface ThemeDef {
  /** Bundle path of the soft scene painted behind the trail. */
  readonly backdrop: string;
  readonly character: string;
  readonly id: string;
  readonly name: string;
}

const MARGIN = 24;
const SEGMENT_SAMPLES = 24;
const POINT_SPACING = 8;

function outsideMargin(point: Point): boolean {
  return (
    point.x < MARGIN ||
    point.x > FIELD_WIDTH - MARGIN ||
    point.y < MARGIN ||
    point.y > FIELD_HEIGHT - MARGIN
  );
}

/** Returns human-readable problems; an empty array means the level is well-formed. */
export function validateLevel(level: LevelDef): string[] {
  const problems: string[] = [];
  if (level.id === '') {
    problems.push('missing id');
  }
  if (level.controlPoints.length < 2) {
    problems.push('needs at least 2 control points');
    return problems;
  }
  level.controlPoints.forEach((point, index) => {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      problems.push(`non-finite control point at index ${index}`);
      return;
    }
    if (outsideMargin(point)) {
      problems.push(`control point ${index} outside field margin`);
    }
    const previous = level.controlPoints[index - 1];
    if (previous && previous.x === point.x && previous.y === point.y) {
      problems.push(`duplicate consecutive control point at index ${index}`);
    }
  });
  if (!Number.isFinite(level.goal.x) || !Number.isFinite(level.goal.y)) {
    problems.push('non-finite goal');
  } else if (outsideMargin(level.goal)) {
    problems.push('goal outside field margin');
  }
  if (level.goalArt === '') {
    problems.push('missing goal art');
  }
  return problems;
}

/** Smooths the control points and resamples them to constant pixel spacing. */
export function levelToPath(level: LevelDef): Point[] {
  return resample(catmullRom(level.controlPoints, SEGMENT_SAMPLES), POINT_SPACING);
}
