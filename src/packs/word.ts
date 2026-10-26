// Word-row composer: lays letter glyphs out left-to-right, centred inside a
// design box and scaled to fit (never magnified past the cap). Shared by the
// runtime "My Name" level and the wide-field word rows.
import type { Point } from '../engine/types';
import type { Orientation } from '../field';

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

/** Side margin every row box keeps inside its space (matches both shipped boxes). */
export const WORD_BOX_SIDE_MARGIN = 40;

/**
 * Shipped vertical band per orientation class, expressed in the authored
 * reference space: portrait rows sit slightly below centre (470/860) and
 * landscape rows are centred (215/430). The band only places the row's centre —
 * the composer scales from the box width — so the height is a nominal band.
 */
const PORTRAIT_BAND = { center: 470, height: 380, referenceHeight: 860 } as const;
const LANDSCAPE_BAND = { center: 215, height: 350, referenceHeight: 430 } as const;

/**
 * The row box for a design space. Side margins and the band's height match the
 * shipped boxes, and the band keeps the same fraction of the space height, so
 * the two phone spaces reproduce `NAME_BOX` (430×860) and `WIDE_WORD_BOX`
 * (860×430) exactly while tablet spaces get the full width of their field.
 */
export function wordRowBox(space: {
  readonly width: number;
  readonly height: number;
  readonly orientation: Orientation;
}): WordBox {
  const band = space.orientation === 'landscape' ? LANDSCAPE_BAND : PORTRAIT_BAND;
  const centerY = (space.height / band.referenceHeight) * band.center;
  return {
    bottom: centerY + band.height / 2,
    left: WORD_BOX_SIDE_MARGIN,
    right: space.width - WORD_BOX_SIDE_MARGIN,
    top: centerY - band.height / 2,
  };
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
