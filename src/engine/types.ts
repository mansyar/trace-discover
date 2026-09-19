/** A point in 2D space. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Stroke patterns across the v1 curriculum (spec FR5) plus the patterns-pack motifs (patterns-pack_20260920). */
export type StrokePattern =
  | 'line'
  | 'wave'
  | 'arc'
  | 'zigzag'
  | 'circle'
  | 'loop'
  | 'spiral'
  | 'stairs';
