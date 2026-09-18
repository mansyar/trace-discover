// Boot splash + main menu layout math (pure; canvas rendering defers to
// shell wiring). Pack cards grow to fit: portrait keeps a full-width stack
// through four cards, then a centered two-column grid; landscape keeps a
// centered row or two-column wrap and grows to three columns. Height and gap
// shrink only past the supported six-card capacity, within toddler floors.
// Both orientations keep the invisible parent-gate corner zone. Beyond the
// six-card capacity the menu paginates: one full page at a time behind the
// same fixed prev/next + dots row the pack screen already teaches.
import type { Point } from '../engine/types';

export interface MenuCard {
  readonly height: number;
  readonly packId: string;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

export interface CornerZone {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

export interface MenuLayout {
  readonly cards: readonly MenuCard[];
  /** Zero-text pager when the menu paginates; null at or below capacity. */
  readonly pager: MenuPager | null;
  readonly parentGate: CornerZone;
}

export interface SplashLayout {
  readonly centerX: number;
  readonly centerY: number;
  readonly emblemRadius: number;
}

const CARD_GAP = 30;
const CARD_HEIGHT = 150;
const GATE_SIZE = 100;
const MIN_CARD_WIDTH = 200;
const SIDE_MARGIN = 65;
const MENU_PARK_BOTTOM_OFFSET_PORTRAIT = 125;
const MENU_PARK_BOTTOM_OFFSET_LANDSCAPE = 130;
/** When the menu paginates, the park lifts so the pager row stays clear of
 *  the mascot's slop zone (the sprite may kiss the page's bottom cards, the
 *  same accepted overlap as the four-pack name card). */
const PAGED_PARK_BOTTOM_OFFSET_PORTRAIT = 160;
const PAGED_PARK_BOTTOM_OFFSET_LANDSCAPE = 150;

/** Shrink floors used only when a layout exceeds the supported capacity. */
const MIN_CARD_HEIGHT = 90;
const MIN_CARD_GAP = 16;
const HEIGHT_SHRINK_STEP = 5;
const GAP_SHRINK_STEP = 2;
/** Widest grids each orientation grows to before any shrinking. */
const TALL_MAX_COLUMNS = 2;
const WIDE_MAX_COLUMNS = 3;

/** Cards the menu lays out at full size in either orientation (the reserved My Name slot included). */
export const MENU_CARD_CAPACITY = 6;

export interface MenuPagerSpot {
  readonly radius: number;
  readonly x: number;
  readonly y: number;
}

export interface MenuPager {
  readonly dots: readonly MenuPagerSpot[];
  readonly next: MenuPagerSpot;
  readonly prev: MenuPagerSpot;
}

const PAGER_RADIUS = 45;
const PAGER_GAP = 10;
const PAGER_DOT_RADIUS = 10;
const PAGER_DOT_GAP = 34;
const PAGER_EDGE_MARGIN = 56;
const PAGER_DOT_LEFT_EDGE = 10;
/** Bottom band the pager row occupies; landscape pages shrink to clear it. */
const PAGER_BAND = 110;

/** Pages a card count spans (the six-card capacity is one full page). */
export function menuPageCount(cardCount: number): number {
  return Math.max(1, Math.ceil(cardCount / MENU_CARD_CAPACITY));
}

/** Fixed pager row for the menu: the pack screen's own spots (ui/pack.ts) so
 *  toddlers learn one position; page dots ride between the field's left edge
 *  and prev. Positions never move. */
export function menuPagerLayout(
  fieldWidth: number,
  fieldHeight: number,
  pageCount: number,
): MenuPager {
  const y = fieldHeight - PAGER_EDGE_MARGIN;
  const next: MenuPagerSpot = { radius: PAGER_RADIUS, x: fieldWidth - PAGER_EDGE_MARGIN, y };
  const prev: MenuPagerSpot = {
    radius: PAGER_RADIUS,
    x: next.x - PAGER_RADIUS * 2 - PAGER_GAP,
    y,
  };
  const prevEdge = prev.x - prev.radius;
  const dots = Array.from(
    { length: pageCount },
    (_, index): MenuPagerSpot => ({
      radius: PAGER_DOT_RADIUS,
      x: (PAGER_DOT_LEFT_EDGE + prevEdge) / 2 + (index - (pageCount - 1) / 2) * PAGER_DOT_GAP,
      y,
    }),
  );
  return { dots, next, prev };
}

/** Pager tap: next when more pages remain, prev after the first page; null otherwise. */
export function hitMenuPager(pager: MenuPager, point: Point, page: number): 'next' | 'prev' | null {
  if (page < pager.dots.length - 1 && inPagerSpot(pager.next, point)) {
    return 'next';
  }
  if (page > 0 && inPagerSpot(pager.prev, point)) {
    return 'prev';
  }
  return null;
}

function inPagerSpot(spot: MenuPagerSpot, point: Point): boolean {
  return Math.hypot(point.x - spot.x, point.y - spot.y) <= spot.radius;
}

export function menuLayout(
  fieldWidth: number,
  fieldHeight: number,
  packIds: readonly string[],
  page = 0,
): MenuLayout {
  const pageCount = menuPageCount(packIds.length);
  const current = Math.min(Math.max(page, 0), pageCount - 1);
  const pageIds =
    pageCount === 1
      ? packIds
      : packIds.slice(current * MENU_CARD_CAPACITY, (current + 1) * MENU_CARD_CAPACITY);
  // Landscape reserves a bottom band for the pager row so six-card pages
  // shrink to clear it; portrait pages end above the row as-is.
  const zoneHeight =
    pageCount > 1 && fieldWidth > fieldHeight ? fieldHeight - PAGER_BAND : fieldHeight;
  const cards =
    fieldWidth > fieldHeight
      ? wideCards(fieldWidth, zoneHeight, pageIds)
      : tallCards(fieldWidth, zoneHeight, pageIds);
  return {
    cards,
    pager: pageCount > 1 ? menuPagerLayout(fieldWidth, fieldHeight, pageCount) : null,
    parentGate: { height: GATE_SIZE, width: GATE_SIZE, x: fieldWidth - GATE_SIZE, y: 0 },
  };
}

interface CardMetrics {
  readonly gap: number;
  readonly height: number;
}

const FULL_METRICS: CardMetrics = { gap: CARD_GAP, height: CARD_HEIGHT };
const FLOOR_METRICS: CardMetrics = { gap: MIN_CARD_GAP, height: MIN_CARD_HEIGHT };

function rowCountFor(columns: number, count: number): number {
  return Math.ceil(count / columns);
}

/** Whether a grid of `columns` columns fits the field height at these metrics. */
function fits(columns: number, count: number, fieldHeight: number, metrics: CardMetrics): boolean {
  const rows = rowCountFor(columns, count);
  return rows * metrics.height + (rows - 1) * metrics.gap <= fieldHeight;
}

/** Largest fitting shrink (tallest first, then widest gap); null when nothing fits to the floors. */
function shrinkMetrics(columns: number, count: number, fieldHeight: number): CardMetrics | null {
  for (let height = CARD_HEIGHT; height >= MIN_CARD_HEIGHT; height -= HEIGHT_SHRINK_STEP) {
    for (let gap = CARD_GAP; gap >= MIN_CARD_GAP; gap -= GAP_SHRINK_STEP) {
      const metrics: CardMetrics = { gap, height };
      if (fits(columns, count, fieldHeight, metrics)) {
        return metrics;
      }
    }
  }
  return null;
}

/** Row-major grid placement: the block centers vertically and each row centers. */
function gridCards(
  fieldWidth: number,
  fieldHeight: number,
  packIds: readonly string[],
  columns: number,
  cardWidth: number,
  metrics: CardMetrics,
): readonly MenuCard[] {
  const count = packIds.length;
  const rows = rowCountFor(columns, count);
  const blockHeight = rows * metrics.height + (rows - 1) * metrics.gap;
  const startY = (fieldHeight - blockHeight) / 2;
  return packIds.map((packId, index): MenuCard => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const rowCards = Math.min(columns, count - row * columns);
    const rowWidth = rowCards * cardWidth + (rowCards - 1) * metrics.gap;
    return {
      height: metrics.height,
      packId,
      width: cardWidth,
      x: (fieldWidth - rowWidth) / 2 + column * (cardWidth + metrics.gap),
      y: startY + row * (metrics.height + metrics.gap),
    };
  });
}

/** Portrait: a full-width stack through four cards; a two-column grid beyond. */
function tallCards(
  fieldWidth: number,
  fieldHeight: number,
  packIds: readonly string[],
): readonly MenuCard[] {
  const count = packIds.length;
  if (count === 0) {
    return [];
  }
  if (fits(1, count, fieldHeight, FULL_METRICS)) {
    const cardWidth = fieldWidth - SIDE_MARGIN * 2;
    return gridCards(fieldWidth, fieldHeight, packIds, 1, cardWidth, FULL_METRICS);
  }
  const metrics = fits(TALL_MAX_COLUMNS, count, fieldHeight, FULL_METRICS)
    ? FULL_METRICS
    : (shrinkMetrics(TALL_MAX_COLUMNS, count, fieldHeight) ?? FLOOR_METRICS);
  const cardWidth =
    (fieldWidth - SIDE_MARGIN * 2 - (TALL_MAX_COLUMNS - 1) * metrics.gap) / TALL_MAX_COLUMNS;
  return gridCards(fieldWidth, fieldHeight, packIds, TALL_MAX_COLUMNS, cardWidth, metrics);
}

/** Landscape: a centered row when cards stay toddler-wide, else a two- or
 *  three-column wrap (row-major, last odd card centered). */
function wideCards(
  fieldWidth: number,
  fieldHeight: number,
  packIds: readonly string[],
): readonly MenuCard[] {
  const count = packIds.length;
  if (count === 0) {
    return [];
  }
  const available = fieldWidth - SIDE_MARGIN * 2;
  const singleRowWidth = (available - (count - 1) * CARD_GAP) / count;
  if (singleRowWidth >= MIN_CARD_WIDTH) {
    return gridCards(fieldWidth, fieldHeight, packIds, count, singleRowWidth, FULL_METRICS);
  }
  if (fits(2, count, fieldHeight, FULL_METRICS)) {
    const cardWidth = (available - CARD_GAP) / 2;
    return gridCards(fieldWidth, fieldHeight, packIds, 2, cardWidth, FULL_METRICS);
  }
  const metrics = fits(WIDE_MAX_COLUMNS, count, fieldHeight, FULL_METRICS)
    ? FULL_METRICS
    : (shrinkMetrics(WIDE_MAX_COLUMNS, count, fieldHeight) ?? FLOOR_METRICS);
  const cardWidth = (available - (WIDE_MAX_COLUMNS - 1) * metrics.gap) / WIDE_MAX_COLUMNS;
  return gridCards(fieldWidth, fieldHeight, packIds, WIDE_MAX_COLUMNS, cardWidth, metrics);
}

/** Mascot park: bottom-center, with room below the card block in either field.
 *  When the menu paginates, the park lifts out of the pager row's band. */
export function menuParkPosition(
  fieldWidth: number,
  fieldHeight: number,
  paginated = false,
): Point {
  const bottomOffset = paginated
    ? fieldWidth > fieldHeight
      ? PAGED_PARK_BOTTOM_OFFSET_LANDSCAPE
      : PAGED_PARK_BOTTOM_OFFSET_PORTRAIT
    : fieldWidth > fieldHeight
      ? MENU_PARK_BOTTOM_OFFSET_LANDSCAPE
      : MENU_PARK_BOTTOM_OFFSET_PORTRAIT;
  return { x: fieldWidth / 2, y: fieldHeight - bottomOffset };
}

export function hitMenuCard(layout: MenuLayout, point: Point): string | null {
  const card = layout.cards.find(
    (entry) =>
      point.x >= entry.x &&
      point.x <= entry.x + entry.width &&
      point.y >= entry.y &&
      point.y <= entry.y + entry.height,
  );
  return card === undefined ? null : card.packId;
}

export function inParentGate(layout: MenuLayout, point: Point): boolean {
  const gate = layout.parentGate;
  return (
    point.x >= gate.x &&
    point.x <= gate.x + gate.width &&
    point.y >= gate.y &&
    point.y <= gate.y + gate.height
  );
}

export function splashLayout(fieldWidth: number, fieldHeight: number): SplashLayout {
  return {
    centerX: fieldWidth / 2,
    centerY: fieldHeight / 2,
    emblemRadius: Math.min(fieldWidth, fieldHeight) * 0.22,
  };
}

export const MENU_DOT_RADIUS = 5.5;
const DOT_SPACING = 22;
/** Compact cards tighten the dot pitch to keep the strip short enough to leave art room. */
const DOT_MIN_SPACING = 16;
const DOT_MAX_PER_ROW = 13;
const DOT_BOTTOM_OFFSET = 22;
const DOT_ROW_STEP = 16;

/** Dot pitch for a card: full spacing on toddler-wide cards, tightened on compact ones. */
function dotSpacing(card: MenuCard): number {
  return card.width < MIN_CARD_WIDTH ? DOT_MIN_SPACING : DOT_SPACING;
}

/** Progress-dot centers for a menu card, wrapped into centered rows (reading order, top row first). */
export function menuDotPositions(total: number, card: MenuCard): readonly Point[] {
  if (total <= 0) {
    return [];
  }
  const perRow = dotsPerRow(total, card);
  const rows = Math.ceil(total / perRow);
  const spacing = dotSpacing(card);
  const positions: Point[] = [];
  for (let index = 0; index < total; index += 1) {
    const row = Math.floor(index / perRow);
    const column = index % perRow;
    const count = Math.min(perRow, total - row * perRow);
    const rowWidth = (count - 1) * spacing;
    const startX = card.x + card.width / 2 - rowWidth / 2;
    const y = card.y + card.height - DOT_BOTTOM_OFFSET - (rows - 1 - row) * DOT_ROW_STEP;
    positions.push({ x: startX + column * spacing, y });
  }
  return positions;
}

/** Dots per row: capped, and never wider than the card leaves room for. */
function dotsPerRow(total: number, card: MenuCard): number {
  const fit = 1 + Math.floor((card.width - 2 * MENU_DOT_RADIUS - 16) / dotSpacing(card));
  return Math.max(1, Math.min(total, DOT_MAX_PER_ROW, fit));
}

/** Max card-art height that keeps the dot strip below it clear (one row step per extra row). */
export function menuCardArtMaxHeight(card: MenuCard, dotTotal: number): number {
  const rows = Math.ceil(dotTotal / dotsPerRow(dotTotal, card));
  return card.height - 58 - Math.max(0, rows - 2) * DOT_ROW_STEP;
}
