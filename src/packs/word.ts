// Word-row composer: lays letter glyphs out left-to-right, centred inside a
// design box and scaled to fit (never magnified past the cap). Shared by the
// runtime "My Name" level and the wide-field word rows.
import type { Point } from '../engine/types';

/** Full-width row box for word-class levels in the landscape field (centre y 215). */
export const WIDE_WORD_BOX = { bottom: 390, left: 40, right: 820, top: 40 } as const;

/** One glyph: its stroke geometry plus the horizontal span used for layout. */
export interface WordGlyph {
  readonly left: number;
  readonly right: number;
  readonly strokes: readonly (readonly Point[])[];
}

/** Design box a row is composed inside (field space). */
export interface WordBox {
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

/**
 * Composes one row of glyphs: order kept, natural `gap` between neighbours,
 * centred both ways in `box`, scaled down to fit the box width and never
 * magnified past `cap`.
 */
export function composeWordRow(
  glyphs: readonly WordGlyph[],
  box: WordBox,
  gap: number,
  cap = 1,
): { scale: number; strokes: Point[][] } {
  if (glyphs.length === 0) {
    return { scale: 1, strokes: [] };
  }
  const naturalWidth =
    glyphs.reduce((sum, glyph) => sum + (glyph.right - glyph.left), 0) + gap * (glyphs.length - 1);
  const scale = Math.min(cap, (box.right - box.left) / naturalWidth);
  const centerX = (box.left + box.right) / 2;
  const centerY = (box.top + box.bottom) / 2;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const glyph of glyphs) {
    for (const stroke of glyph.strokes) {
      for (const point of stroke) {
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      }
    }
  }
  const glyphMidY = Number.isFinite(minY) ? (minY + maxY) / 2 : centerY;

  let cursor = centerX - (naturalWidth * scale) / 2;
  const strokes: Point[][] = [];
  for (const glyph of glyphs) {
    for (const stroke of glyph.strokes) {
      strokes.push(
        stroke.map((point) => ({
          x: cursor + (point.x - glyph.left) * scale,
          y: centerY + (point.y - glyphMidY) * scale,
        })),
      );
    }
    cursor += (glyph.right - glyph.left + gap) * scale;
  }
  return { scale, strokes };
}
