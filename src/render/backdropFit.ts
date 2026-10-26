/**
 * Raster backdrop fit: cover-crop under a fixed anchor.
 *
 * Backdrops are authored as square 1024² images for every skin, so the six
 * design spaces crop them differently — portrait spaces take the full authored
 * height and crop the sides, landscape spaces keep the middle band. Scaling is
 * always **cover** (the looser axis wins), so the image always fills the field
 * edge to edge and no seam or bar can appear inside it.
 *
 * The anchor is the point of the source that stays at the same relative place
 * in the field. The shipped backdrops compose the horizon and the character's
 * ground line across the middle of the image, so the anchor is the image
 * centre: that keeps the ground band mid-field in every space instead of
 * letting a deeper crop drift it up or down. Because the anchor is applied per
 * axis, the two authored phone references — which crop on exactly one axis —
 * keep the geometry they shipped with.
 */

/** A width/height pair, in design units or source pixels. */
export interface Size {
  readonly width: number;
  readonly height: number;
}

/** Where a cover-cropped image is drawn, in design units. */
export interface FitRect extends Size {
  readonly x: number;
  readonly y: number;
}

/** Normalized point of the source held at the same relative place in the field. */
export interface Anchor {
  readonly x: number;
  readonly y: number;
}

/** The documented backdrop anchor: the image's centre (horizon + ground band). */
export const BACKDROP_ANCHOR: Anchor = { x: 0.5, y: 0.5 };

function isPositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0.5;
  }
  return Math.min(1, Math.max(0, value));
}

/**
 * Cover-crop `source` into `design`: the looser axis wins, `anchor` decides
 * which slice survives, and a degenerate source or field falls back to the
 * whole field (the painter then draws its own stand-in instead).
 */
export function coverFit(source: Size, design: Size, anchor: Anchor = BACKDROP_ANCHOR): FitRect {
  if (
    !isPositive(source.width) ||
    !isPositive(source.height) ||
    !isPositive(design.width) ||
    !isPositive(design.height)
  ) {
    return { height: design.height, width: design.width, x: 0, y: 0 };
  }
  const scale = Math.max(design.width / source.width, design.height / source.height);
  const width = source.width * scale;
  const height = source.height * scale;
  // Exact zero on the uncropped axis (no `-0`, so geometry compares cleanly).
  const cropX = width - design.width;
  const cropY = height - design.height;
  return {
    height,
    width,
    x: cropX === 0 ? 0 : -cropX * clamp01(anchor.x),
    y: cropY === 0 ? 0 : -cropY * clamp01(anchor.y),
  };
}
