import { describe, expect, it } from 'vitest';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import { badgeLayout } from './badge';

describe('badgeLayout (portrait baseline)', () => {
  it('keeps the shipped seal + home positions', () => {
    const layout = badgeLayout(FIELD_WIDTH, FIELD_HEIGHT);
    expect(layout.seal).toEqual({ x: 215, y: 380, radius: 110 });
    expect(layout.home).toEqual({ x: 215, y: 770, radius: 48 });
  });

  it('keeps seal and home inside the field without overlap', () => {
    const layout = badgeLayout(FIELD_WIDTH, FIELD_HEIGHT);
    expect(layout.seal.x - layout.seal.radius).toBeGreaterThanOrEqual(0);
    expect(layout.seal.y - layout.seal.radius).toBeGreaterThanOrEqual(0);
    expect(layout.home.y + layout.home.radius).toBeLessThanOrEqual(FIELD_HEIGHT);
    expect(layout.seal.y + layout.seal.radius).toBeLessThan(layout.home.y - layout.home.radius);
  });
});

describe('badgeLayout (landscape)', () => {
  it('centers both targets inside the wide field without overlap', () => {
    const layout = badgeLayout(860, 430);
    expect(layout.seal.x).toBe(430);
    expect(layout.home.x).toBe(430);
    expect(layout.seal.y - layout.seal.radius).toBeGreaterThanOrEqual(0);
    expect(layout.home.y + layout.home.radius).toBeLessThanOrEqual(430);
    expect(layout.seal.y + layout.seal.radius).toBeLessThan(layout.home.y - layout.home.radius);
  });
});
