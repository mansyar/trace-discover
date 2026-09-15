import { describe, expect, it } from 'vitest';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import {
  completeLevel,
  completeNumeral,
  createDefaultSave,
  loadSave,
  type SaveStorage,
  saveSave,
} from '../save/store';
import { hitPackCard, hitPackHome, type PackLayout, packLayout, packStickers } from './pack';

const NUMERALS = [
  'num-0',
  'num-1',
  'num-2',
  'num-3',
  'num-4',
  'num-5',
  'num-6',
  'num-7',
  'num-8',
  'num-9',
];

function createMemoryStorage(initial: Record<string, string> = {}): SaveStorage {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    getItem(key: string): string | null {
      const value = data.get(key);
      return value === undefined ? null : value;
    },
    setItem(key: string, value: string): void {
      data.set(key, value);
    },
  };
}

function layout(): PackLayout {
  return packLayout(FIELD_WIDTH, FIELD_HEIGHT, NUMERALS);
}

function cardAt(current: PackLayout, index: number) {
  const card = current.cards[index];
  if (card === undefined) {
    throw new Error(`missing card ${index}`);
  }
  return card;
}

describe('packLayout', () => {
  it('returns one card per numeral id in order', () => {
    expect(layout().cards.map((card) => card.numeralId)).toEqual(NUMERALS);
  });

  it('lays the ten numerals out in a 2-column grid', () => {
    const current = layout();
    expect(cardAt(current, 0).y).toBe(cardAt(current, 1).y);
    expect(cardAt(current, 0).x).not.toBe(cardAt(current, 1).x);
    const rows = new Set(current.cards.map((card) => card.y));
    expect(rows.size).toBe(5);
  });

  it('keeps every card at toddler size and inside the field', () => {
    for (const card of layout().cards) {
      expect(card.width).toBeGreaterThanOrEqual(90);
      expect(card.height).toBeGreaterThanOrEqual(90);
      expect(card.x).toBeGreaterThanOrEqual(0);
      expect(card.y).toBeGreaterThanOrEqual(0);
      expect(card.x + card.width).toBeLessThanOrEqual(FIELD_WIDTH);
      expect(card.y + card.height).toBeLessThanOrEqual(FIELD_HEIGHT);
    }
  });

  it('never overlaps two cards', () => {
    const current = layout();
    for (let a = 0; a < current.cards.length; a++) {
      for (let b = a + 1; b < current.cards.length; b++) {
        const first = cardAt(current, a);
        const second = cardAt(current, b);
        const separated =
          first.x + first.width <= second.x ||
          second.x + second.width <= first.x ||
          first.y + first.height <= second.y ||
          second.y + second.height <= first.y;
        expect(separated).toBe(true);
      }
    }
  });

  it('gives every numeral a sticker slot below the grid, inside the field', () => {
    const current = layout();
    expect(current.slots.map((slot) => slot.numeralId)).toEqual(NUMERALS);
    const gridBottom = Math.max(...current.cards.map((card) => card.y + card.height));
    for (const slot of current.slots) {
      expect(slot.radius).toBeGreaterThan(0);
      expect(slot.y - slot.radius).toBeGreaterThanOrEqual(gridBottom);
      expect(slot.x - slot.radius).toBeGreaterThanOrEqual(0);
      expect(slot.x + slot.radius).toBeLessThanOrEqual(FIELD_WIDTH);
    }
  });

  it('keeps the badge spot at the top, clear of the grid', () => {
    const current = layout();
    expect(current.badge.x - current.badge.radius).toBeGreaterThanOrEqual(0);
    expect(current.badge.x + current.badge.radius).toBeLessThanOrEqual(FIELD_WIDTH);
    expect(current.badge.y - current.badge.radius).toBeGreaterThanOrEqual(0);
    const gridTop = Math.min(...current.cards.map((card) => card.y));
    expect(current.badge.y + current.badge.radius).toBeLessThanOrEqual(gridTop);
  });

  it('keeps a toddler-sized home button in the bottom-left corner', () => {
    const home = layout().home;
    expect(home.radius * 2).toBeGreaterThanOrEqual(90);
    expect(home.x - home.radius).toBeGreaterThanOrEqual(0);
    expect(home.y + home.radius).toBeLessThanOrEqual(FIELD_HEIGHT);
  });
});

describe('hitPackCard', () => {
  it('hits each card center with its numeral id and misses outside', () => {
    const current = layout();
    current.cards.forEach((card, index) => {
      expect(
        hitPackCard(current, { x: card.x + card.width / 2, y: card.y + card.height / 2 }),
      ).toBe(NUMERALS[index]);
    });
    expect(hitPackCard(current, { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT - 5 })).toBeNull();
  });
});

describe('hitPackHome', () => {
  it('hits the home button center and misses the field center', () => {
    const current = layout();
    expect(hitPackHome(current, { x: current.home.x, y: current.home.y })).toBe(true);
    expect(hitPackHome(current, { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT / 2 })).toBe(false);
  });
});

describe('packStickers', () => {
  it('shows no stickers on a fresh save', () => {
    expect(packStickers(createDefaultSave(), NUMERALS)).toEqual(
      Array.from({ length: 10 }, () => false),
    );
  });

  it('lights the sticker when its numeral completes, surviving save and load', () => {
    const storage = createMemoryStorage();
    saveSave(storage, completeNumeral(createDefaultSave(), 'num-4'));
    expect(packStickers(loadSave(storage), NUMERALS)).toEqual([
      false,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it('ignores world-level completions', () => {
    expect(packStickers(completeLevel(createDefaultSave(), 'dino-1'), NUMERALS)).toEqual(
      Array.from({ length: 10 }, () => false),
    );
  });
});
