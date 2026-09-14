// Boot splash + main menu layout math (pure; canvas rendering defers to
// shell wiring). Three theme cards stacked in a vertically centered block,
// plus an invisible parent-gate corner zone for the 2-finger hold.
import type { Point } from '../engine/types';

export interface MenuCard {
  readonly height: number;
  readonly themeId: string;
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
  themeIds: readonly string[],
): MenuLayout {
  const cardWidth = fieldWidth - SIDE_MARGIN * 2;
  const blockHeight = themeIds.length * CARD_HEIGHT + Math.max(0, themeIds.length - 1) * CARD_GAP;
  const startY = (fieldHeight - blockHeight) / 2;
  const cards = themeIds.map(
    (themeId, index): MenuCard => ({
      height: CARD_HEIGHT,
      themeId,
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
  return card === undefined ? null : card.themeId;
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
