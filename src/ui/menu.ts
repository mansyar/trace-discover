// Boot splash + main menu layout math (pure; canvas rendering defers to
// shell wiring). Content pack cards stacked in a vertically centered block,
// plus an invisible parent-gate corner zone for the 2-finger hold.
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
const SIDE_MARGIN = 65;

export function menuLayout(
  fieldWidth: number,
  fieldHeight: number,
  packIds: readonly string[],
): MenuLayout {
  const cardWidth = fieldWidth - SIDE_MARGIN * 2;
  const blockHeight = packIds.length * CARD_HEIGHT + Math.max(0, packIds.length - 1) * CARD_GAP;
  const startY = (fieldHeight - blockHeight) / 2;
  const cards = packIds.map(
    (packId, index): MenuCard => ({
      height: CARD_HEIGHT,
      packId,
      width: cardWidth,
      x: SIDE_MARGIN,
      y: startY + index * (CARD_HEIGHT + CARD_GAP),
    }),
  );
  return {
    cards,
    parentGate: { height: GATE_SIZE, width: GATE_SIZE, x: fieldWidth - GATE_SIZE, y: 0 },
  };
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
