// Pack screen layout math (pure; canvas rendering defers to shell wiring).
// Ten numeral cards in a 2x5 toddler-sized grid, a two-row sticker shelf,
// and the pack badge spot on top. Sticker state reads straight from the
// save v2 via hasNumeralSticker: a cleared numeral shows its sticker.
import type { Point } from '../engine/types';
import { hasNumeralSticker, type SaveData } from '../save/store';

export interface PackCard {
  readonly height: number;
  readonly numeralId: string;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

export interface PackSlot {
  readonly numeralId: string;
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

const BADGE_RADIUS = 44;
const BADGE_Y = 72;
const CARD_GAP = 14;
const CARD_SIZE = 96;
const COLUMNS = 2;
const GRID_TOP = 128;
const HOME_MARGIN = 56;
const HOME_RADIUS = 45;
const SLOT_GAP = 16;
const SLOT_RADIUS = 20;
const SLOT_ROW_GAP = 4;
const SLOT_TOP = 692;
const SLOTS_PER_ROW = 5;

export function packLayout(
  fieldWidth: number,
  fieldHeight: number,
  numeralIds: readonly string[],
): PackLayout {
  const gridWidth = COLUMNS * CARD_SIZE + (COLUMNS - 1) * CARD_GAP;
  const gridStartX = (fieldWidth - gridWidth) / 2;
  const cards = numeralIds.map(
    (numeralId, index): PackCard => ({
      height: CARD_SIZE,
      numeralId,
      width: CARD_SIZE,
      x: gridStartX + (index % COLUMNS) * (CARD_SIZE + CARD_GAP),
      y: GRID_TOP + Math.floor(index / COLUMNS) * (CARD_SIZE + CARD_GAP),
    }),
  );
  const slotRowWidth = SLOTS_PER_ROW * SLOT_RADIUS * 2 + (SLOTS_PER_ROW - 1) * SLOT_GAP;
  const slotStartX = (fieldWidth - slotRowWidth) / 2;
  const slots = numeralIds.map(
    (numeralId, index): PackSlot => ({
      numeralId,
      radius: SLOT_RADIUS,
      x: slotStartX + SLOT_RADIUS + (index % SLOTS_PER_ROW) * (SLOT_RADIUS * 2 + SLOT_GAP),
      y: SLOT_TOP + Math.floor(index / SLOTS_PER_ROW) * (SLOT_RADIUS * 2 + SLOT_ROW_GAP),
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
  return card === undefined ? null : card.numeralId;
}

/** True when the point lands on the home corner button. */
export function hitPackHome(layout: PackLayout, point: Point): boolean {
  return Math.hypot(point.x - layout.home.x, point.y - layout.home.y) <= layout.home.radius;
}

export function packStickers(save: SaveData, numeralIds: readonly string[]): readonly boolean[] {
  return numeralIds.map((numeralId) => hasNumeralSticker(save, numeralId));
}
