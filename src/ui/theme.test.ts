import { describe, expect, it } from 'vitest';
import { FIELD_WIDTH } from '../field';
import {
  completeLevel,
  createDefaultSave,
  loadSave,
  type SaveStorage,
  saveSave,
} from '../save/store';
import { hitThemeCard, type ThemeLayout, themeLayout, themeStickers } from './theme';

const LEVELS = ['dino-1', 'dino-2', 'dino-3', 'dino-4'];

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

function layout(): ThemeLayout {
  return themeLayout(FIELD_WIDTH, LEVELS);
}

function cardAt(current: ThemeLayout, index: number) {
  const card = current.cards[index];
  if (card === undefined) {
    throw new Error(`missing card ${index}`);
  }
  return card;
}

describe('themeLayout', () => {
  it('returns one card per level id in order', () => {
    expect(layout().cards.map((card) => card.levelId)).toEqual(LEVELS);
  });

  it('keeps every card at toddler size and inside the field', () => {
    for (const card of layout().cards) {
      expect(card.width).toBeGreaterThanOrEqual(90);
      expect(card.height).toBeGreaterThanOrEqual(90);
      expect(card.x).toBeGreaterThanOrEqual(0);
      expect(card.y).toBeGreaterThanOrEqual(0);
      expect(card.x + card.width).toBeLessThanOrEqual(FIELD_WIDTH);
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

  it('gives every level a sticker slot inside the field', () => {
    const current = layout();
    expect(current.slots.map((slot) => slot.levelId)).toEqual(LEVELS);
    for (const slot of current.slots) {
      expect(slot.radius).toBeGreaterThan(0);
      expect(slot.x - slot.radius).toBeGreaterThanOrEqual(0);
      expect(slot.x + slot.radius).toBeLessThanOrEqual(FIELD_WIDTH);
      expect(slot.y - slot.radius).toBeGreaterThanOrEqual(0);
    }
  });

  it('keeps the badge spot inside the field', () => {
    const badge = layout().badge;
    expect(badge.radius).toBeGreaterThan(0);
    expect(badge.x - badge.radius).toBeGreaterThanOrEqual(0);
    expect(badge.x + badge.radius).toBeLessThanOrEqual(FIELD_WIDTH);
    expect(badge.y - badge.radius).toBeGreaterThanOrEqual(0);
  });
});

describe('hitThemeCard', () => {
  it('hits each card center with its level id and misses outside', () => {
    const current = layout();
    current.cards.forEach((card, index) => {
      expect(
        hitThemeCard(current, { x: card.x + card.width / 2, y: card.y + card.height / 2 }),
      ).toBe(LEVELS[index]);
    });
    expect(hitThemeCard(current, { x: FIELD_WIDTH / 2, y: 5 })).toBeNull();
  });
});

describe('themeStickers', () => {
  it('shows no stickers on a fresh save', () => {
    expect(themeStickers(createDefaultSave(), LEVELS)).toEqual([false, false, false, false]);
  });

  it('lights the sticker when its level completes, surviving save and load', () => {
    const storage = createMemoryStorage();
    saveSave(storage, completeLevel(createDefaultSave(), 'dino-2'));
    expect(themeStickers(loadSave(storage), LEVELS)).toEqual([false, true, false, false]);
  });
});
