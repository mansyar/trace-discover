import { describe, expect, it } from 'vitest';

import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import {
  hitNameOverlay,
  hitParentZone,
  type NameOverlayButton,
  nameOverlayLayout,
  type OverlayRect,
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

  it('groups the controls into five labeled section cards inside the field', () => {
    const layout = parentZoneLayout(FIELD_WIDTH, FIELD_HEIGHT);
    expect(layout.cards.map((card) => card.id)).toEqual([
      'sound',
      'skinName',
      'play',
      'data',
      'help',
    ]);
    expect(layout.cards.map((card) => card.label)).toEqual([
      'Sound',
      'Skin & Name',
      'Play',
      'Data',
      'Help',
    ]);
    expect(layout.cards.map((card) => card.mini)).toEqual([false, false, true, true, true]);
    for (const card of layout.cards) {
      expect(card.rect.x).toBeGreaterThanOrEqual(0);
      expect(card.rect.x + card.rect.width).toBeLessThanOrEqual(FIELD_WIDTH);
      expect(card.rect.y).toBeGreaterThanOrEqual(0);
      expect(card.rect.y + card.rect.height).toBeLessThanOrEqual(FIELD_HEIGHT);
    }
  });

  it('keeps every control fully inside its section card', () => {
    const layout = parentZoneLayout(FIELD_WIDTH, FIELD_HEIGHT);
    const cardFor: Record<string, string> = {
      mute: 'sound',
      easier: 'play',
      'volume-down': 'sound',
      'volume-up': 'sound',
      name: 'skinName',
      reset: 'data',
      skin: 'skinName',
      install: 'help',
    };
    const controls = [
      layout.volumeDown,
      layout.volumeUp,
      layout.mute,
      layout.easier,
      layout.name,
      layout.skin,
      layout.reset,
      layout.install,
    ];
    for (const control of controls) {
      const card = layout.cards.find((candidate) => candidate.id === cardFor[control.action]);
      if (!card) {
        throw new Error(`no section card for ${control.action}`);
      }
      expect(control.x - control.radius).toBeGreaterThanOrEqual(card.rect.x);
      expect(control.x + control.radius).toBeLessThanOrEqual(card.rect.x + card.rect.width);
      expect(control.y - control.radius).toBeGreaterThanOrEqual(card.rect.y);
      expect(control.y + control.radius).toBeLessThanOrEqual(card.rect.y + card.rect.height);
    }
  });

  it('never overlaps cards, trophies, or done', () => {
    const layout = parentZoneLayout(FIELD_WIDTH, FIELD_HEIGHT);
    const rects = layout.cards.map((card) => card.rect);
    for (let first = 0; first < rects.length; first += 1) {
      for (let second = first + 1; second < rects.length; second += 1) {
        const a = rects[first];
        const b = rects[second];
        if (!a || !b) {
          continue;
        }
        const overlaps =
          a.x < b.x + b.width &&
          b.x < a.x + a.width &&
          a.y < b.y + b.height &&
          b.y < a.y + a.height;
        expect(overlaps, `card ${first} vs card ${second}`).toBe(false);
      }
    }
    const clamp = (value: number, low: number, high: number): number =>
      Math.max(low, Math.min(value, high));
    const distanceToRect = (x: number, y: number, rect: OverlayRect): number =>
      Math.hypot(
        x - clamp(x, rect.x, rect.x + rect.width),
        y - clamp(y, rect.y, rect.y + rect.height),
      );
    for (const card of layout.cards) {
      expect(distanceToRect(layout.done.x, layout.done.y, card.rect)).toBeGreaterThan(
        layout.done.radius,
      );
      for (const slot of layout.trophies) {
        expect(distanceToRect(slot.x, slot.y, card.rect)).toBeGreaterThan(slot.radius);
      }
    }
    for (const slot of layout.trophies) {
      expect(Math.hypot(slot.x - layout.done.x, slot.y - layout.done.y)).toBeGreaterThan(
        slot.radius + layout.done.radius,
      );
    }
  });

  it('places the name setter beside the skin setter in the Skin & Name card', () => {
    const layout = parentZoneLayout(FIELD_WIDTH, FIELD_HEIGHT);
    expect(layout.name.action).toBe('name');
    expect(layout.name.radius * 2).toBeGreaterThanOrEqual(90);
    expect(layout.name.x).toBe(FIELD_WIDTH / 2 - 110);
    expect(layout.skin.x).toBe(FIELD_WIDTH / 2 + 110);
    expect(layout.name.y).toBe(layout.skin.y);
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

describe('parent zone (tablet spaces)', () => {
  const TABLET_SPACES = [
    { height: 1280, id: 'tablet-portrait', width: 960 },
    { height: 960, id: 'tablet-landscape', width: 1280 },
    { height: 1280, id: 'slate-portrait', width: 800 },
    { height: 800, id: 'slate-landscape', width: 1280 },
  ] as const;

  /** Half the 90-unit toddler target floor. */
  const EDGE_MARGIN = 45;

  const buttonsOf = (layout: ReturnType<typeof parentZoneLayout>) => [
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

  for (const space of TABLET_SPACES) {
    describe(space.id, () => {
      const layout = parentZoneLayout(space.width, space.height);

      it('keeps every target at toddler-proof size a half-floor inside the field', () => {
        for (const button of buttonsOf(layout)) {
          expect(button.radius * 2).toBeGreaterThanOrEqual(90);
          expect(button.x - button.radius).toBeGreaterThanOrEqual(0);
          expect(button.x + button.radius).toBeLessThanOrEqual(space.width);
          expect(button.y - button.radius).toBeGreaterThanOrEqual(0);
          expect(button.y + button.radius).toBeLessThanOrEqual(space.height);
          expect(button.x).toBeGreaterThanOrEqual(EDGE_MARGIN);
          expect(button.x).toBeLessThanOrEqual(space.width - EDGE_MARGIN);
        }
      });

      it('keeps the nine controls from overlapping each other', () => {
        const buttons = buttonsOf(layout);
        for (let first = 0; first < buttons.length; first += 1) {
          for (let second = first + 1; second < buttons.length; second += 1) {
            const a = buttons[first];
            const b = buttons[second];
            if (!a || !b) {
              continue;
            }
            expect(
              Math.hypot(a.x - b.x, a.y - b.y),
              `${a.action} vs ${b.action}`,
            ).toBeGreaterThanOrEqual(a.radius + b.radius);
          }
        }
      });

      it('puts the trophy row on screen without stealing taps', () => {
        for (const slot of layout.trophies) {
          expect(slot.x - slot.radius).toBeGreaterThanOrEqual(0);
          expect(slot.x + slot.radius).toBeLessThanOrEqual(space.width);
          expect(slot.y - slot.radius).toBeGreaterThanOrEqual(0);
          expect(slot.y + slot.radius).toBeLessThanOrEqual(space.height);
          expect(hitParentZone(layout, { x: slot.x, y: slot.y })).toBeNull();
        }
        expect(layout.trophyLabel.y).toBeGreaterThanOrEqual(0);
        expect(layout.trophyLabel.y).toBeLessThanOrEqual(space.height);
      });

      it('uses the field instead of clustering against the top', () => {
        if (space.width > space.height) {
          // Wide: the two control rows spread across the tall field and the
          // block sits centered, with the title riding just above it.
          expect(layout.reset.y - layout.volumeDown.y).toBeGreaterThanOrEqual(space.height / 3);
          expect(
            Math.abs((layout.volumeDown.y + layout.reset.y) / 2 - space.height / 2),
          ).toBeLessThanOrEqual(60);
          expect(layout.title.y).toBeGreaterThan(40);
          expect(layout.title.y).toBeLessThan(layout.volumeDown.y - 30);
        } else {
          // Portrait: the card stack runs from the title band to the bottom
          // margin, with Done anchored near the field's bottom edge.
          expect(layout.title.y).toBeLessThanOrEqual(100);
          expect(layout.done.y + layout.done.radius).toBeGreaterThanOrEqual(space.height - 60);
          const lastCard = layout.cards[layout.cards.length - 1];
          if (lastCard) {
            expect(lastCard.rect.y + lastCard.rect.height).toBeLessThan(
              layout.done.y - layout.done.radius,
            );
          }
        }
      });

      it('keeps every control inside its section card', () => {
        if (layout.cards.length === 0) {
          return;
        }
        const cardFor: Record<string, string> = {
          easier: 'play',
          install: 'help',
          mute: 'sound',
          name: 'skinName',
          reset: 'data',
          skin: 'skinName',
          'volume-down': 'sound',
          'volume-up': 'sound',
        };
        for (const control of buttonsOf(layout).filter((button) => button.action !== 'done')) {
          const card = layout.cards.find((candidate) => candidate.id === cardFor[control.action]);
          if (!card) {
            throw new Error(`no section card for ${control.action}`);
          }
          expect(control.x - control.radius).toBeGreaterThanOrEqual(card.rect.x);
          expect(control.x + control.radius).toBeLessThanOrEqual(card.rect.x + card.rect.width);
          expect(control.y - control.radius).toBeGreaterThanOrEqual(card.rect.y);
          expect(control.y + control.radius).toBeLessThanOrEqual(card.rect.y + card.rect.height);
        }
      });

      it('lays the name overlay out inside the field', () => {
        const overlay = nameOverlayLayout(space.width, space.height, true);
        const { panel, field } = overlay;
        expect(panel.x).toBeGreaterThanOrEqual(0);
        expect(panel.y).toBeGreaterThanOrEqual(0);
        expect(panel.x + panel.width).toBeLessThanOrEqual(space.width);
        expect(panel.y + panel.height).toBeLessThanOrEqual(space.height);
        expect(field.x).toBeGreaterThan(panel.x);
        expect(field.y).toBeGreaterThan(panel.y);
        expect(field.x + field.width).toBeLessThanOrEqual(panel.x + panel.width);
        expect(field.y + field.height).toBeLessThanOrEqual(panel.y + panel.height);
        for (const button of [overlay.cancel, overlay.save, overlay.clear]) {
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
  }

  it('keeps the authored phone layouts byte-identical', () => {
    const portrait = parentZoneLayout(FIELD_WIDTH, FIELD_HEIGHT);
    expect(portrait.title).toEqual({ x: FIELD_WIDTH / 2, y: 70 });
    expect(portrait.cards[0]?.rect).toEqual({ height: 138, width: 350, x: 40, y: 96 });
    expect(portrait.trophies[0]?.y).toBe(620);
    expect(portrait.trophyLabel).toEqual({ x: FIELD_WIDTH / 2, y: 672 });
    expect(portrait.done.y).toBe(770);
    expect(portrait.volumeDown.y).toBe(176);

    const wide = parentZoneLayout(860, 430);
    expect(wide.title).toEqual({ x: 430, y: 70 });
    expect(wide.volumeDown).toEqual({ action: 'volume-down', radius: 46, x: 170, y: 150 });
    expect(wide.skin).toEqual({ action: 'skin', radius: 46, x: 800, y: 150 });
    expect(wide.reset).toEqual({ action: 'reset', radius: 46, x: 170, y: 310 });
    expect(wide.done).toEqual({ action: 'done', radius: 56, x: 800, y: 310 });
    expect(wide.trophyLabel).toEqual({ x: 510, y: 270 });
  });

  it('scales the name overlay above phone size but never below it', () => {
    expect(nameOverlayLayout(FIELD_WIDTH, FIELD_HEIGHT, true).scale).toBe(1);
    expect(nameOverlayLayout(860, 430, true).scale).toBe(1);
    for (const space of [
      { height: 1280, width: 960 },
      { height: 960, width: 1280 },
      { height: 1280, width: 800 },
      { height: 800, width: 1280 },
    ]) {
      expect(nameOverlayLayout(space.width, space.height, true).scale).toBeGreaterThan(1);
    }
  });

  it('lifts the name overlay above the soft keyboard', () => {
    const space = { height: 960, width: 1280 };
    const free = nameOverlayLayout(space.width, space.height, true);
    const lifted = nameOverlayLayout(space.width, space.height, true, 330);
    expect(lifted.panel.y).toBeLessThan(free.panel.y);
    expect(lifted.panel.y + lifted.panel.height).toBeLessThanOrEqual(space.height - 330);
    expect(lifted.panel.y).toBeGreaterThanOrEqual(0);
    expect(lifted.field.y).toBeGreaterThan(lifted.panel.y);
    expect(lifted.save.y + lifted.save.radius).toBeLessThanOrEqual(
      lifted.panel.y + lifted.panel.height,
    );
    // An inset taller than the field cannot push the panel off the top.
    const crushed = nameOverlayLayout(space.width, space.height, true, 5000);
    expect(crushed.panel.y).toBe(0);
  });
});
