import { describe, expect, it } from 'vitest';

import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import {
  hitNameOverlay,
  hitParentZone,
  type NameOverlayButton,
  nameOverlayLayout,
  parentZoneLayout,
} from './parentZone';

describe('parent zone', () => {
  it('places every target at toddler-proof size inside the field', () => {
    const layout = parentZoneLayout(FIELD_WIDTH, FIELD_HEIGHT);
    const buttons = [
      layout.volumeDown,
      layout.volumeUp,
      layout.mute,
      layout.easier,
      layout.name,
      layout.skin,
      layout.reset,
      layout.install,
      layout.done,
    ];
    expect(buttons).toHaveLength(9);
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

  it('places the name setter beside the skin setter', () => {
    const layout = parentZoneLayout(FIELD_WIDTH, FIELD_HEIGHT);
    expect(layout.name.action).toBe('name');
    expect(layout.name.radius * 2).toBeGreaterThanOrEqual(90);
    expect(layout.name.x).toBe(FIELD_WIDTH / 2 - 130);
    expect(layout.name.y).toBe(layout.easier.y);
    expect(hitParentZone(layout, { x: layout.name.x, y: layout.name.y })).toBe('name');
  });

  it('lays the name overlay out inside the field', () => {
    const layout = nameOverlayLayout(FIELD_WIDTH, FIELD_HEIGHT, true);
    const { panel, field } = layout;
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.y).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(FIELD_WIDTH);
    expect(panel.y + panel.height).toBeLessThanOrEqual(FIELD_HEIGHT);
    expect(field.x).toBeGreaterThan(panel.x);
    expect(field.y).toBeGreaterThan(panel.y);
    expect(field.x + field.width).toBeLessThanOrEqual(panel.x + panel.width);
    expect(field.y + field.height).toBeLessThanOrEqual(panel.y + panel.height);
    const buttons = [layout.cancel, layout.save, layout.clear].filter(
      (button): button is NameOverlayButton => button !== null,
    );
    expect(buttons).toHaveLength(3);
    for (const button of buttons) {
      expect(button.radius * 2).toBeGreaterThanOrEqual(90);
      expect(button.x - button.radius).toBeGreaterThanOrEqual(panel.x);
      expect(button.x + button.radius).toBeLessThanOrEqual(panel.x + panel.width);
      expect(button.y - button.radius).toBeGreaterThan(panel.y);
      expect(button.y + button.radius).toBeLessThan(panel.y + panel.height);
    }
  });

  it('shows the clear button only when a name is saved', () => {
    const withName = nameOverlayLayout(FIELD_WIDTH, FIELD_HEIGHT, true);
    const without = nameOverlayLayout(FIELD_WIDTH, FIELD_HEIGHT, false);
    expect(withName.clear?.action).toBe('clear');
    expect(withName.clear?.x).toBe(FIELD_WIDTH / 2);
    expect(without.clear).toBeNull();
    expect(without.save).toEqual(withName.save);
    expect(without.cancel).toEqual(withName.cancel);
  });

  it('hits overlay buttons and ignores the rest', () => {
    const layout = nameOverlayLayout(FIELD_WIDTH, FIELD_HEIGHT, true);
    expect(hitNameOverlay(layout, { x: layout.save.x, y: layout.save.y })).toBe('save');
    expect(hitNameOverlay(layout, { x: layout.cancel.x, y: layout.cancel.y })).toBe('cancel');
    const clear = layout.clear;
    expect(hitNameOverlay(layout, { x: clear?.x ?? 0, y: clear?.y ?? 0 })).toBe('clear');
    expect(
      hitNameOverlay(layout, {
        x: layout.field.x + layout.field.width / 2,
        y: layout.field.y + layout.field.height / 2,
      }),
    ).toBeNull();
    expect(hitNameOverlay(layout, { x: FIELD_WIDTH - 5, y: 5 })).toBeNull();
    const without = nameOverlayLayout(FIELD_WIDTH, FIELD_HEIGHT, false);
    expect(hitNameOverlay(without, { x: clear?.x ?? 0, y: clear?.y ?? 0 })).toBeNull();
  });
});

describe('parent zone (landscape)', () => {
  const W = 860;
  const H = 430;

  it('places every target at toddler-proof size inside the wide field', () => {
    const layout = parentZoneLayout(W, H);
    const buttons = [
      layout.volumeDown,
      layout.volumeUp,
      layout.mute,
      layout.easier,
      layout.name,
      layout.skin,
      layout.reset,
      layout.install,
      layout.done,
    ];
    expect(buttons).toHaveLength(9);
    for (const button of buttons) {
      expect(button.radius * 2).toBeGreaterThanOrEqual(90);
      expect(button.x - button.radius).toBeGreaterThanOrEqual(0);
      expect(button.x + button.radius).toBeLessThanOrEqual(W);
      expect(button.y - button.radius).toBeGreaterThanOrEqual(0);
      expect(button.y + button.radius).toBeLessThanOrEqual(H);
    }
  });

  it('keeps the wide controls clear of each other and the trophy slots', () => {
    const layout = parentZoneLayout(W, H);
    const buttons = [
      layout.volumeDown,
      layout.volumeUp,
      layout.mute,
      layout.easier,
      layout.name,
      layout.skin,
      layout.reset,
      layout.install,
      layout.done,
    ];
    for (let i = 0; i < buttons.length; i += 1) {
      for (let j = i + 1; j < buttons.length; j += 1) {
        const a = buttons[i];
        const b = buttons[j];
        if (!a || !b) {
          continue;
        }
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(a.radius + b.radius);
      }
    }
    for (const slot of layout.trophies) {
      expect(hitParentZone(layout, { x: slot.x, y: slot.y })).toBeNull();
    }
  });

  it('lays the name overlay and its buttons inside the wide field', () => {
    const layout = nameOverlayLayout(W, H, true);
    const { panel, field } = layout;
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.y).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(W);
    expect(panel.y + panel.height).toBeLessThanOrEqual(H);
    expect(field.x).toBeGreaterThan(panel.x);
    expect(field.y).toBeGreaterThan(panel.y);
    expect(field.x + field.width).toBeLessThanOrEqual(panel.x + panel.width);
    expect(field.y + field.height).toBeLessThanOrEqual(panel.y + panel.height);
    for (const button of [layout.cancel, layout.save, layout.clear]) {
      if (!button) {
        continue;
      }
      expect(button.radius * 2).toBeGreaterThanOrEqual(90);
      expect(button.x - button.radius).toBeGreaterThanOrEqual(panel.x);
      expect(button.x + button.radius).toBeLessThanOrEqual(panel.x + panel.width);
      expect(button.y - button.radius).toBeGreaterThanOrEqual(panel.y);
      expect(button.y + button.radius).toBeLessThanOrEqual(panel.y + panel.height);
    }
  });
});
