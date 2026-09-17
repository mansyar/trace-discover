// Pack screen layout math (pure; canvas rendering defers to shell wiring).
// Content pack cards in a toddler-sized grid (columns/card size configurable
// per pack, partial rows centered), a sticker shelf below, and the pack badge
// spot on top. Dense packs paginate (paginate/initialPackPage) with a fixed
// prev/next pager. Sticker state reads straight from the save via hasSticker:
// a cleared level shows its sticker.
import type { Point } from '../engine/types';
import { hasSticker, type SaveData } from '../save/store';

export interface PackCard {
  readonly height: number;
  readonly levelId: string;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

export interface PackSlot {
  readonly levelId: string;
  readonly radius: number;
  readonly x: number;
  readonly y: number;
}

export interface PackBadgeSpot {
  readonly radius: number;
  readonly x: number;
  readonly y: number;
}

export interface PackHome {
  readonly radius: number;
  readonly x: number;
  readonly y: number;
}

export interface PackLayout {
  readonly badge: PackBadgeSpot;
  readonly cards: readonly PackCard[];
  readonly home: PackHome;
  readonly slots: readonly PackSlot[];
}

export interface PackLayoutOptions {
  /** Card edge length in field units (default 96). */
  readonly cardSize?: number;
  readonly columns?: number;
  readonly slotsPerRow?: number;
}

const BADGE_RADIUS = 44;
const BADGE_Y = 72;
const CARD_GAP = 14;
const CARD_SIZE = 96;
const DEFAULT_COLUMNS = 2;
const GRID_TOP = 128;
const GRID_TOP_LANDSCAPE = 118;
const GRID_CENTER_OFFSET_LANDSCAPE = 60;
const HOME_MARGIN = 56;
const HOME_RADIUS = 45;
const SLOT_GAP = 16;
const SLOT_RADIUS = 20;
const SLOT_ROW_GAP = 4;
const SLOT_TOP = 692;
const SLOT_BOTTOM_OFFSET_LANDSCAPE = 96;
const DEFAULT_SLOTS_PER_ROW = 5;
const PAGER_RADIUS = 45;
const PAGER_GAP = 10;
const DOT_RADIUS = 10;
const DOT_GAP = 34;
const PACK_PARK_BOTTOM_OFFSET_PORTRAIT = 288;
const PACK_PARK_RIGHT_OFFSET_LANDSCAPE = 55;

export function packLayout(
  fieldWidth: number,
  fieldHeight: number,
  levelIds: readonly string[],
  options: PackLayoutOptions = {},
): PackLayout {
  const cardSize = options.cardSize ?? CARD_SIZE;
  const columns = options.columns ?? DEFAULT_COLUMNS;
  const slotsPerRow = options.slotsPerRow ?? DEFAULT_SLOTS_PER_ROW;
  const landscape = fieldWidth > fieldHeight;
  const gridTop = landscape ? GRID_TOP_LANDSCAPE : GRID_TOP;
  const slotTop = landscape ? fieldHeight - SLOT_BOTTOM_OFFSET_LANDSCAPE : SLOT_TOP;
  // Landscape shifts the grid left of centre, keeping the mascot band clear.
  const centerX = landscape ? fieldWidth / 2 - GRID_CENTER_OFFSET_LANDSCAPE : fieldWidth / 2;
  const cards = levelIds.map((levelId, index): PackCard => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const rowCount = Math.min(columns, levelIds.length - row * columns);
    const rowWidth = rowCount * cardSize + (rowCount - 1) * CARD_GAP;
    const rowStartX = centerX - rowWidth / 2;
    return {
      height: cardSize,
      levelId,
      width: cardSize,
      x: rowStartX + column * (cardSize + CARD_GAP),
      y: gridTop + row * (cardSize + CARD_GAP),
    };
  });
  const slotRowWidth = slotsPerRow * SLOT_RADIUS * 2 + (slotsPerRow - 1) * SLOT_GAP;
  const slotStartX = centerX - slotRowWidth / 2;
  const slots = levelIds.map(
    (levelId, index): PackSlot => ({
      levelId,
      radius: SLOT_RADIUS,
      x: slotStartX + SLOT_RADIUS + (index % slotsPerRow) * (SLOT_RADIUS * 2 + SLOT_GAP),
      y: slotTop + Math.floor(index / slotsPerRow) * (SLOT_RADIUS * 2 + SLOT_ROW_GAP),
    }),
  );
  return {
    badge: { radius: BADGE_RADIUS, x: fieldWidth / 2, y: BADGE_Y },
    cards,
    home: { radius: HOME_RADIUS, x: HOME_MARGIN, y: fieldHeight - HOME_MARGIN },
    slots,
  };
}

