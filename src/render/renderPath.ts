import { pointAtLength } from '../engine/path';
import { type Trail, type TrailState, tipPosition } from '../engine/trail';
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

/** Builds the draw data for one frame from the trail state. */
export function buildPathVisual(trail: Trail, state: TrailState, dotSpacing: number): PathVisual {
  return {
    reveal: revealPoints(trail.points, trail.cumulative, state.frontier),
    dots: dotsAlong(trail.points, trail.cumulative, dotSpacing),
    tip: tipPosition(trail, state),
  };
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
