/** Axis-aligned rectangle in CSS pixels. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Backing-store size for a canvas: CSS size scaled by the device pixel ratio.
 * Rounding keeps the backing store integral, which avoids blurry half-pixel
 * rendering on devices with non-integer effective ratios.
 */
export function computeBackingSize(
  cssWidth: number,
  cssHeight: number,
  dpr: number,
): { width: number; height: number } {
  return {
    width: Math.round(cssWidth * dpr),
    height: Math.round(cssHeight * dpr),
  };
}

/**
 * Largest rectangle with the given aspect ratio that fits inside the
 * container, centered. Produces a letterbox (extra top/bottom margin) on
 * tall containers and a pillarbox (extra side margin) on wide ones, so the
 * play field keeps identical proportions on phones and tablets.
 *
 * The width/height branches multiply before dividing so the constrained
 * dimension comes out exactly equal to the container edge.
 */
export function fitRect(
  containerWidth: number,
  containerHeight: number,
  aspectWidth: number,
  aspectHeight: number,
): Rect {
  let width = containerWidth;
  let height = (containerWidth * aspectHeight) / aspectWidth;

  if (height > containerHeight) {
    height = containerHeight;
    width = (containerHeight * aspectWidth) / aspectHeight;
  }

  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
  };
}
