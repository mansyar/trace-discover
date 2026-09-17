import { describe, expect, it } from 'vitest';
import { FIELD_HEIGHT, FIELD_WIDTH, fieldSizeFor, orientationFor } from './field';
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
