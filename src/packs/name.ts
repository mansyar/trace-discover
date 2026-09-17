// Runtime-composed "My Name" level: the shipped uppercase letter glyphs
// (LETTER_LEVELS geometry — kept in sync by the letters-pack content notes)
// are laid out left to right inside NAME_BOX, scaled down for longer names.
// The level is pure data: the trail engine, session and reward machinery are
// untouched, and long-name visuals thin proportionally with toddler-visible
// floors.
import type { Point } from '../engine/types';
import { FIELD_WIDTH, type Orientation } from '../field';
import type { PathStyle } from '../render/renderPath';
import { sanitizeName } from '../save/store';
import { letterGlyph } from './letters';
import type { LevelDef } from './level';
import { createPackEntry, type PackEntry } from './pack';
import { composeWordRow, WIDE_WORD_BOX } from './word';

/** Menu/pack id of the runtime-composed name mini-pack. */
export const NAME_PACK_ID = 'name';

/** Design box the composed name is laid out in (field space). */
export const NAME_BOX = { bottom: 660, left: 40, right: 390, top: 280 } as const;

/** Wide row box the composed name fills in the landscape field. */
export const NAME_BOX_LANDSCAPE = WIDE_WORD_BOX;

const NAME_CENTER_Y = (NAME_BOX.top + NAME_BOX.bottom) / 2;
const NAME_CENTER_Y_LANDSCAPE = (NAME_BOX_LANDSCAPE.top + NAME_BOX_LANDSCAPE.bottom) / 2;
const LETTER_GAP = 30;

function nameBoxFor(orientation: Orientation): typeof NAME_BOX | typeof NAME_BOX_LANDSCAPE {
  return orientation === 'landscape' ? NAME_BOX_LANDSCAPE : NAME_BOX;
}

function layoutName(
  name: string,
  orientation: Orientation = 'portrait',
): { scale: number; strokes: Point[][] } {
  const glyphs = [...name].map(letterGlyph);
  return composeWordRow(glyphs, nameBoxFor(orientation), LETTER_GAP);
}

/** Scale factor applied to the name glyphs (1 = full letter size). */
export function nameGlyphScale(name: string, orientation: Orientation = 'portrait'): number {
  return layoutName(name, orientation).scale;
}

/** The playable "My Name" level: goal art reuses the final letter's vignette. */
export function buildNameLevel(name: string, orientation: Orientation = 'portrait'): LevelDef {
  const { strokes } = layoutName(name, orientation);
  const lastChar = name.at(-1)?.toLowerCase() ?? 'a';
  const center =
    orientation === 'landscape'
      ? { x: (NAME_BOX_LANDSCAPE.left + NAME_BOX_LANDSCAPE.right) / 2, y: NAME_CENTER_Y_LANDSCAPE }
      : { x: FIELD_WIDTH / 2, y: NAME_CENTER_Y };
  const goal = strokes.at(-1)?.at(-1) ?? center;
  return {
    goal,
    goalArt: `/art/goal/abc-${lastChar}.webp`,
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
export function namePackFor(
  name: string | undefined,
  orientation: Orientation = 'portrait',
): PackEntry | null {
  const sanitized = name === undefined ? '' : sanitizeName(name);
  if (sanitized === '') {
    return null;
  }
  return createPackEntry({
    badgeId: 'name-badge',
    id: NAME_PACK_ID,
    levels: [buildNameLevel(sanitized, orientation)],
    menuFill: '#f6b45a',
  });
}
