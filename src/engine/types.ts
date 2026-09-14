/** A point in 2D space. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Stroke patterns across the v1 curriculum (spec FR5). */
export type StrokePattern = 'line' | 'wave' | 'arc' | 'zigzag' | 'circle';
