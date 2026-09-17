import { describe, expect, it } from 'vitest';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import { completeLevel, createDefaultSave } from '../save/store';
import { packLayout, packPagerLayout, packStickers } from './pack';
import { hitBoardHome, hitShelfBand, hitStickerCell, stickerBoardLayout } from './stickerBoard';

const PRE_IDS = [
  ...Array.from({ length: 12 }, (_, index) => `pre-${index + 1}`),
  'pre-bonus-1',
  'pre-bonus-2',
  'pre-bonus-3',
];

const NUMERALS = Array.from({ length: 10 }, (_, index) => `num-${index}`);

const LETTER_IDS = [
  ...Array.from({ length: 26 }, (_, index) => `abc-${'abcdefghijklmnopqrstuvwxyz'.charAt(index)}`),
  'abc-bonus-1',
  'abc-bonus-2',
  'abc-bonus-3',
];

const NAME_IDS = ['name-1'];

const BOARDS: readonly (readonly string[])[] = [PRE_IDS, NUMERALS, LETTER_IDS, NAME_IDS];

function board(levelIds: readonly string[]) {
  return stickerBoardLayout(FIELD_WIDTH, FIELD_HEIGHT, levelIds);
}

describe('stickerBoardLayout', () => {
  it('returns one cell per level id in order', () => {
    expect(board(PRE_IDS).cells.map((cell) => cell.levelId)).toEqual(PRE_IDS);
    expect(board(LETTER_IDS).cells.map((cell) => cell.levelId)).toEqual(LETTER_IDS);
    expect(board(NAME_IDS).cells).toHaveLength(1);
  });

  it('prefers an exact-fit grid when the cell size ties', () => {
    // 15 stickers could be 4×4 (partial) at 96 units, but 3×5 is exact.
    const pre = board(PRE_IDS);
    expect(new Set(pre.cells.map((cell) => cell.y)).size).toBe(5);
    // 10 stickers keep the numbers pack's two-per-row rhythm: 2×5 exact.
    const nums = board(NUMERALS);
    expect(new Set(nums.cells.map((cell) => cell.y)).size).toBe(5);
  });

  it('fits every board single-screen inside the field with no overlap', () => {
    for (const levelIds of BOARDS) {
      const { cells } = board(levelIds);
      for (const cell of cells) {
        expect(cell.x - cell.radius).toBeGreaterThanOrEqual(0);
        expect(cell.x + cell.radius).toBeLessThanOrEqual(FIELD_WIDTH);
        expect(cell.y - cell.radius).toBeGreaterThanOrEqual(0);
        expect(cell.y + cell.radius).toBeLessThanOrEqual(FIELD_HEIGHT);
      }
      for (let a = 0; a < cells.length; a += 1) {
        for (let b = a + 1; b < cells.length; b += 1) {
          const first = cells[a];
          const second = cells[b];
          if (!first || !second) {
            throw new Error('missing cell');
          }
          const gap = Math.hypot(first.x - second.x, first.y - second.y);
          expect(gap).toBeGreaterThanOrEqual(first.radius + second.radius);
        }
      }
    }
  });

  it('uses the full 96-unit sticker size when the count allows', () => {
    for (const levelIds of [PRE_IDS, NUMERALS, NAME_IDS]) {
      for (const cell of board(levelIds).cells) {
        expect(cell.radius * 2).toBe(96);
      }
    }
  });

  it('sizes the 29-letter board as a densest single-screen fit', () => {
    const { cells } = board(LETTER_IDS);
    expect(cells).toHaveLength(29);
    const sizes = new Set(cells.map((cell) => cell.radius));
    expect(sizes.size).toBe(1);
    for (const cell of cells) {
      expect(cell.radius * 2).toBeGreaterThanOrEqual(70);
      expect(cell.radius * 2).toBeLessThanOrEqual(80);
    }
  });

  it('centers the final partial row of an uneven grid', () => {
    const { cells } = board(LETTER_IDS);
    const lastY = Math.max(...cells.map((cell) => cell.y));
    const lastRow = cells.filter((cell) => cell.y === lastY);
    expect(lastRow).toHaveLength(4);
    const mean = lastRow.reduce((sum, cell) => sum + cell.x, 0) / lastRow.length;
    expect(mean).toBeCloseTo(FIELD_WIDTH / 2, 5);
  });

  it('keeps a pack-style home button clear of every cell', () => {
    for (const levelIds of BOARDS) {
      const { cells, home } = board(levelIds);
      expect(home.radius * 2).toBeGreaterThanOrEqual(90);
      expect(home.x - home.radius).toBeGreaterThanOrEqual(0);
      expect(home.y + home.radius).toBeLessThanOrEqual(FIELD_HEIGHT);
      expect(home.x).toBeLessThan(FIELD_WIDTH / 2);
      expect(home.y).toBeGreaterThan(FIELD_HEIGHT / 2);
      for (const cell of cells) {
        expect(Math.hypot(cell.x - home.x, cell.y - home.y)).toBeGreaterThanOrEqual(
          cell.radius + home.radius,
        );
      }
    }
  });

  it('returns an empty board for an empty pack', () => {
    const layout = board([]);
    expect(layout.cells).toEqual([]);
    expect(layout.home.radius * 2).toBeGreaterThanOrEqual(90);
  });
});

