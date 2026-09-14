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
      layout.reset,
      layout.install,
      layout.done,
    ];
    expect(buttons).toHaveLength(7);
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
});
