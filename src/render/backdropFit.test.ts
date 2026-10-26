import { describe, expect, it } from 'vitest';

import { FIELD_SPACES, type FieldSpace } from '../field';
import { BACKDROP_ANCHOR, coverFit, type Size } from './backdropFit';

/** The shipped backdrops: one square 1024² WebP per skin. */
const SQUARE: Size = { height: 1024, width: 1024 };

/** A non-square source, so the math cannot lean on the square case. */
const WIDE: Size = { height: 100, width: 200 };

const SPACES = Object.values(FIELD_SPACES);

/** The cover-crop the renderer shipped before this module: centred both ways. */
function shippedRect(source: Size, design: Size) {
  const scale = Math.max(design.width / source.width, design.height / source.height);
  const width = source.width * scale;
  const height = source.height * scale;
  return { height, width, x: (design.width - width) / 2, y: (design.height - height) / 2 };
}

function expectCover(rect: ReturnType<typeof coverFit>, design: { width: number; height: number }) {
  expect(rect.x).toBeLessThanOrEqual(1e-9);
  expect(rect.y).toBeLessThanOrEqual(1e-9);
  expect(rect.x + rect.width).toBeGreaterThanOrEqual(design.width - 1e-9);
  expect(rect.y + rect.height).toBeGreaterThanOrEqual(design.height - 1e-9);
}

describe('coverFit', () => {
  it('covers every design space with no gap on any edge', () => {
    for (const space of SPACES) {
      expectCover(coverFit(SQUARE, space), space);
      expectCover(coverFit(WIDE, space), space);
    }
  });

  it('keeps the source aspect ratio', () => {
    for (const space of SPACES) {
      const square = coverFit(SQUARE, space);
      expect(square.width / square.height).toBeCloseTo(1, 9);
      const wide = coverFit(WIDE, space);
      expect(wide.width / wide.height).toBeCloseTo(2, 9);
    }
  });

  it('reproduces the shipped phone geometry exactly', () => {
    for (const id of ['phone-portrait', 'phone-landscape'] as const) {
      const space: FieldSpace = FIELD_SPACES[id];
      expect(coverFit(SQUARE, space)).toEqual(shippedRect(SQUARE, space));
      expect(coverFit(WIDE, space)).toEqual(shippedRect(WIDE, space));
    }
  });

  it('leaves a matching aspect untouched on both axes', () => {
    const rect = coverFit(SQUARE, SQUARE);
    expect(rect).toEqual({ height: 1024, width: 1024, x: 0, y: 0 });
  });

  it('breaks a tie on the tighter axis (never under-scales)', () => {
    // 960×1280 from a square: the width ratio (0.9375) is looser than the
    // height ratio (1.25), so the height wins and the sides crop.
    const rect = coverFit(SQUARE, FIELD_SPACES['tablet-portrait']);
    expect(rect.height).toBeCloseTo(1280, 9);
    expect(rect.width).toBeCloseTo(1280, 9);
    expect(rect.y).toBeCloseTo(0, 9);
    expect(rect.x).toBeCloseTo(-160, 9);
  });
});

describe('coverFit anchor', () => {
  it('places the anchored source point at the same field fraction', () => {
    const anchor = { x: 0.62, y: 0.47 };
    for (const space of SPACES) {
      const rect = coverFit(SQUARE, space, anchor);
      const sourceX = anchor.x * SQUARE.width;
      const sourceY = anchor.y * SQUARE.height;
      const scale = rect.width / SQUARE.width;
      expect(rect.x + sourceX * scale).toBeCloseTo(anchor.x * space.width, 6);
      expect(rect.y + sourceY * scale).toBeCloseTo(anchor.y * space.height, 6);
    }
  });

  it('holds the horizon and ground band on every tablet space', () => {
    // The authored square backdrops put the horizon/ground band across the
    // middle of the image, so the default anchor keeps it mid-field — the same
    // place it lands on the authored portrait phone reference.
    for (const space of SPACES) {
      const rect = coverFit(SQUARE, space);
      const midField = rect.y + rect.height * BACKDROP_ANCHOR.y;
      expect(midField).toBeCloseTo(BACKDROP_ANCHOR.y * space.height, 6);
    }
  });

  it('never crops the authored portrait phone reference vertically', () => {
    const rect = coverFit(SQUARE, FIELD_SPACES['phone-portrait']);
    expect(rect.y).toBe(0);
    expect(rect.height).toBe(rect.width);
  });

  it('clamps an out-of-range anchor', () => {
    const space = FIELD_SPACES['tablet-landscape'];
    expect(coverFit(SQUARE, space, { x: -3, y: 4 })).toEqual(
      coverFit(SQUARE, space, { x: 0, y: 1 }),
    );
  });

  it('falls back to the centred anchor when a value is not a number', () => {
    const space = FIELD_SPACES['slate-landscape'];
    expect(coverFit(SQUARE, space, { x: Number.NaN, y: Number.NaN })).toEqual(
      coverFit(SQUARE, space, BACKDROP_ANCHOR),
    );
  });
});

describe('coverFit degenerate input', () => {
  it('falls back to the full field for an empty or broken image', () => {
    const space = FIELD_SPACES['slate-portrait'];
    const full = { height: space.height, width: space.width, x: 0, y: 0 };
    expect(coverFit({ height: 0, width: 0 }, space)).toEqual(full);
    expect(coverFit({ height: Number.NaN, width: 1024 }, space)).toEqual(full);
  });

  it('falls back to the full field for a degenerate design', () => {
    expect(coverFit(SQUARE, { height: 0, width: 0 })).toEqual({
      height: 0,
      width: 0,
      x: 0,
      y: 0,
    });
  });
});
