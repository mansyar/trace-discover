import { describe, expect, it } from 'vitest';

import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import { hitParentZone, parentZoneLayout } from './parentZone';

describe('parent zone', () => {
  it('places every target at toddler-proof size inside the field', () => {
    const layout = parentZoneLayout(FIELD_WIDTH, FIELD_HEIGHT);
    const buttons = [
      layout.volumeDown,
      layout.volumeUp,
      layout.mute,
      layout.easier,
      layout.skin,
      layout.reset,
      layout.install,
      layout.done,
    ];
    expect(buttons).toHaveLength(8);
    for (const button of buttons) {
      expect(button.radius * 2).toBeGreaterThanOrEqual(90);
      expect(button.x - button.radius).toBeGreaterThanOrEqual(0);
      expect(button.x + button.radius).toBeLessThanOrEqual(FIELD_WIDTH);
      expect(button.y - button.radius).toBeGreaterThanOrEqual(0);
      expect(button.y + button.radius).toBeLessThanOrEqual(FIELD_HEIGHT);
    }
  });

  it('hits the nearest button or null in empty space', () => {
    const layout = parentZoneLayout(FIELD_WIDTH, FIELD_HEIGHT);
    expect(hitParentZone(layout, { x: layout.done.x, y: layout.done.y })).toBe('done');
    expect(hitParentZone(layout, { x: layout.mute.x, y: layout.mute.y })).toBe('mute');
    expect(hitParentZone(layout, { x: layout.reset.x, y: layout.reset.y })).toBe('reset');
    expect(hitParentZone(layout, { x: FIELD_WIDTH / 2, y: 40 })).toBeNull();
  });

  it('hits the skin setter', () => {
    const layout = parentZoneLayout(FIELD_WIDTH, FIELD_HEIGHT);
    expect(hitParentZone(layout, { x: layout.skin.x, y: layout.skin.y })).toBe('skin');
  });

  it('shows three display-only trophy slots that never steal taps', () => {
    const layout = parentZoneLayout(FIELD_WIDTH, FIELD_HEIGHT);
    expect(layout.trophies).toHaveLength(3);
    layout.trophies.forEach((slot) => {
      expect(slot.x - slot.radius).toBeGreaterThanOrEqual(0);
      expect(slot.x + slot.radius).toBeLessThanOrEqual(FIELD_WIDTH);
      expect(slot.y - slot.radius).toBeGreaterThanOrEqual(0);
      expect(slot.y + slot.radius).toBeLessThanOrEqual(FIELD_HEIGHT);
      expect(hitParentZone(layout, { x: slot.x, y: slot.y })).toBeNull();
    });
  });
});
