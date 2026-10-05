/**
 * Design-space geometry.
 *
 * All level data, tolerance, and speeds are authored in the portrait phone
 * reference field (430×860); a device scales the chosen space to fit while
 * keeping level geometry identical. Six spaces exist: the two authored phone
 * references, plus two tablet families in each orientation — `tablet` (4:3,
 * iPads) and `slate` (16:10, Android tablets).
 *
 * A viewport picks the space that wastes the least screen area, so a 4:3 iPad
 * and a 16:10 Android tablet play edge to edge with no letterbox bars while
 * phones keep their authored reference exactly.
 */

/** Design-space size of the letterboxed play field (portrait phone reference). */
export const FIELD_WIDTH = 430;
export const FIELD_HEIGHT = 860;

/** The wide twin of the portrait reference field (exact swap). */
export const LANDSCAPE_FIELD_WIDTH = 860;
export const LANDSCAPE_FIELD_HEIGHT = 430;

/** 4:3 tablet reference (iPad), portrait units. */
export const TABLET_FIELD_WIDTH = 960;
export const TABLET_FIELD_HEIGHT = 1280;

/** 16:10 tablet reference (Android slate), portrait units. */
export const SLATE_FIELD_WIDTH = 800;
export const SLATE_FIELD_HEIGHT = 1280;

/** Viewport layout orientation. */
export type Orientation = 'portrait' | 'landscape';

/** Identifier of one of the six design spaces. */
export type FieldSpaceId =
  | 'phone-portrait'
  | 'phone-landscape'
  | 'tablet-portrait'
  | 'tablet-landscape'
  | 'slate-portrait'
  | 'slate-landscape';

/** A design space: the box every screen's layout math is composed in. */
export interface FieldSpace {
  readonly id: FieldSpaceId;
  readonly orientation: Orientation;
  readonly width: number;
  readonly height: number;
}

/**
 * Orientation policy: a wider-than-tall viewport is landscape; everything
 * else — including square — stays portrait.
 */
export function orientationFor(viewportWidth: number, viewportHeight: number): Orientation {
  return viewportWidth > viewportHeight ? 'landscape' : 'portrait';
}

/** All six design spaces, keyed by id. */
export const FIELD_SPACES: Readonly<Record<FieldSpaceId, FieldSpace>> = {
  'phone-portrait': {
    id: 'phone-portrait',
    orientation: 'portrait',
    width: FIELD_WIDTH,
    height: FIELD_HEIGHT,
  },
  'slate-portrait': {
    id: 'slate-portrait',
    orientation: 'portrait',
    width: SLATE_FIELD_WIDTH,
    height: SLATE_FIELD_HEIGHT,
  },
  'tablet-portrait': {
    id: 'tablet-portrait',
    orientation: 'portrait',
    width: TABLET_FIELD_WIDTH,
    height: TABLET_FIELD_HEIGHT,
  },
  'tablet-landscape': {
    id: 'tablet-landscape',
    orientation: 'landscape',
    width: TABLET_FIELD_HEIGHT,
    height: TABLET_FIELD_WIDTH,
  },
  'slate-landscape': {
    id: 'slate-landscape',
    orientation: 'landscape',
    width: SLATE_FIELD_HEIGHT,
    height: SLATE_FIELD_WIDTH,
  },
  'phone-landscape': {
    id: 'phone-landscape',
    orientation: 'landscape',
    width: LANDSCAPE_FIELD_WIDTH,
    height: LANDSCAPE_FIELD_HEIGHT,
  },
};

/**
 * Anchors in tie-break order: ascending aspect within each orientation, so an
 * equal loss keeps the smaller-aspect (taller, narrower) field.
 */
const PORTRAIT_ANCHORS: readonly [FieldSpace, FieldSpace, FieldSpace] = [
  FIELD_SPACES['phone-portrait'],
  FIELD_SPACES['slate-portrait'],
  FIELD_SPACES['tablet-portrait'],
];

const LANDSCAPE_ANCHORS: readonly [FieldSpace, FieldSpace, FieldSpace] = [
  FIELD_SPACES['tablet-landscape'],
  FIELD_SPACES['slate-landscape'],
  FIELD_SPACES['phone-landscape'],
];

/**
 * Share of a viewport of `viewportAspect` that a fitted `space` cannot cover:
 * 0 when the aspects match exactly (edge-to-edge play), approaching 1 as they
 * diverge. Fitting a field of aspect `a` into a viewport of aspect `v` covers
 * `min(a/v, v/a)` of the area.
 */
export function letterboxLoss(space: FieldSpace, viewportAspect: number): number {
  const aspect = space.width / space.height;
  return 1 - Math.min(aspect / viewportAspect, viewportAspect / aspect);
}

/**
 * The design space a viewport should play in: the anchor of its orientation
 * class (square viewports are portrait) that loses the least screen area, with
 * an equal loss resolving to the smaller aspect. A degenerate viewport falls
 * back to the portrait phone reference.
 */
export function fieldSpaceFor(viewportWidth: number, viewportHeight: number): FieldSpace {
  if (!(viewportWidth > 0) || !(viewportHeight > 0)) {
    return FIELD_SPACES['phone-portrait'];
  }
  const viewportAspect = viewportWidth / viewportHeight;
  const anchors =
    orientationFor(viewportWidth, viewportHeight) === 'landscape'
      ? LANDSCAPE_ANCHORS
      : PORTRAIT_ANCHORS;
  let best = anchors[0];
  let bestLoss = letterboxLoss(best, viewportAspect);
  for (const anchor of anchors.slice(1)) {
    const loss = letterboxLoss(anchor, viewportAspect);
    if (loss < bestLoss) {
      best = anchor;
      bestLoss = loss;
    }
  }
  return best;
}

/** Design-space size for an orientation (the authored phone reference). */
export function fieldSizeFor(orientation: Orientation): { width: number; height: number } {
  return orientation === 'landscape'
    ? { width: LANDSCAPE_FIELD_WIDTH, height: LANDSCAPE_FIELD_HEIGHT }
    : { width: FIELD_WIDTH, height: FIELD_HEIGHT };
}