describe('hitStickerCell', () => {
  it('hits every cell center with its level id', () => {
    const layout = board(LETTER_IDS);
    layout.cells.forEach((cell) => {
      expect(hitStickerCell(layout, { x: cell.x, y: cell.y })).toBe(cell.levelId);
    });
  });

  it('misses above the grid and in the empty field corners', () => {
    const layout = board(PRE_IDS);
    expect(hitStickerCell(layout, { x: FIELD_WIDTH / 2, y: 20 })).toBeNull();
    expect(hitStickerCell(layout, { x: 4, y: 4 })).toBeNull();
  });
});

describe('hitBoardHome', () => {
  it('hits the home button center and misses the field center', () => {
    const layout = board(NUMERALS);
    expect(hitBoardHome(layout, { x: layout.home.x, y: layout.home.y })).toBe(true);
    expect(hitBoardHome(layout, { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT / 2 })).toBe(false);
  });
});

describe('hitShelfBand', () => {
  function preShelf() {
    return packLayout(FIELD_WIDTH, FIELD_HEIGHT, PRE_IDS, { columns: 3, slotsPerRow: 6 });
  }

  it('covers the shelf area of the pack screen, including the slots themselves', () => {
    const layout = preShelf();
    const pager = packPagerLayout(FIELD_WIDTH, FIELD_HEIGHT, 1);
    const firstSlot = layout.slots[0];
    if (!firstSlot) {
      throw new Error('missing slot');
    }
    expect(hitShelfBand(layout, pager, { x: firstSlot.x, y: firstSlot.y })).toBe(true);
    expect(hitShelfBand(layout, pager, { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT - 100 })).toBe(true);
  });

  it('misses above the shelf', () => {
    const layout = preShelf();
    const pager = packPagerLayout(FIELD_WIDTH, FIELD_HEIGHT, 1);
    expect(hitShelfBand(layout, pager, { x: FIELD_WIDTH / 2, y: 600 })).toBe(false);
  });

  it('excludes the home corner and both pager buttons', () => {
    const layout = preShelf();
    const pager = packPagerLayout(FIELD_WIDTH, FIELD_HEIGHT, 2);
    expect(hitShelfBand(layout, pager, { x: layout.home.x, y: layout.home.y })).toBe(false);
    expect(hitShelfBand(layout, pager, { x: pager.next.x, y: pager.next.y })).toBe(false);
    expect(hitShelfBand(layout, pager, { x: pager.prev.x, y: pager.prev.y })).toBe(false);
  });

  it('misses when the pack has no shelf at all', () => {
    const empty = packLayout(FIELD_WIDTH, FIELD_HEIGHT, []);
    const pager = packPagerLayout(FIELD_WIDTH, FIELD_HEIGHT, 1);
    expect(hitShelfBand(empty, pager, { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT - 100 })).toBe(false);
  });
});

describe('board sticker states', () => {
  it('maps board cells to earned and ghost states from the save', () => {
    const save = completeLevel(completeLevel(createDefaultSave(), 'pre-1'), 'pre-bonus-2');
    const { cells } = board(PRE_IDS);
    const states = packStickers(
      save,
      cells.map((cell) => cell.levelId),
    );
    expect(states).toHaveLength(PRE_IDS.length);
    expect(states[0]).toBe(true);
    expect(states[13]).toBe(true);
    expect(states.filter(Boolean)).toHaveLength(2);
  });
});
