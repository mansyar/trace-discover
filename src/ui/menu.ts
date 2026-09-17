// Boot splash + main menu layout math (pure; canvas rendering defers to
// shell wiring). Pack cards run as a vertically centered stack in the
// portrait field and as a centered row (or 2-column wrap) in the wide
// landscape field; both keep the invisible parent-gate corner zone.
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
const MENU_PARK_BOTTOM_OFFSET_LANDSCAPE = 70;

export function menuLayout(
  fieldWidth: number,
  fieldHeight: number,
  packIds: readonly string[],
): MenuLayout {
  const cards =
    fieldWidth > fieldHeight
      ? wideCards(fieldWidth, fieldHeight, packIds)
      : tallCards(fieldWidth, fieldHeight, packIds);
  return {
    cards,
    parentGate: { height: GATE_SIZE, width: GATE_SIZE, x: fieldWidth - GATE_SIZE, y: 0 },
  };
}

/** Portrait: one full-width card per pack in a vertically centered stack. */
function tallCards(
  fieldWidth: number,
  fieldHeight: number,
  packIds: readonly string[],
): readonly MenuCard[] {
  const cardWidth = fieldWidth - SIDE_MARGIN * 2;
  const blockHeight = packIds.length * CARD_HEIGHT + Math.max(0, packIds.length - 1) * CARD_GAP;
  const startY = (fieldHeight - blockHeight) / 2;
  return packIds.map(
    (packId, index): MenuCard => ({
      height: CARD_HEIGHT,
      packId,
      width: cardWidth,
      x: SIDE_MARGIN,
      y: startY + index * (CARD_HEIGHT + CARD_GAP),
    }),
  );
}

/** Landscape: a single centered row when cards stay toddler-wide, else a
 *  centered 2-column wrap (row-major, last odd card centered). */
function wideCards(
  fieldWidth: number,
  fieldHeight: number,
  packIds: readonly string[],
): readonly MenuCard[] {
  const available = fieldWidth - SIDE_MARGIN * 2;
  const count = packIds.length;
  if (count === 0) {
    return [];
  }
  const singleRowWidth = (available - (count - 1) * CARD_GAP) / count;
  if (singleRowWidth >= MIN_CARD_WIDTH) {
    const y = (fieldHeight - CARD_HEIGHT) / 2;
    return packIds.map(
      (packId, index): MenuCard => ({
        height: CARD_HEIGHT,
        packId,
        width: singleRowWidth,
        x: SIDE_MARGIN + index * (singleRowWidth + CARD_GAP),
        y,
      }),
    );
  }
  const columns = 2;
  const cardWidth = (available - (columns - 1) * CARD_GAP) / columns;
  const rows = Math.ceil(count / columns);
  const blockHeight = rows * CARD_HEIGHT + (rows - 1) * CARD_GAP;
  const startY = (fieldHeight - blockHeight) / 2;
  return packIds.map((packId, index): MenuCard => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const rowCount = Math.min(columns, count - row * columns);
    const rowWidth = rowCount * cardWidth + (rowCount - 1) * CARD_GAP;
    return {
      height: CARD_HEIGHT,
      packId,
      width: cardWidth,
      x: (fieldWidth - rowWidth) / 2 + column * (cardWidth + CARD_GAP),
      y: startY + row * (CARD_HEIGHT + CARD_GAP),
    };
  });
}

/** Mascot park: bottom-center, with room below the card block in either field. */
export function menuParkPosition(fieldWidth: number, fieldHeight: number): Point {
  const bottomOffset =
    fieldWidth > fieldHeight ? MENU_PARK_BOTTOM_OFFSET_LANDSCAPE : MENU_PARK_BOTTOM_OFFSET_PORTRAIT;
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
const DOT_MAX_PER_ROW = 13;
const DOT_BOTTOM_OFFSET = 22;
const DOT_ROW_STEP = 16;

/** Progress-dot centers for a menu card, wrapped into centered rows (reading order, top row first). */
export function menuDotPositions(total: number, card: MenuCard): readonly Point[] {
  if (total <= 0) {
    return [];
  }
  const perRow = Math.min(total, DOT_MAX_PER_ROW);
  const rows = Math.ceil(total / perRow);
  const positions: Point[] = [];
  for (let index = 0; index < total; index += 1) {
    const row = Math.floor(index / perRow);
    const column = index % perRow;
    const count = Math.min(perRow, total - row * perRow);
    const rowWidth = (count - 1) * DOT_SPACING;
    const startX = card.x + card.width / 2 - rowWidth / 2;
    const y = card.y + card.height - DOT_BOTTOM_OFFSET - (rows - 1 - row) * DOT_ROW_STEP;
    positions.push({ x: startX + column * DOT_SPACING, y });
  }
  return positions;
}
