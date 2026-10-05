import { describe, expect, it } from 'vitest';
import {
  FIELD_HEIGHT,
  FIELD_SPACES,
  FIELD_WIDTH,
  fieldSizeFor,
  fieldSpaceFor,
  LANDSCAPE_FIELD_HEIGHT,
  LANDSCAPE_FIELD_WIDTH,
  letterboxLoss,
  orientationFor,
} from './field';
import { fitRect } from './shell/layout';

describe('orientationFor', () => {
  it('detects portrait when the viewport is taller than wide', () => {
    expect(orientationFor(430, 900)).toBe('portrait');
    expect(orientationFor(834, 1194)).toBe('portrait');
  });

  it('detects landscape when the viewport is wider than tall', () => {
    expect(orientationFor(900, 430)).toBe('landscape');
    expect(orientationFor(1180, 820)).toBe('landscape');
  });

  it('treats a square viewport as portrait', () => {
    expect(orientationFor(700, 700)).toBe('portrait');
  });
});

describe('fieldSizeFor', () => {
  it('returns the portrait design space (the 430×860 baseline fixture)', () => {
    expect(fieldSizeFor('portrait')).toEqual({ width: 430, height: 860 });
    expect(fieldSizeFor('portrait')).toEqual({ width: FIELD_WIDTH, height: FIELD_HEIGHT });
  });

  it('returns the landscape design space as the exact wide twin', () => {
    expect(fieldSizeFor('landscape')).toEqual({ width: 860, height: 430 });
  });

  it('keeps the same area in both orientations', () => {
    const portrait = fieldSizeFor('portrait');
    const landscape = fieldSizeFor('landscape');
    expect(portrait.width * portrait.height).toBe(landscape.width * landscape.height);
  });
});

describe('field math across both aspects', () => {
  it('letterboxes the portrait field exactly as before on a tall phone viewport', () => {
    const space = fieldSizeFor('portrait');
    expect(fitRect(430, 900, space.width, space.height)).toEqual({
      x: 0,
      y: 20,
      width: 430,
      height: 860,
    });
  });

  it('pillarboxes the landscape field by a hair on a 900×430 phone viewport', () => {
    const space = fieldSizeFor('landscape');
    expect(fitRect(900, 430, space.width, space.height)).toEqual({
      x: 20,
      y: 0,
      width: 860,
      height: 430,
    });
  });

  it('fills the height of a tablet landscape viewport with side margins', () => {
    const space = fieldSizeFor('landscape');
    const rect = fitRect(1180, 820, space.width, space.height);
    expect(rect).toEqual({ x: 0, y: 115, width: 1180, height: 590 });
  });
});

describe('letterboxLoss', () => {
  it('is zero when the anchor aspect matches the viewport exactly', () => {
    expect(letterboxLoss(FIELD_SPACES['phone-portrait'], 0.5)).toBe(0);
    expect(letterboxLoss(FIELD_SPACES['tablet-landscape'], 4 / 3)).toBe(0);
    expect(letterboxLoss(FIELD_SPACES['slate-landscape'], 1.6)).toBe(0);
  });

  it('reports the share of the viewport the fitted field cannot cover', () => {
    // The authored portrait phone field on a 4:3 iPad loses a third of the width.
    expect(letterboxLoss(FIELD_SPACES['phone-portrait'], 0.75)).toBeCloseTo(1 / 3, 10);
    // The authored wide phone field on a 4:3 landscape tablet loses a third of the height.
    expect(letterboxLoss(FIELD_SPACES['phone-landscape'], 4 / 3)).toBeCloseTo(1 / 3, 10);
  });

  it('is symmetric in the ratio direction', () => {
    const space = FIELD_SPACES['tablet-portrait'];
    expect(letterboxLoss(space, 0.375)).toBeCloseTo(letterboxLoss(space, 1.5), 10);
  });
});

describe('FIELD_SPACES', () => {
  it('exposes the six documented anchors', () => {
    expect(Object.keys(FIELD_SPACES)).toHaveLength(6);
    expect(FIELD_SPACES['phone-portrait']).toEqual({
      id: 'phone-portrait',
      orientation: 'portrait',
      width: 430,
      height: 860,
    });
    expect(FIELD_SPACES['tablet-portrait']).toEqual({
      id: 'tablet-portrait',
      orientation: 'portrait',
      width: 960,
      height: 1280,
    });
    expect(FIELD_SPACES['tablet-landscape']).toEqual({
      id: 'tablet-landscape',
      orientation: 'landscape',
      width: 1280,
      height: 960,
    });
    expect(FIELD_SPACES['slate-portrait']).toEqual({
      id: 'slate-portrait',
      orientation: 'portrait',
      width: 800,
      height: 1280,
    });
    expect(FIELD_SPACES['slate-landscape']).toEqual({
      id: 'slate-landscape',
      orientation: 'landscape',
      width: 1280,
      height: 800,
    });
  });

  it('keeps the authored phone references as the exported constants', () => {
    const portrait: (typeof FIELD_SPACES)['phone-portrait'] = FIELD_SPACES['phone-portrait'];
    const landscape: (typeof FIELD_SPACES)['phone-landscape'] = FIELD_SPACES['phone-landscape'];
    expect(portrait.width).toBe(FIELD_WIDTH);
    expect(portrait.height).toBe(FIELD_HEIGHT);
    expect(landscape.width).toBe(LANDSCAPE_FIELD_WIDTH);
    expect(landscape.height).toBe(LANDSCAPE_FIELD_HEIGHT);
  });
});

