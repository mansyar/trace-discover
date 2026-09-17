/**
 * Design-space size of the letterboxed play field (portrait phone reference).
 * Level data, tolerance, and speeds are authored in these units; every device
 * scales the field to fit while keeping level geometry identical.
 */
export const FIELD_WIDTH = 430;
export const FIELD_HEIGHT = 860;

/** The wide twin of the portrait reference field (exact swap). */
export const LANDSCAPE_FIELD_WIDTH = 860;
export const LANDSCAPE_FIELD_HEIGHT = 430;

/** Viewport layout orientation. */
export type Orientation = 'portrait' | 'landscape';

/**
 * Orientation policy: a wider-than-tall viewport is landscape; everything
 * else — including square — stays portrait.
 */
export function orientationFor(viewportWidth: number, viewportHeight: number): Orientation {
  return viewportWidth > viewportHeight ? 'landscape' : 'portrait';
}

/** Design-space size for an orientation. */
export function fieldSizeFor(orientation: Orientation): { width: number; height: number } {
  return orientation === 'landscape'
    ? { width: LANDSCAPE_FIELD_WIDTH, height: LANDSCAPE_FIELD_HEIGHT }
    : { width: FIELD_WIDTH, height: FIELD_HEIGHT };
}
