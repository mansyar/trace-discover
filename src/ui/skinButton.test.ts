import { describe, expect, it } from 'vitest';

import type { Point } from '../engine/types';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import {
  canCycleSkin,
  hitSkinButton,
  SKIN_BUTTON_DEBOUNCE_MS,
  skinButtonLayout,
} from './skinButton';

describe('skinButtonLayout', () => {
  it('sits in the top-left corner as a toddler-sized target', () => {
    const zone = skinButtonLayout();
    expect(zone.radius * 2).toBeGreaterThanOrEqual(90);
    expect(zone.x - zone.radius).toBeGreaterThanOrEqual(0);
    expect(zone.y - zone.radius).toBeGreaterThanOrEqual(0);
    expect(zone.x + zone.radius).toBeLessThanOrEqual(FIELD_WIDTH);
    expect(zone.y + zone.radius).toBeLessThanOrEqual(FIELD_HEIGHT);
  });

  it('stays inside the wide landscape field too', () => {
    const zone = skinButtonLayout();
    expect(zone.x + zone.radius).toBeLessThanOrEqual(860);
    expect(zone.y + zone.radius).toBeLessThanOrEqual(430);
  });
});

describe('hitSkinButton', () => {
  const zone = skinButtonLayout();
  const at = (x: number, y: number): Point => ({ x, y });

  it('hits the center and the rim', () => {
    expect(hitSkinButton(zone, at(zone.x, zone.y))).toBe(true);
    expect(hitSkinButton(zone, at(zone.x + zone.radius, zone.y))).toBe(true);
  });

  it('misses outside the circle', () => {
    expect(hitSkinButton(zone, at(zone.x + zone.radius + 2, zone.y))).toBe(false);
    expect(hitSkinButton(zone, at(zone.x, zone.y + zone.radius + 40))).toBe(false);
  });
});

describe('canCycleSkin', () => {
  it('accepts the first tap', () => {
    expect(canCycleSkin(1000, null)).toBe(true);
  });

  it('ignores taps within the debounce window', () => {
    expect(canCycleSkin(1000 + SKIN_BUTTON_DEBOUNCE_MS - 1, 1000)).toBe(false);
  });

  it('accepts again once the window passes', () => {
    expect(canCycleSkin(1000 + SKIN_BUTTON_DEBOUNCE_MS, 1000)).toBe(true);
    expect(canCycleSkin(5000, 1000)).toBe(true);
  });
});
