import { pointAtLength } from '../engine/path';
import {
  type MultiTrail,
  type MultiTrailState,
  multiTipPosition,
  type Trail,
  type TrailState,
  tipPosition,
} from '../engine/trail';
import type { Point } from '../engine/types';

/** Style knobs for drawing one level's path, in play-field pixels. */
export interface PathStyle {
  readonly ribbonWidth: number;
  readonly outlineWidth: number;
  readonly dotRadius: number;
  readonly dotSpacing: number;
  readonly paintColor: string;
  readonly ribbonColor: string;
  readonly outlineColor: string;
  readonly dotColor: string;
  readonly tipColor: string;
  readonly tipRadius: number;
}

/** Everything needed to draw one frame of the path layer. */
export interface PathVisual {
  /** Sub-path revealed behind the frontier (paint fill). */
  readonly reveal: readonly Point[];
  /** Marching-dot direction cues along the full path. */
  readonly dots: readonly Point[];
  /** Glowing tip position at the frontier. */
  readonly tip: Point;
}

/** Visual role of one stroke within a multi-stroke level. */
export type StrokeVisualState = 'completed' | 'active' | 'upcoming';

/** Everything needed to draw one stroke of a multi-stroke path. */
export interface StrokeVisual {
  readonly state: StrokeVisualState;
  /** Full stroke polyline; upcoming strokes draw it faint as the ghost shape. */
  readonly points: readonly Point[];
  /** Sub-path painted behind the frontier (completed strokes are fully revealed). */
  readonly reveal: readonly Point[];
  /** Marching-dot cues; only the active stroke has dots. */
  readonly dots: readonly Point[];
  /** Glowing tip at the frontier; null unless the stroke is active. */
  readonly tip: Point | null;
  /** First point of the stroke — where its start star sits when active. */
  readonly start: Point;
  /** Last point of the stroke — the hand-over target for the next stroke. */
  readonly end: Point;
}

/** Builds the draw data for one frame from the trail state. */
export function buildPathVisual(trail: Trail, state: TrailState, dotSpacing: number): PathVisual {
  return {
    reveal: revealPoints(trail.points, trail.cumulative, state.frontier),
    dots: dotsAlong(trail.points, trail.cumulative, dotSpacing),
    tip: tipPosition(trail, state),
  };
}

/** Classifies every stroke: earlier = completed, current = active, later = upcoming. */
export function strokeVisualStates(trail: MultiTrail, state: MultiTrailState): StrokeVisualState[] {
  return trail.strokes.map((_, index) => {
    if (index < state.strokeIndex) {
      return 'completed';
    }
    return index === state.strokeIndex ? 'active' : 'upcoming';
  });
}

/** Builds the per-stroke draw data for one frame of a multi-stroke level. */
export function buildMultiPathVisual(
  trail: MultiTrail,
  state: MultiTrailState,
  dotSpacing: number,
): readonly StrokeVisual[] {
  const states = strokeVisualStates(trail, state);
  return trail.strokes.map((stroke, index) => {
    const visualState = states[index] ?? 'upcoming';
    const start = stroke.points[0] ?? { x: 0, y: 0 };
    const end = stroke.points[stroke.points.length - 1] ?? { x: 0, y: 0 };
    if (visualState === 'completed') {
      return {
        dots: [],
        end,
        points: stroke.points,
        reveal: revealPoints(stroke.points, stroke.cumulative, stroke.total),
        start,
        state: visualState,
        tip: null,
      };
    }
    if (visualState === 'active') {
      return {
        dots: dotsAlong(stroke.points, stroke.cumulative, dotSpacing),
        end,
        points: stroke.points,
        reveal: revealPoints(stroke.points, stroke.cumulative, state.frontier),
        start,
        state: visualState,
        tip: multiTipPosition(trail, state),
      };
    }
    return {
      dots: [],
      end,
      points: stroke.points,
      reveal: [],
      start,
      state: visualState,
      tip: null,
    };
  });
}

