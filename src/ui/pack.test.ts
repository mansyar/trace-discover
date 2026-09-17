import { describe, expect, it } from 'vitest';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import {
  completeLevel,
  createDefaultSave,
  loadSave,
  type SaveStorage,
  saveSave,
} from '../save/store';
import {
  hitPackCard,
  hitPackHome,
  hitPackPager,
  initialPackPage,
  type PackCard,
  type PackLayout,
  packLayout,
  packPagerLayout,
  packParkPosition,
  packStickers,
  paginate,
} from './pack';

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

const PRE_IDS = Array.from({ length: 12 }, (_, index) => `pre-${index + 1}`);

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
    expect(layout().cards.map((card) => card.levelId)).toEqual(NUMERALS);
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
    expect(current.slots.map((slot) => slot.levelId)).toEqual(NUMERALS);
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
    saveSave(storage, completeLevel(createDefaultSave(), 'num-4'));
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

  it('ignores completions from other packs', () => {
    expect(packStickers(completeLevel(createDefaultSave(), 'pre-1'), NUMERALS)).toEqual(
      Array.from({ length: 10 }, () => false),
    );
  });
});

describe('packLayout (pre-writing configuration)', () => {
  function preLayout(): PackLayout {
    return packLayout(FIELD_WIDTH, FIELD_HEIGHT, PRE_IDS, { columns: 3, slotsPerRow: 6 });
  }

  it('lays twelve levels out in a 3-column grid', () => {
    const current = preLayout();
    expect(current.cards.map((card) => card.levelId)).toEqual(PRE_IDS);
    const rows = new Set(current.cards.map((card) => card.y));
    expect(rows.size).toBe(4);
    expect(cardAt(current, 0).y).toBe(cardAt(current, 1).y);
    expect(cardAt(current, 1).y).toBe(cardAt(current, 2).y);
    expect(cardAt(current, 0).x).not.toBe(cardAt(current, 1).x);
    expect(cardAt(current, 1).x).not.toBe(cardAt(current, 2).x);
  });

  it('keeps every card at toddler size, inside the field, and un-overlapped', () => {
    const current = preLayout();
    for (const card of current.cards) {
      expect(card.width).toBeGreaterThanOrEqual(90);
      expect(card.height).toBeGreaterThanOrEqual(90);
      expect(card.x).toBeGreaterThanOrEqual(0);
      expect(card.y).toBeGreaterThanOrEqual(0);
      expect(card.x + card.width).toBeLessThanOrEqual(FIELD_WIDTH);
      expect(card.y + card.height).toBeLessThanOrEqual(FIELD_HEIGHT);
    }
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

  it('gives twelve slots in two rows of six below the grid', () => {
    const current = preLayout();
    expect(current.slots.map((slot) => slot.levelId)).toEqual(PRE_IDS);
    const slotRows = new Set(current.slots.map((slot) => slot.y));
    expect(slotRows.size).toBe(2);
    const gridBottom = Math.max(...current.cards.map((card) => card.y + card.height));
    for (const slot of current.slots) {
      expect(slot.y - slot.radius).toBeGreaterThanOrEqual(gridBottom);
      expect(slot.x - slot.radius).toBeGreaterThanOrEqual(0);
      expect(slot.x + slot.radius).toBeLessThanOrEqual(FIELD_WIDTH);
      expect(slot.y + slot.radius).toBeLessThanOrEqual(current.home.y - current.home.radius);
    }
  });
});

const LETTER_IDS = Array.from(
  { length: 26 },
  (_, index) => `abc-${'abcdefghijklmnopqrstuvwxyz'.charAt(index)}`,
);
const LETTER_PAGES: readonly number[] = [12, 14];

function lettersPage(page: number): PackLayout {
  const pages = paginate(LETTER_IDS, LETTER_PAGES);
  return packLayout(FIELD_WIDTH, FIELD_HEIGHT, pages[page] ?? [], {
    cardSize: 90,
    columns: 4,
    slotsPerRow: 7,
  });
}

function clearOfCircle(rect: PackCard, circle: { x: number; y: number; radius: number }): boolean {
  const nearestX = Math.min(Math.max(circle.x, rect.x), rect.x + rect.width);
  const nearestY = Math.min(Math.max(circle.y, rect.y), rect.y + rect.height);
  return Math.hypot(circle.x - nearestX, circle.y - nearestY) >= circle.radius;
}

describe('paginate', () => {
  it('splits level ids by page size', () => {
    expect(paginate(['a', 'b', 'c'], [2, 1])).toEqual([['a', 'b'], ['c']]);
  });

  it('rejects page sizes that do not cover every level', () => {
    expect(() => paginate(['a', 'b', 'c'], [2])).toThrow();
  });
});

describe('initialPackPage', () => {
  it("opens on the first unfinished letter's page", () => {
    expect(initialPackPage(LETTER_IDS, [], LETTER_PAGES)).toBe(0);
    expect(initialPackPage(LETTER_IDS, LETTER_IDS.slice(0, 12), LETTER_PAGES)).toBe(1);
    expect(initialPackPage(LETTER_IDS, LETTER_IDS.slice(0, 13), LETTER_PAGES)).toBe(1);
  });

  it('uses the last page when everything is done and page 0 for one-page packs', () => {
    expect(initialPackPage(LETTER_IDS, LETTER_IDS, LETTER_PAGES)).toBe(1);
    expect(initialPackPage(['a', 'b'], [], [2])).toBe(0);
    expect(initialPackPage(['a', 'b'], ['a', 'b'], [2])).toBe(0);
  });
});

describe('packLayout (letters two-page configuration)', () => {
  it('splits the alphabet into A–L and M–Z pages', () => {
    const pages = paginate(LETTER_IDS, LETTER_PAGES);
    expect(pages[0]).toEqual(LETTER_IDS.slice(0, 12));
    expect(pages[1]).toEqual(LETTER_IDS.slice(12));
  });

  it('lays page one out in three rows of four at 90 px', () => {
    const current = lettersPage(0);
    expect(current.cards.map((card) => card.levelId)).toEqual(LETTER_IDS.slice(0, 12));
    expect(new Set(current.cards.map((card) => card.y)).size).toBe(3);
    for (const card of current.cards) {
      expect(card.width).toBe(90);
      expect(card.height).toBe(90);
      expect(card.x).toBeGreaterThanOrEqual(0);
      expect(card.x + card.width).toBeLessThanOrEqual(FIELD_WIDTH);
      expect(clearOfCircle(card, current.home)).toBe(true);
      expect(clearOfCircle(card, current.badge)).toBe(true);
    }
  });

  it('ends page two with the centered Y–Z finale pair', () => {
    const current = lettersPage(1);
    expect(current.cards.map((card) => card.levelId)).toEqual(LETTER_IDS.slice(12));
    const lastRowY = Math.max(...current.cards.map((card) => card.y));
    const finale = current.cards.filter((card) => card.y === lastRowY);
    expect(finale.map((card) => card.levelId)).toEqual(['abc-y', 'abc-z']);
    const [first, second] = finale;
    if (!first || !second) {
      throw new Error('missing finale cards');
    }
    expect((first.x + second.x + second.width) / 2).toBeCloseTo(FIELD_WIDTH / 2, 5);
  });

  it('keeps every card ≥90 px, un-overlapped and clear of the home + badge spots', () => {
    for (const page of [0, 1]) {
      const current = lettersPage(page);
      for (const card of current.cards) {
        expect(card.width).toBeGreaterThanOrEqual(90);
        expect(card.height).toBeGreaterThanOrEqual(90);
        expect(card.y + card.height).toBeLessThanOrEqual(FIELD_HEIGHT);
        expect(clearOfCircle(card, current.home)).toBe(true);
        expect(clearOfCircle(card, current.badge)).toBe(true);
      }
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
    }
  });

  it('gives each page its own sticker shelf below the grid', () => {
    const pageOne = lettersPage(0);
    expect(pageOne.slots.map((slot) => slot.levelId)).toEqual(LETTER_IDS.slice(0, 12));
    const pageTwo = lettersPage(1);
    expect(pageTwo.slots.map((slot) => slot.levelId)).toEqual(LETTER_IDS.slice(12));
    const gridBottom = Math.max(...pageTwo.cards.map((card) => card.y + card.height));
    for (const slot of pageTwo.slots) {
      expect(slot.y - slot.radius).toBeGreaterThanOrEqual(gridBottom);
      expect(slot.y + slot.radius).toBeLessThanOrEqual(pageTwo.home.y - pageTwo.home.radius);
      expect(slot.x - slot.radius).toBeGreaterThanOrEqual(0);
      expect(slot.x + slot.radius).toBeLessThanOrEqual(FIELD_WIDTH);
    }
  });

  it('centers a partial row of cards', () => {
    const current = packLayout(FIELD_WIDTH, FIELD_HEIGHT, ['a', 'b', 'c', 'd', 'e'], {
      columns: 4,
    });
    const lastRowY = Math.max(...current.cards.map((card) => card.y));
    const lastRow = current.cards.filter((card) => card.y === lastRowY);
    expect(lastRow).toHaveLength(1);
    const only = lastRow[0];
    if (!only) {
      throw new Error('missing card');
    }
    expect(only.x + only.width / 2).toBeCloseTo(FIELD_WIDTH / 2, 5);
  });
});

describe('packPagerLayout', () => {
  it('fixes a toddler-sized prev/next pair bottom-right and squares the dots', () => {
    const pager = packPagerLayout(FIELD_WIDTH, FIELD_HEIGHT, 2);
    expect(pager.next.radius * 2).toBeGreaterThanOrEqual(90);
    expect(pager.next.x + pager.next.radius).toBeLessThanOrEqual(FIELD_WIDTH);
    expect(pager.next.y + pager.next.radius).toBeLessThanOrEqual(FIELD_HEIGHT);
    expect(pager.prev.x).toBeLessThan(pager.next.x);
    expect(pager.dots).toHaveLength(2);
    const [first, second] = pager.dots;
    if (!first || !second) {
      throw new Error('missing dots');
    }
    expect(first.x).toBeLessThan(second.x);
    expect(first.x - first.radius).toBeGreaterThan(0);
    expect(second.x + second.radius).toBeLessThan(pager.prev.x - pager.prev.radius);
  });
});

describe('hitPackPager', () => {
  it('only offers the direction that exists', () => {
    const pager = packPagerLayout(FIELD_WIDTH, FIELD_HEIGHT, 2);
    expect(hitPackPager(pager, { x: pager.next.x, y: pager.next.y }, 0)).toBe('next');
    expect(hitPackPager(pager, { x: pager.prev.x, y: pager.prev.y }, 0)).toBeNull();
    expect(hitPackPager(pager, { x: pager.next.x, y: pager.next.y }, 1)).toBeNull();
    expect(hitPackPager(pager, { x: pager.prev.x, y: pager.prev.y }, 1)).toBe('prev');
    expect(hitPackPager(pager, { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT / 2 }, 0)).toBeNull();
  });
});

describe('packLayout (name mini-pack configuration)', () => {
  it('centers the single level card and its solo sticker slot', () => {
    const nameLayout = packLayout(FIELD_WIDTH, FIELD_HEIGHT, ['name-1']);
    const card = nameLayout.cards[0];
    if (!card) {
      throw new Error('missing name card');
    }
    expect(card.levelId).toBe('name-1');
    expect(Math.abs(card.x + card.width / 2 - FIELD_WIDTH / 2)).toBeLessThan(2);
    expect(card.width).toBeGreaterThanOrEqual(90);
    expect(nameLayout.slots).toHaveLength(1);
    expect(nameLayout.slots[0]?.levelId).toBe('name-1');
    const solo = packLayout(FIELD_WIDTH, FIELD_HEIGHT, ['name-1'], { slotsPerRow: 1 }).slots[0];
    if (!solo) {
      throw new Error('missing solo slot');
    }
    expect(Math.abs(solo.x - FIELD_WIDTH / 2)).toBeLessThan(2);
  });

  it('lights the solo sticker once the name level completes', () => {
    const storage = createMemoryStorage();
    saveSave(storage, completeLevel(createDefaultSave(), 'name-1'));
    expect(packStickers(loadSave(storage), ['name-1'])).toEqual([true]);
  });
});

describe('packParkPosition', () => {
  it('parks the mascot between grid and shelf in portrait (unchanged)', () => {
    expect(packParkPosition(FIELD_WIDTH, FIELD_HEIGHT)).toEqual({ x: 215, y: 572 });
  });

  it('parks the mascot in the right band beside the landscape grid', () => {
    const park = packParkPosition(860, 430);
    expect(park).toEqual({ x: 805, y: 215 });
  });
});

describe('packLayout (landscape)', () => {
  const W = 860;
  const H = 430;

  it('runs the numbers grid in two rows with the shelf below', () => {
    const current = packLayout(W, H, NUMERALS, { columns: 5, slotsPerRow: 5 });
    const first = cardAt(current, 0);
    const sixth = cardAt(current, 5);
    expect(sixth.y - first.y).toBe(96 + 14);
    for (const card of current.cards) {
      expect(card.x).toBeGreaterThanOrEqual(0);
      expect(card.y + card.height).toBeLessThanOrEqual(334); // above the shelf band
    }
    for (const slot of current.slots) {
      expect(slot.y + slot.radius).toBeLessThanOrEqual(H);
    }
    const slotFirst = current.slots[0];
    const slotLast = current.slots[4];
    if (!slotFirst || !slotLast) {
      throw new Error('missing landscape slots');
    }
    expect(slotFirst.y).toBe(334);
    // the slot row shares the grid's center line
    expect((slotFirst.x + slotLast.x) / 2).toBeCloseTo(
      (first.x + first.width / 2 + (cardAt(current, 4).x + cardAt(current, 4).width / 2)) / 2,
      5,
    );
  });

  it('fits the densest letters page (14 cards, 7 columns) above the shelf and left of the mascot', () => {
    const ids = Array.from({ length: 14 }, (_, index) => `abc-${index}`);
    const current = packLayout(W, H, ids, { cardSize: 90, columns: 7, slotsPerRow: 7 });
    const first = cardAt(current, 0);
    const eighth = cardAt(current, 7);
    expect(first.y).toBe(118);
    expect(eighth.y - first.y).toBe(90 + 14);
    for (const card of current.cards) {
      expect(card.x).toBeGreaterThanOrEqual(0);
      expect(card.x + card.width).toBeLessThanOrEqual(749); // mascot band stays clear
      expect(card.y + card.height).toBeLessThanOrEqual(334);
    }
    const firstSlotY = current.slots[0]?.y ?? 0;
    const lastSlotRow = current.slots.filter((slot) => slot.y === firstSlotY + 44);
    expect(lastSlotRow.length).toBe(7);
    for (const slot of current.slots) {
      expect(slot.y + slot.radius).toBeLessThanOrEqual(H);
    }
  });
});
