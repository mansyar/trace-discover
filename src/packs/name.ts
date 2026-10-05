// Runtime-composed "My Name" level: the shipped uppercase letter glyphs
// (LETTER_LEVELS geometry — kept in sync by the letters-pack content notes)
// are laid out left to right inside the row box of the active design space,
// scaled down for longer names and never magnified past a single letter's
// authored size. The level is pure data: the trail engine, session and reward
// machinery are untouched, and long-name visuals thin proportionally with
// toddler-visible floors.
import type { Point } from '../engine/types';
import { type FieldSpaceRef, resolveSpace } from '../field';
import type { PathStyle } from '../render/renderPath';
import { sanitizeName } from '../save/store';
import { letterGlyph } from './letters';
import type { LevelDef } from './level';
import { createPackEntry, type PackEntry } from './pack';
import { composeWordRow, WIDE_WORD_BOX, type WordBox, wordRowBox } from './word';

/** Menu/pack id of the runtime-composed name mini-pack. */
export const NAME_PACK_ID = 'name';

/** Design box the composed name is laid out in (portrait phone field space). */
export const NAME_BOX = { bottom: 660, left: 40, right: 390, top: 280 } as const;

/** Wide row box the composed name fills in the landscape phone field. */
export const NAME_BOX_LANDSCAPE = WIDE_WORD_BOX;

const LETTER_GAP = 30;

/**
 * The row box for a space. The two phone references keep their shipped boxes
 * exactly; a tablet space gets the full width of its field, which is what lets
 * a long name use the screen instead of shrinking into the portrait box.
 */
function nameBoxFor(spaceRef: FieldSpaceRef = 'portrait'): WordBox {
  const space = resolveSpace(spaceRef);
  if (space.id === 'phone-portrait') {
    return NAME_BOX;
  }
  if (space.id === 'phone-landscape') {
    return NAME_BOX_LANDSCAPE;
  }
  return wordRowBox(space);
}

function layoutName(
  name: string,
  spaceRef: FieldSpaceRef = 'portrait',
): { scale: number; strokes: Point[][] } {
  const glyphs = [...name].map(letterGlyph);
  return composeWordRow(glyphs, nameBoxFor(spaceRef), LETTER_GAP);
}

/** Scale factor applied to the name glyphs (1 = full letter size). */
export function nameGlyphScale(name: string, spaceRef: FieldSpaceRef = 'portrait'): number {
  return layoutName(name, spaceRef).scale;
}

/** The playable "My Name" level: goal art reuses the final letter's vignette. */
export function buildNameLevel(name: string, spaceRef: FieldSpaceRef = 'portrait'): LevelDef {
  const space = resolveSpace(spaceRef);
  const { strokes } = layoutName(name, space);
  const lastChar = name.at(-1)?.toLowerCase() ?? 'a';
  const box = nameBoxFor(space);
  const center = { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 };
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
  spaceRef: FieldSpaceRef = 'portrait',
): PackEntry | null {
  const sanitized = name === undefined ? '' : sanitizeName(name);
  if (sanitized === '') {
    return null;
  }
  return createPackEntry({
    badgeId: 'name-badge',
    id: NAME_PACK_ID,
    levels: [buildNameLevel(sanitized, spaceRef)],
    menuFill: '#f6b45a',
  });
}
