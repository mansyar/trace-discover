// Pack screen layout math (pure; canvas rendering defers to shell wiring).
// Content pack cards in a toddler-sized grid (columns configurable per pack),
// a sticker shelf below, and the pack badge spot on top. Sticker state reads
// straight from the save via hasSticker: a cleared level shows its sticker.
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
  readonly columns?: number;
  readonly slotsPerRow?: number;
}

const BADGE_RADIUS = 44;
const BADGE_Y = 72;
const CARD_GAP = 14;
const CARD_SIZE = 96;
const DEFAULT_COLUMNS = 2;
const GRID_TOP = 128;
const HOME_MARGIN = 56;
const HOME_RADIUS = 45;
const SLOT_GAP = 16;
const SLOT_RADIUS = 20;
const SLOT_ROW_GAP = 4;
const SLOT_TOP = 692;
const DEFAULT_SLOTS_PER_ROW = 5;

export function packLayout(
  fieldWidth: number,
  fieldHeight: number,
  levelIds: readonly string[],
  options: PackLayoutOptions = {},
): PackLayout {
  const columns = options.columns ?? DEFAULT_COLUMNS;
  const slotsPerRow = options.slotsPerRow ?? DEFAULT_SLOTS_PER_ROW;
  const gridWidth = columns * CARD_SIZE + (columns - 1) * CARD_GAP;
  const gridStartX = (fieldWidth - gridWidth) / 2;
  const cards = levelIds.map(
    (levelId, index): PackCard => ({
      height: CARD_SIZE,
      levelId,
      width: CARD_SIZE,
      x: gridStartX + (index % columns) * (CARD_SIZE + CARD_GAP),
      y: GRID_TOP + Math.floor(index / columns) * (CARD_SIZE + CARD_GAP),
    }),
  );
  const slotRowWidth = slotsPerRow * SLOT_RADIUS * 2 + (slotsPerRow - 1) * SLOT_GAP;
  const slotStartX = (fieldWidth - slotRowWidth) / 2;
  const slots = levelIds.map(
    (levelId, index): PackSlot => ({
      levelId,
      radius: SLOT_RADIUS,
      x: slotStartX + SLOT_RADIUS + (index % slotsPerRow) * (SLOT_RADIUS * 2 + SLOT_GAP),
      y: SLOT_TOP + Math.floor(index / slotsPerRow) * (SLOT_RADIUS * 2 + SLOT_ROW_GAP),
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