export function hitPackCard(layout: PackLayout, point: Point): string | null {
  const card = layout.cards.find(
    (entry) =>
      point.x >= entry.x &&
      point.x <= entry.x + entry.width &&
      point.y >= entry.y &&
      point.y <= entry.y + entry.height,
  );
  return card === undefined ? null : card.levelId;
}

/** True when the point lands on the home corner button. */
export function hitPackHome(layout: PackLayout, point: Point): boolean {
  return Math.hypot(point.x - layout.home.x, point.y - layout.home.y) <= layout.home.radius;
}

export function packStickers(save: SaveData, levelIds: readonly string[]): readonly boolean[] {
  return levelIds.map((levelId) => hasSticker(save, levelId));
}

/** Splits level ids into pages by count ([12, 14] → 12 then 14, A–L / M–Z). */
export function paginate(
  levelIds: readonly string[],
  pageSizes: readonly number[],
): readonly (readonly string[])[] {
  const total = pageSizes.reduce((sum, size) => sum + size, 0);
  if (total !== levelIds.length) {
    throw new Error(`page sizes must cover every level (${total} of ${levelIds.length})`);
  }
  const pages: string[][] = [];
  let offset = 0;
  for (const size of pageSizes) {
    pages.push(levelIds.slice(offset, offset + size));
    offset += size;
  }
  return pages;
}

/** 0-based page holding the first unfinished level (or the last page when all are done). */
export function initialPackPage(
  levelIds: readonly string[],
  completedLevels: readonly string[],
  pageSizes: readonly number[],
): number {
  const done = new Set(completedLevels);
  let index = 0;
  for (const [page, size] of pageSizes.entries()) {
    const end = index + size;
    for (; index < end; index += 1) {
      const id = levelIds[index];
      if (id !== undefined && !done.has(id)) {
        return page;
      }
    }
  }
  return Math.max(0, pageSizes.length - 1);
}

export interface PackPagerSpot {
  readonly radius: number;
  readonly x: number;
  readonly y: number;
}

export interface PackPager {
  readonly dots: readonly PackPagerSpot[];
  readonly next: PackPagerSpot;
  readonly prev: PackPagerSpot;
}

/** Fixed pager row: prev/next circles bottom-right (home stays bottom-left);
 *  page dots ride between the home corner and prev. Positions never move so
 *  toddlers can learn them. */
export function packPagerLayout(
  fieldWidth: number,
  fieldHeight: number,
  pageCount: number,
): PackPager {
  const y = fieldHeight - HOME_MARGIN;
  const next: PackPagerSpot = { radius: PAGER_RADIUS, x: fieldWidth - HOME_MARGIN, y };
  const prev: PackPagerSpot = {
    radius: PAGER_RADIUS,
    x: next.x - PAGER_RADIUS * 2 - PAGER_GAP,
    y,
  };
  const homeEdge = HOME_MARGIN + HOME_RADIUS;
  const prevEdge = prev.x - PAGER_RADIUS;
  const dots = Array.from(
    { length: pageCount },
    (_, index): PackPagerSpot => ({
      radius: DOT_RADIUS,
      x: (homeEdge + prevEdge) / 2 + (index - (pageCount - 1) / 2) * DOT_GAP,
      y,
    }),
  );
  return { dots, next, prev };
}

/** Pager tap: next when more pages remain, prev after the first page; null otherwise. */
export function hitPackPager(pager: PackPager, point: Point, page: number): 'next' | 'prev' | null {
  if (page < pager.dots.length - 1 && inSpot(pager.next, point)) {
    return 'next';
  }
  if (page > 0 && inSpot(pager.prev, point)) {
    return 'prev';
  }
  return null;
}

function inSpot(spot: PackPagerSpot, point: Point): boolean {
  return Math.hypot(point.x - spot.x, point.y - spot.y) <= spot.radius;
}

/** Mascot park: between grid and shelf in portrait; beside the grid in the wide field. */
export function packParkPosition(fieldWidth: number, fieldHeight: number): Point {
  if (fieldWidth > fieldHeight) {
    return { x: fieldWidth - PACK_PARK_RIGHT_OFFSET_LANDSCAPE, y: fieldHeight / 2 };
  }
  return { x: fieldWidth / 2, y: fieldHeight - PACK_PARK_BOTTOM_OFFSET_PORTRAIT };
}
