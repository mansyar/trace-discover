import { describe, expect, it } from 'vitest';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import { hitMenuCard, inParentGate, type MenuLayout, menuLayout, splashLayout } from './menu';

const THEMES = ['dino', 'construction', 'animals'];

function layout(): MenuLayout {
  return menuLayout(FIELD_WIDTH, FIELD_HEIGHT, THEMES);
}

function cardAt(layout: MenuLayout, index: number) {
  const card = layout.cards[index];
  if (card === undefined) {
    throw new Error(`missing card ${index}`);
  }
  return card;
}

describe('menuLayout', () => {
  it('returns one card per theme id in order', () => {
    expect(layout().cards.map((card) => card.themeId)).toEqual(THEMES);
  });

  it('keeps every card at toddler size (90px minimum on both dims)', () => {
    for (const card of layout().cards) {
      expect(card.width).toBeGreaterThanOrEqual(90);
      expect(card.height).toBeGreaterThanOrEqual(90);
    }
  });

  it('keeps every card fully inside the field', () => {
    for (const card of layout().cards) {
      expect(card.x).toBeGreaterThanOrEqual(0);
      expect(card.y).toBeGreaterThanOrEqual(0);
      expect(card.x + card.width).toBeLessThanOrEqual(FIELD_WIDTH);
      expect(card.y + card.height).toBeLessThanOrEqual(FIELD_HEIGHT);
    }
  });

  it('never overlaps two cards', () => {
    const cards = layout().cards;
    for (let a = 0; a < cards.length; a++) {
      for (let b = a + 1; b < cards.length; b++) {
        const first = cardAt(layout(), a);
        const second = cardAt(layout(), b);
        const separated =
          first.x + first.width <= second.x ||
          second.x + second.width <= first.x ||
          first.y + first.height <= second.y ||
          second.y + second.height <= first.y;
        expect(separated).toBe(true);
      }
    }
  });

  it('parks the parent gate in the top-right corner at toddler size', () => {
    const gate = layout().parentGate;
    expect(gate.x + gate.width).toBe(FIELD_WIDTH);
    expect(gate.y).toBe(0);
    expect(gate.width).toBeGreaterThanOrEqual(90);
    expect(gate.height).toBeGreaterThanOrEqual(90);
  });
});

describe('hitMenuCard', () => {
  it('hits each card center with its theme id', () => {
    const current = layout();
    current.cards.forEach((card, index) => {
      expect(
        hitMenuCard(current, { x: card.x + card.width / 2, y: card.y + card.height / 2 }),
      ).toBe(THEMES[index]);
    });
  });

  it('treats the card edge as inside and the pixel beyond as outside', () => {
    const current = layout();
    const card = cardAt(current, 0);
    expect(hitMenuCard(current, { x: card.x + card.width, y: card.y })).toBe(THEMES[0]);
    expect(hitMenuCard(current, { x: card.x + card.width + 1, y: card.y })).toBeNull();
  });

  it('misses the gap between cards', () => {
    const current = layout();
    const first = cardAt(current, 0);
    const second = cardAt(current, 1);
    expect(
      hitMenuCard(current, { x: first.x, y: (first.y + first.height + second.y) / 2 }),
    ).toBeNull();
  });
});

describe('inParentGate', () => {
  it('is true inside the corner zone and false in the middle of the field', () => {
    const current = layout();
    expect(inParentGate(current, { x: FIELD_WIDTH - 1, y: 1 })).toBe(true);
    expect(inParentGate(current, { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT / 2 })).toBe(false);
  });
});

describe('splashLayout', () => {
  it('centers the emblem with a radius that fits the field', () => {
    const splash = splashLayout(FIELD_WIDTH, FIELD_HEIGHT);
    expect(splash.centerX).toBe(FIELD_WIDTH / 2);
    expect(splash.centerY).toBe(FIELD_HEIGHT / 2);
    expect(splash.emblemRadius).toBeGreaterThan(0);
    expect(splash.centerX - splash.emblemRadius).toBeGreaterThanOrEqual(0);
    expect(splash.centerX + splash.emblemRadius).toBeLessThanOrEqual(FIELD_WIDTH);
  });
});