describe('fieldSpaceFor — nearest-anchor selection', () => {
  it('returns the authored phone references for phone viewports', () => {
    expect(fieldSpaceFor(FIELD_WIDTH, FIELD_HEIGHT).id).toBe('phone-portrait');
    expect(fieldSpaceFor(390, 844).id).toBe('phone-portrait');
    expect(fieldSpaceFor(LANDSCAPE_FIELD_WIDTH, LANDSCAPE_FIELD_HEIGHT).id).toBe('phone-landscape');
    expect(fieldSpaceFor(900, 430).id).toBe('phone-landscape');
  });

  it('keeps the phone field geometry byte-identical to the pre-track fixture', () => {
    const space = fieldSpaceFor(430, 900);
    expect(space).toEqual({
      id: 'phone-portrait',
      orientation: 'portrait',
      width: 430,
      height: 860,
    });
    expect(fitRect(430, 900, space.width, space.height)).toEqual({
      x: 0,
      y: 20,
      width: 430,
      height: 860,
    });
  });

  it('never gives a phone viewport a tablet anchor', () => {
    expect(fieldSpaceFor(1080, 2400).id).toBe('phone-portrait'); // 20:9 Android
    expect(fieldSpaceFor(1170, 2532).id).toBe('phone-portrait'); // 19.5:9 iPhone
    expect(fieldSpaceFor(844, 390).id).toBe('phone-landscape'); // 19.5:9 rotated
    expect(fieldSpaceFor(2532, 1170).id).toBe('phone-landscape');
  });

  it('fills a 4:3 tablet viewport with the 4:3 anchors and no bars', () => {
    const viewports: readonly (readonly [number, number])[] = [
      [960, 1280],
      [768, 1024],
      [810, 1080],
      [1280, 960],
      [1024, 768],
    ];
    for (const [width, height] of viewports) {
      const space = fieldSpaceFor(width, height);
      expect(space.id).toMatch(/^tablet-/);
      expect(letterboxLoss(space, width / height)).toBe(0);
    }
  });

  it('fills a 16:10 tablet viewport with the 16:10 anchors and no bars', () => {
    const viewports: readonly (readonly [number, number])[] = [
      [800, 1280],
      [1280, 800],
      [1600, 2560],
    ];
    for (const [width, height] of viewports) {
      const space = fieldSpaceFor(width, height);
      expect(space.id).toMatch(/^slate-/);
      expect(letterboxLoss(space, width / height)).toBe(0);
    }
  });

  it('gives a real iPad (1024×1366) the 4:3 anchor with sub-pixel bars', () => {
    const width = 1024;
    const height = 1366;
    const space = fieldSpaceFor(width, height);
    expect(space.id).toBe('tablet-portrait');
    expect(letterboxLoss(space, width / height)).toBeLessThan(0.001);
    const rect = fitRect(width, height, space.width, space.height);
    expect(rect.width).toBe(width);
    expect(height - rect.height).toBeLessThan(1);
  });

  it('lands an Android 3:2 tablet on the 16:10 anchor', () => {
    const width = 800;
    const height = 1200; // 0.666…
    const space = fieldSpaceFor(width, height);
    expect(space.id).toBe('slate-portrait');
    expect(letterboxLoss(space, width / height)).toBeCloseTo(0.0625, 4);
  });

  it('treats a square viewport as portrait and takes the nearest portrait anchor', () => {
    expect(orientationFor(700, 700)).toBe('portrait');
    expect(fieldSpaceFor(700, 700).id).toBe('tablet-portrait');
  });

  it('resolves the portrait tie band to the smaller-aspect anchor', () => {
    // sqrt(0.5 × 0.625) = 0.559016… is equidistant between the phone and 16:10
    // anchors: just below it the phone anchor wins, just above it 16:10 does.
    expect(fieldSpaceFor(555, 1000).id).toBe('phone-portrait');
    expect(fieldSpaceFor(565, 1000).id).toBe('slate-portrait');
  });

  it('falls back to the portrait phone reference for a degenerate viewport', () => {
    expect(fieldSpaceFor(0, 0).id).toBe('phone-portrait');
    expect(fieldSpaceFor(Number.NaN, 800).id).toBe('phone-portrait');
    expect(fieldSpaceFor(-10, 900).id).toBe('phone-portrait');
  });
});
