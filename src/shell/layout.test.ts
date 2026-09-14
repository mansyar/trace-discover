import { describe, expect, it } from 'vitest';
import { computeBackingSize, fitRect } from './layout';

describe('computeBackingSize', () => {
  it('scales CSS pixels by the device pixel ratio', () => {
    expect(computeBackingSize(430, 860, 3)).toEqual({ width: 1290, height: 2580 });
  });

  it('rounds fractional results', () => {
    expect(computeBackingSize(430.5, 860.25, 2)).toEqual({ width: 861, height: 1721 });
  });

  it('handles a device pixel ratio of 1', () => {
    expect(computeBackingSize(320, 480, 1)).toEqual({ width: 320, height: 480 });
  });
});

describe('fitRect', () => {
  it('letterboxes when the container is taller than the play-field aspect', () => {
    expect(fitRect(400, 1000, 1, 2)).toEqual({ x: 0, y: 100, width: 400, height: 800 });
  });

  it('pillarboxes when the container is wider than the play-field aspect', () => {
    expect(fitRect(1000, 1000, 1, 2)).toEqual({ x: 250, y: 0, width: 500, height: 1000 });
  });

  it('fits exactly when the container matches the play-field aspect', () => {
    expect(fitRect(500, 1000, 1, 2)).toEqual({ x: 0, y: 0, width: 500, height: 1000 });
  });

  it('centers the play field in a wide tablet-landscape container', () => {
    expect(fitRect(1024, 768, 430, 860)).toEqual({ x: 320, y: 0, width: 384, height: 768 });
  });

  it('keeps the play field fully inside the container', () => {
    const rect = fitRect(390, 844, 430, 860);
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(390);
    expect(rect.y + rect.height).toBeLessThanOrEqual(844);
  });
});
