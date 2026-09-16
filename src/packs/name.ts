// Runtime-composed "My Name" level: the shipped uppercase letter glyphs
// (LETTER_LEVELS geometry — kept in sync by the letters-pack content notes)
// are laid out left to right inside NAME_BOX, scaled down for longer names.
// The level is pure data: the trail engine, session and reward machinery are
// untouched, and long-name visuals thin proportionally with toddler-visible
// floors.
import type { Point } from '../engine/types';
import { FIELD_WIDTH } from '../field';
import type { PathStyle } from '../render/renderPath';
import { sanitizeName } from '../save/store';
import { LETTER_LEVELS } from './letters';
import type { LevelDef } from './level';
import { createPackEntry, type PackEntry } from './pack';

/** Menu/pack id of the runtime-composed name mini-pack. */
export const NAME_PACK_ID = 'name';

/** Design box the composed name is laid out in (field space). */
export const NAME_BOX = { bottom: 660, left: 40, right: 390, top: 280 } as const;

const NAME_CENTER_Y = (NAME_BOX.top + NAME_BOX.bottom) / 2;
const LETTER_GAP = 30;

interface Glyph {
  readonly left: number;
  readonly right: number;
  readonly strokes: readonly (readonly Point[])[];
}

function letterGlyph(char: string): Glyph {
  const level = LETTER_LEVELS.find((entry) => entry.id === `abc-${char.toLowerCase()}`);
  if (level === undefined) {
    throw new Error(`no letter glyph for "${char}"`);
  }
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  for (const stroke of level.strokes) {
    for (const point of stroke) {
      left = Math.min(left, point.x);
      right = Math.max(right, point.x);
    }
  }
  return { left, right, strokes: level.strokes };
}

function layoutName(name: string): { scale: number; strokes: Point[][] } {
  const glyphs = [...name].map(letterGlyph);
  const naturalWidth =
    glyphs.reduce((sum, glyph) => sum + (glyph.right - glyph.left), 0) +
    LETTER_GAP * (glyphs.length - 1);
  const scale = Math.min(1, (NAME_BOX.right - NAME_BOX.left) / naturalWidth);

  let cursor = FIELD_WIDTH / 2 - (naturalWidth * scale) / 2;
  const strokes: Point[][] = [];
  for (const glyph of glyphs) {
    for (const stroke of glyph.strokes) {
      strokes.push(
        stroke.map((point) => ({
          x: cursor + (point.x - glyph.left) * scale,
          y: NAME_CENTER_Y + (point.y - NAME_CENTER_Y) * scale,
        })),
      );
    }
    cursor += (glyph.right - glyph.left + LETTER_GAP) * scale;
  }
  return { scale, strokes };
}

/** Scale factor applied to the name glyphs (1 = full letter size). */
export function nameGlyphScale(name: string): number {
  return layoutName(name).scale;
}

/** The playable "My Name" level: goal art reuses the final letter's vignette. */
export function buildNameLevel(name: string): LevelDef {
  const { strokes } = layoutName(name);
  const lastChar = name.at(-1)?.toLowerCase() ?? 'a';
  const goal = strokes.at(-1)?.at(-1) ?? { x: FIELD_WIDTH / 2, y: NAME_CENTER_Y };
  return {
    goal,
    goalArt: `/art/goal/abc-${lastChar}.png`,
    id: 'name-1',
    stroke: 'line',
    strokes,
  };
}

/**
 * Proportional thinning for long names; the floors keep the trail visible for
 * toddler fingers even at the smallest composed scale.
 */
export function namePathStyle(scale: number, base: PathStyle): PathStyle {
  const s = Math.min(1, Math.max(0, scale));
  return {
    ...base,
    dotRadius: Math.max(5, base.dotRadius * s),
    dotSpacing: Math.max(30, base.dotSpacing * s),
    outlineWidth: Math.max(3, base.outlineWidth * s),
    ribbonWidth: Math.max(22, base.ribbonWidth * s),
    tipRadius: Math.max(10, base.tipRadius * s),
  };
}

/** The one-level "My Name" mini-pack for a saved name, else null. */
export function namePackFor(name: string | undefined): PackEntry | null {
  const sanitized = name === undefined ? '' : sanitizeName(name);
  if (sanitized === '') {
    return null;
  }
  return createPackEntry({
    badgeId: 'name-badge',
    id: NAME_PACK_ID,
    levels: [buildNameLevel(sanitized)],
    menuFill: '#f6b45a',
  });
}
