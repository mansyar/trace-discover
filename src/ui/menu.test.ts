import { describe, expect, it } from 'vitest';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import {
  hitMenuCard,
  inParentGate,
  type MenuLayout,
  menuCardArtMaxHeight,
  menuDotPositions,
  menuLayout,
  menuParkPosition,
  splashLayout,
} from './menu';

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
  it('returns one card per pack id in order', () => {
    expect(layout().cards.map((card) => card.packId)).toEqual(THEMES);
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
  it('hits each card center with its pack id', () => {
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

describe('menuDotPositions', () => {
  it('keeps a single centered row for current packs', () => {
    const card = cardAt(layout(), 0);
    const dots = menuDotPositions(12, card);
    expect(dots).toHaveLength(12);
    expect(new Set(dots.map((dot) => dot.y)).size).toBe(1);
    const left = dots[0];
    const right = dots[dots.length - 1];
    expect((left?.x ?? 0) - card.x).toBeGreaterThanOrEqual(8);
    expect(card.x + card.width - (right?.x ?? 0)).toBeGreaterThanOrEqual(8);
    expect(((left?.x ?? 0) + (right?.x ?? 0)) / 2).toBeCloseTo(card.x + card.width / 2, 5);
  });

  it('wraps twenty-six letters into two centered rows inside the card', () => {
    const card = cardAt(layout(), 0);
    const dots = menuDotPositions(26, card);
    expect(dots).toHaveLength(26);
    const top = dots.slice(0, 13);
    const bottom = dots.slice(13);
    expect(new Set(top.map((dot) => dot.y)).size).toBe(1);
    expect(new Set(bottom.map((dot) => dot.y)).size).toBe(1);
    expect((top[0]?.y ?? 0) < (bottom[0]?.y ?? 0)).toBe(true); // reading order: top row first
    for (const dot of dots) {
      expect(dot.x).toBeGreaterThanOrEqual(card.x + 8);
      expect(dot.x).toBeLessThanOrEqual(card.x + card.width - 8);
      expect(dot.y).toBeGreaterThanOrEqual(card.y + 8);
      expect(dot.y).toBeLessThanOrEqual(card.y + card.height - 8);
    }
    // both rows share the card's center line
    expect(((top[0]?.x ?? 0) + (top[12]?.x ?? 0)) / 2).toBeCloseTo(card.x + card.width / 2, 5);
    expect(((bottom[0]?.x ?? 0) + (bottom[12]?.x ?? 0)) / 2).toBeCloseTo(
      card.x + card.width / 2,
      5,
    );
  });

  it('wraps dots by the card width on landscape cards', () => {
    const card = cardAt(menuLayout(860, 430, THEMES), 0);
    const dots = menuDotPositions(26, card);
    expect(dots).toHaveLength(26);
    const rows = [dots.slice(0, 9), dots.slice(9, 18), dots.slice(18)];
    for (const row of rows) {
      expect(new Set(row.map((dot) => dot.y)).size).toBe(1);
    }
    expect(rows[0]?.[0]?.y ?? 0).toBeLessThan(rows[1]?.[0]?.y ?? 0);
    expect(rows[2]).toHaveLength(8);
    for (const dot of dots) {
      expect(dot.x).toBeGreaterThanOrEqual(card.x + 8);
      expect(dot.x).toBeLessThanOrEqual(card.x + card.width - 8);
      expect(dot.y).toBeGreaterThanOrEqual(card.y + 8);
      expect(dot.y).toBeLessThanOrEqual(card.y + card.height - 8);
    }
    for (const row of rows) {
      const first = row[0];
      const last = row[row.length - 1];
      expect(((first?.x ?? 0) + (last?.x ?? 0)) / 2).toBeCloseTo(card.x + card.width / 2, 5);
    }
  });
});

describe('menuLayout (landscape)', () => {
  const LANDSCAPE_WIDTH = 860;
  const LANDSCAPE_HEIGHT = 430;

  it('lays three packs out in a single centered row', () => {
    const current = menuLayout(LANDSCAPE_WIDTH, LANDSCAPE_HEIGHT, THEMES);
    const first = cardAt(current, 0);
    const second = cardAt(current, 1);
    const third = cardAt(current, 2);
    expect(new Set(current.cards.map((card) => card.y)).size).toBe(1);
    expect(first.width).toBeCloseTo((860 - 130 - 2 * 30) / 3, 5);
    expect(second.x - (first.x + first.width)).toBeCloseTo(30, 5);
    expect(third.x - (second.x + second.width)).toBeCloseTo(30, 5);
    expect(first.y).toBeCloseTo((LANDSCAPE_HEIGHT - first.height) / 2, 5);
  });

  it('wraps four packs (name set) into a centered 2x2 block', () => {
    const current = menuLayout(LANDSCAPE_WIDTH, LANDSCAPE_HEIGHT, [...THEMES, 'name']);
    const first = cardAt(current, 0);
    const second = cardAt(current, 1);
    const third = cardAt(current, 2);
    expect(current.cards).toHaveLength(4);
    expect(second.y).toBe(first.y);
    expect(third.y).toBeGreaterThan(first.y);
    expect(second.x).toBeGreaterThan(first.x);
    expect(first.y).toBeCloseTo(LANDSCAPE_HEIGHT - (third.y + third.height), 5);
  });

  it('keeps every landscape card inside the field', () => {
    for (const ids of [THEMES, [...THEMES, 'name']]) {
      for (const card of menuLayout(LANDSCAPE_WIDTH, LANDSCAPE_HEIGHT, ids).cards) {
        expect(card.x).toBeGreaterThanOrEqual(0);
        expect(card.y).toBeGreaterThanOrEqual(0);
        expect(card.x + card.width).toBeLessThanOrEqual(LANDSCAPE_WIDTH);
        expect(card.y + card.height).toBeLessThanOrEqual(LANDSCAPE_HEIGHT);
      }
    }
  });

  it('parks the parent gate in the top-right corner in landscape too', () => {
    const gate = menuLayout(LANDSCAPE_WIDTH, LANDSCAPE_HEIGHT, THEMES).parentGate;
    expect(gate.x + gate.width).toBe(LANDSCAPE_WIDTH);
    expect(gate.y).toBe(0);
    expect(gate.width).toBeGreaterThanOrEqual(90);
  });
});

describe('menuParkPosition', () => {
  it('parks the mascot near the bottom center in portrait (unchanged)', () => {
    expect(menuParkPosition(FIELD_WIDTH, FIELD_HEIGHT)).toEqual({ x: 215, y: 735 });
  });

  it('parks the mascot clear of the bottom edge in landscape so the sprite fits', () => {
    expect(menuParkPosition(860, 430)).toEqual({ x: 430, y: 300 });
  });
});

describe('menuCardArtMaxHeight', () => {
  it('keeps the current reserve for one- and two-row strips (portrait unchanged)', () => {
    const portrait = cardAt(layout(), 0);
    expect(menuCardArtMaxHeight(portrait, 12)).toBe(92);
    expect(menuCardArtMaxHeight(portrait, 26)).toBe(92);
  });

  it('reserves an extra row on a wrapped landscape card', () => {
    const landscape = cardAt(menuLayout(860, 430, THEMES), 0);
    expect(menuCardArtMaxHeight(landscape, 26)).toBe(76);
    expect(menuCardArtMaxHeight(landscape, 10)).toBe(92);
  });
});