/** Sub-path from the start up to `frontier` arc length (empty before progress). */
export function revealPoints(
  points: readonly Point[],
  cumulative: readonly number[],
  frontier: number,
): Point[] {
  if (frontier <= 0) {
    return [];
  }
  const total = cumulative[cumulative.length - 1] ?? 0;
  if (frontier >= total) {
    return points.map((point) => ({ ...point }));
  }
  const result: Point[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    const length = cumulative[i];
    if (!point || length === undefined || length >= frontier) {
      break;
    }
    result.push({ ...point });
  }
  result.push(pointAtLength(points, cumulative, frontier));
  return result;
}

/** Points at every `spacing` px of arc length (endpoints excluded). */
export function dotsAlong(
  points: readonly Point[],
  cumulative: readonly number[],
  spacing: number,
): Point[] {
  if (!(spacing > 0)) {
    return [];
  }
  const total = cumulative[cumulative.length - 1] ?? 0;
  const result: Point[] = [];
  for (let arc = spacing; arc < total; arc += spacing) {
    result.push(pointAtLength(points, cumulative, arc));
  }
  return result;
}

/** Draws the path layer: outline, ribbon, paint fill, marching dots, glowing tip. */
export function drawPath(
  ctx: CanvasRenderingContext2D,
  trail: Trail,
  state: TrailState,
  style: PathStyle,
): void {
  const visual = buildPathVisual(trail, state, style.dotSpacing);
  strokePolyline(ctx, trail.points, style.outlineColor, style.ribbonWidth + style.outlineWidth * 2);
  strokePolyline(ctx, trail.points, style.ribbonColor, style.ribbonWidth);
  if (visual.reveal.length > 1) {
    strokePolyline(
      ctx,
      visual.reveal,
      style.paintColor,
      style.ribbonWidth - style.outlineWidth * 2,
    );
  }
  ctx.fillStyle = style.dotColor;
  for (const dot of visual.dots) {
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, style.dotRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = style.tipColor;
  ctx.beginPath();
  ctx.arc(visual.tip.x, visual.tip.y, style.tipRadius, 0, Math.PI * 2);
  ctx.fill();
}

const FAINT_ALPHA = 0.35;

/** Draws a multi-stroke level: faint upcoming ghost strokes, painted completed strokes, and the glowing active stroke with its marching dots and tip. */
export function drawMultiPath(
  ctx: CanvasRenderingContext2D,
  trail: MultiTrail,
  state: MultiTrailState,
  style: PathStyle,
): void {
  const visuals = buildMultiPathVisual(trail, state, style.dotSpacing);
  for (const stroke of visuals) {
    if (stroke.state !== 'upcoming') {
      continue;
    }
    ctx.save();
    ctx.globalAlpha = FAINT_ALPHA;
    drawStrokeBody(ctx, stroke.points, style);
    ctx.restore();
  }
  for (const stroke of visuals) {
    if (stroke.state !== 'completed') {
      continue;
    }
    drawStrokeBody(ctx, stroke.points, style);
    drawStrokePaint(ctx, stroke.reveal, style);
  }
  for (const stroke of visuals) {
    if (stroke.state !== 'active') {
      continue;
    }
    drawStrokeBody(ctx, stroke.points, style);
    drawStrokePaint(ctx, stroke.reveal, style);
    ctx.fillStyle = style.dotColor;
    for (const dot of stroke.dots) {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, style.dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    if (stroke.tip) {
      ctx.fillStyle = style.tipColor;
      ctx.beginPath();
      ctx.arc(stroke.tip.x, stroke.tip.y, style.tipRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Outline + ribbon for one stroke polyline. */
function drawStrokeBody(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
  style: PathStyle,
): void {
  strokePolyline(ctx, points, style.outlineColor, style.ribbonWidth + style.outlineWidth * 2);
  strokePolyline(ctx, points, style.ribbonColor, style.ribbonWidth);
}

/** Paint fill behind the frontier. */
function drawStrokePaint(
  ctx: CanvasRenderingContext2D,
  reveal: readonly Point[],
  style: PathStyle,
): void {
  if (reveal.length > 1) {
    strokePolyline(ctx, reveal, style.paintColor, style.ribbonWidth - style.outlineWidth * 2);
  }
}

function strokePolyline(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
  color: string,
  width: number,
): void {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  points.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.stroke();
}
