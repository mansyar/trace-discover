import { describe, expect, it } from 'vitest';
import { FIELD_HEIGHT, FIELD_WIDTH, LANDSCAPE_FIELD_HEIGHT, LANDSCAPE_FIELD_WIDTH } from '../field';
import {
  hitMenuCard,
  inParentGate,
  type MenuCard,
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
  it('returns no cards while the catalog is empty', () => {
    const empty = menuLayout(860, 430, []);
    expect(empty.cards).toEqual([]);
    expect(empty.parentGate.x + empty.parentGate.width).toBe(860);
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

/** Synthetic pack ids for capacity tests (1..N). */
function capacityIds(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `pack-${index}`);
}

function cardIn(cards: readonly MenuCard[], index: number): MenuCard {
  const card = cards[index];
  if (card === undefined) {
    throw new Error(`missing card ${index}`);
  }
  return card;
}

const CAPACITY_FIELDS = [
  { height: FIELD_HEIGHT, label: 'portrait', width: FIELD_WIDTH },
  { height: LANDSCAPE_FIELD_HEIGHT, label: 'landscape', width: LANDSCAPE_FIELD_WIDTH },
] as const;

/** Shared invariants: inside the field, toddler-sized, separated, centers tappable. */
function expectUsableLayout(field: (typeof CAPACITY_FIELDS)[number], count: number): void {
  const layout = menuLayout(field.width, field.height, capacityIds(count));
  const { cards } = layout;
  expect(cards.map((card) => card.packId)).toEqual(capacityIds(count));
  const seen: MenuCard[] = [];
  for (const card of cards) {
    expect(card.width).toBeGreaterThanOrEqual(90);
    expect(card.height).toBeGreaterThanOrEqual(90);
    expect(card.x).toBeGreaterThanOrEqual(0);
    expect(card.y).toBeGreaterThanOrEqual(0);
    expect(card.x + card.width).toBeLessThanOrEqual(field.width);
    expect(card.y + card.height).toBeLessThanOrEqual(field.height);
    for (const other of seen) {
      const separated =
        other.x + other.width <= card.x ||
        card.x + card.width <= other.x ||
        other.y + other.height <= card.y ||
        card.y + card.height <= other.y;
      expect(separated).toBe(true);
    }
    expect(hitMenuCard(layout, { x: card.x + card.width / 2, y: card.y + card.height / 2 })).toBe(
      card.packId,
    );
    seen.push(card);
  }
}

describe('menuLayout (capacity matrix, 1-6 cards)', () => {
  for (const field of CAPACITY_FIELDS) {
    describe(field.label, () => {
      it.each([1, 2, 3, 4, 5, 6])(
        'keeps %i cards inside the field, toddler-sized, separated, and tappable',
        (count) => {
          expectUsableLayout(field, count);
        },
      );
    });
  }

  it('reflows five and six portrait cards into a centered two-column grid', () => {
    const five = menuLayout(FIELD_WIDTH, FIELD_HEIGHT, capacityIds(5)).cards;
    const six = menuLayout(FIELD_WIDTH, FIELD_HEIGHT, capacityIds(6)).cards;
    const gridWidth = (FIELD_WIDTH - 130 - 30) / 2;
    expect(cardIn(five, 0).width).toBeCloseTo(gridWidth, 5);
    expect(cardIn(six, 0).width).toBeCloseTo(gridWidth, 5);
    // Row-major: the first two cards share the top row in two distinct columns.
    expect(cardIn(five, 1).y).toBeCloseTo(cardIn(five, 0).y, 5);
    expect(cardIn(five, 1).x).toBeGreaterThan(cardIn(five, 0).x);
    expect(cardIn(five, 2).y).toBeCloseTo(cardIn(five, 0).y + 180, 5);
    // The odd fifth card centers alone in the third row.
    expect(cardIn(five, 4).y).toBeGreaterThan(cardIn(five, 3).y);
    expect(cardIn(five, 4).x + cardIn(five, 4).width / 2).toBeCloseTo(FIELD_WIDTH / 2, 5);
    // Six fills three full rows.
    expect(cardIn(six, 5).y).toBeCloseTo(cardIn(six, 4).y, 5);
    expect(cardIn(six, 5).x).toBeGreaterThan(cardIn(six, 4).x);
    // The grid stays clear of the parent-gate corner band.
    expect(cardIn(five, 0).y).toBeGreaterThanOrEqual(100);
    expect(cardIn(six, 0).y).toBeGreaterThanOrEqual(100);
  });

  it('wraps five and six landscape cards into a three-column grid', () => {
    const five = menuLayout(860, 430, capacityIds(5)).cards;
    const six = menuLayout(860, 430, capacityIds(6)).cards;
    const gridWidth = (860 - 130 - 60) / 3;
    expect(cardIn(five, 0).width).toBeCloseTo(gridWidth, 5);
    expect(cardIn(six, 0).width).toBeCloseTo(gridWidth, 5);
    // First three share the top row.
    expect(cardIn(five, 1).y).toBeCloseTo(cardIn(five, 0).y, 5);
    expect(cardIn(five, 2).y).toBeCloseTo(cardIn(five, 0).y, 5);
    // The last pair centers on the second row.
    expect(cardIn(five, 3).y).toBeGreaterThan(cardIn(five, 0).y);
    expect(cardIn(five, 3).x + cardIn(five, 4).x + cardIn(five, 4).width).toBeCloseTo(260 + 600, 5);
    // Six fills two full rows with aligned columns.
    expect(cardIn(six, 3).y).toBeGreaterThan(cardIn(six, 0).y);
    expect(cardIn(six, 3).x).toBeCloseTo(cardIn(six, 0).x, 5);
    expect(cardIn(six, 5).x).toBeCloseTo(cardIn(six, 2).x, 5);
  });
});

describe('menuLayout (fidelity lock at current counts)', () => {
  it('keeps the portrait stack exactly as shipped for three packs', () => {
    expect(menuLayout(FIELD_WIDTH, FIELD_HEIGHT, capacityIds(3)).cards).toEqual([
      { height: 150, packId: 'pack-0', width: 300, x: 65, y: 175 },
      { height: 150, packId: 'pack-1', width: 300, x: 65, y: 355 },
      { height: 150, packId: 'pack-2', width: 300, x: 65, y: 535 },
    ]);
  });

  it('keeps the portrait stack exactly as shipped with the name card', () => {
    expect(menuLayout(FIELD_WIDTH, FIELD_HEIGHT, capacityIds(4)).cards).toEqual([
      { height: 150, packId: 'pack-0', width: 300, x: 65, y: 85 },
      { height: 150, packId: 'pack-1', width: 300, x: 65, y: 265 },
      { height: 150, packId: 'pack-2', width: 300, x: 65, y: 445 },
      { height: 150, packId: 'pack-3', width: 300, x: 65, y: 625 },
    ]);
  });

  it('keeps the landscape row exactly as shipped for three packs', () => {
    const cards = menuLayout(860, 430, capacityIds(3)).cards;
    expect(cards.map((card) => card.y)).toEqual([140, 140, 140]);
    expect(cardIn(cards, 0).width).toBeCloseTo(223.33333333333334, 5);
    expect(cardIn(cards, 0).x).toBeCloseTo(65, 5);
    expect(cardIn(cards, 1).x).toBeCloseTo(318.33333333333337, 5);
    expect(cardIn(cards, 2).x).toBeCloseTo(571.6666666666667, 5);
  });

  it('keeps the landscape 2x2 wrap exactly as shipped with the name card', () => {
    expect(menuLayout(860, 430, capacityIds(4)).cards).toEqual([
      { height: 150, packId: 'pack-0', width: 350, x: 65, y: 50 },
      { height: 150, packId: 'pack-1', width: 350, x: 445, y: 50 },
      { height: 150, packId: 'pack-2', width: 350, x: 65, y: 230 },
      { height: 150, packId: 'pack-3', width: 350, x: 445, y: 230 },
    ]);
  });
});

describe('menuLayout (beyond capacity degrades gracefully)', () => {
  for (const field of CAPACITY_FIELDS) {
    describe(field.label, () => {
      it.each([7, 8, 9, 10])(
        'keeps %i cards inside the field at floor-friendly sizes, separated, and tappable',
        (count) => {
          expectUsableLayout(field, count);
        },
      );
    });
  }
});
