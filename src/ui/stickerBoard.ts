// Sticker board layout math (pure; canvas rendering defers to shell wiring).
// The board is a per-pack album: every level of the pack gets one cell (earned
// filled, unearned ghosted via packStickers), laid out as a single-screen grid
// of toddler-sized circles. Cells use the full 96-unit sticker size when the
// count allows and shrink to the densest fit for the 29-letter board. Also
// owns the pack-screen shelf band hit test: the shelf area opens the board,
// while the home corner and the pager corner keep precedence.
import type { Point } from '../engine/types';
import type { PackHome, PackLayout, PackPager } from './pack';

export interface StickerCell {
  readonly levelId: string;
  readonly radius: number;
  readonly x: number;
  readonly y: number;
}

export interface StickerBoardLayout {
  readonly cells: readonly StickerCell[];
  readonly home: PackHome;
}

const BOARD_TOP = 96;
const BOARD_BOTTOM_MARGIN = 116;
const CELL_GAP = 14;
const MAX_CELL_RADIUS = 48;
const HOME_MARGIN = 56;
const HOME_RADIUS = 45;
const SHELF_BAND_PAD = 24;
const SHELF_BAND_CONTROL_PAD = 12;

export function stickerBoardLayout(
  fieldWidth: number,
  fieldHeight: number,
  levelIds: readonly string[],
): StickerBoardLayout {
  const home: PackHome = {
    radius: HOME_RADIUS,
    x: HOME_MARGIN,
    y: fieldHeight - HOME_MARGIN,
  };
  if (levelIds.length === 0) {
    return { cells: [], home };
  }
  const grid = fitGrid(fieldWidth, fieldHeight, levelIds.length);
  const rowCount = Math.ceil(levelIds.length / grid.columns);
  const boxHeight = rowCount * grid.radius * 2 + (rowCount - 1) * CELL_GAP;
  const availableHeight = fieldHeight - BOARD_BOTTOM_MARGIN - BOARD_TOP;
  const gridTop = BOARD_TOP + (availableHeight - boxHeight) / 2;
  const cells = levelIds.map((levelId, index): StickerCell => {
    const row = Math.floor(index / grid.columns);
    const column = index % grid.columns;
    const rowSize = Math.min(grid.columns, levelIds.length - row * grid.columns);
    const rowWidth = rowSize * grid.radius * 2 + (rowSize - 1) * CELL_GAP;
    const rowStartX = (fieldWidth - rowWidth) / 2;
    return {
      levelId,
      radius: grid.radius,
      x: rowStartX + grid.radius + column * (grid.radius * 2 + CELL_GAP),
      y: gridTop + grid.radius + row * (grid.radius * 2 + CELL_GAP),
    };
  });
  return { cells, home };
}

interface GridFit {
  readonly columns: number;
  readonly radius: number;
  readonly rows: number;
}

/** Largest uniform cell radius that fits the count, widening to more columns
 *  only when it actually buys size; ties prefer exact-fit rows, then fewer
 *  rows, then fewer columns. */
function fitGrid(fieldWidth: number, fieldHeight: number, count: number): GridFit {
  const availableHeight = fieldHeight - BOARD_BOTTOM_MARGIN - BOARD_TOP;
  let best: GridFit | null = null;
  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    const radius = Math.min(
      MAX_CELL_RADIUS,
      (fieldWidth - (columns - 1) * CELL_GAP) / (columns * 2),
      (availableHeight - (rows - 1) * CELL_GAP) / (rows * 2),
    );
    if (radius <= 0) {
      continue;
    }
    const candidate: GridFit = { columns, radius, rows };
    if (best === null || isBetterFit(candidate, best, count)) {
      best = candidate;
    }
  }
  if (best === null) {
    throw new Error(`cannot fit a board for ${count} stickers`);
  }
  return best;
}

function isBetterFit(candidate: GridFit, current: GridFit, count: number): boolean {
  if (Math.abs(candidate.radius - current.radius) > 1e-9) {
    return candidate.radius > current.radius;
  }
  const candidateExact = candidate.rows * candidate.columns === count;
  const currentExact = current.rows * current.columns === count;
  if (candidateExact !== currentExact) {
    return candidateExact;
  }
  if (candidate.rows !== current.rows) {
    return candidate.rows < current.rows;
  }
  return candidate.columns < current.columns;
}

/** Cell center hit test: the level id under the point, else null. */
export function hitStickerCell(layout: StickerBoardLayout, point: Point): string | null {
  const cell = layout.cells.find(
    (entry) => Math.hypot(point.x - entry.x, point.y - entry.y) <= entry.radius,
  );
  return cell === undefined ? null : cell.levelId;
}

/** True when the point lands on the board's home corner button. */
export function hitBoardHome(layout: StickerBoardLayout, point: Point): boolean {
  return Math.hypot(point.x - layout.home.x, point.y - layout.home.y) <= layout.home.radius;
}

/** Pack-screen shelf band: tapping the sticker shelf opens the board. The
 *  band starts just above the shelf's first row and keeps clear of the home
 *  and pager corner controls so they always win. */
export function hitShelfBand(layout: PackLayout, pager: PackPager, point: Point): boolean {
  const firstSlot = layout.slots[0];
  if (firstSlot === undefined) {
    return false;
  }
  const bandTop = firstSlot.y - firstSlot.radius - SHELF_BAND_PAD;
  if (point.y < bandTop) {
    return false;
  }
  return (
    clearOfSpot(layout.home, point) &&
    clearOfSpot(pager.next, point) &&
    clearOfSpot(pager.prev, point)
  );
}

function clearOfSpot(spot: { x: number; y: number; radius: number }, point: Point): boolean {
  return Math.hypot(point.x - spot.x, point.y - spot.y) > spot.radius + SHELF_BAND_CONTROL_PAD;
}
