// Theme screen layout math (pure; canvas rendering defers to shell
// wiring). Top-anchored column: badge spot, 2-column level card grid,
// sticker shelf with one slot per level. Sticker state reads straight
// from the save via hasSticker: a cleared level shows its sticker.
import type { Point } from '../engine/types';
import { hasSticker, type SaveData } from '../save/store';

export interface LevelCard {
  readonly height: number;
  readonly levelId: string;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

export interface StickerSlot {
  readonly levelId: string;
  readonly radius: number;
  readonly x: number;
  readonly y: number;
}

export interface BadgeSpot {
  readonly radius: number;
  readonly x: number;
  readonly y: number;
}

export interface ThemeHome {
  readonly radius: number;
  readonly x: number;
  readonly y: number;
}

export interface ThemeLayout {
  readonly badge: BadgeSpot;
  readonly cards: readonly LevelCard[];
  readonly home: ThemeHome;
  readonly slots: readonly StickerSlot[];
}

const BADGE_RADIUS = 40;
const BADGE_Y = 80;
const CARD_GAP = 20;
const CARD_SIZE = 170;
const COLUMNS = 2;
const GRID_TOP = 170;
const HOME_MARGIN = 56;
const HOME_RADIUS = 48;
const SLOT_GAP = 24;
const SLOT_OFFSET_BELOW_GRID = 60;
const SLOT_RADIUS = 36;

export function themeLayout(
  fieldWidth: number,
  fieldHeight: number,
  levelIds: readonly string[],
): ThemeLayout {
  const gridWidth = COLUMNS * CARD_SIZE + (COLUMNS - 1) * CARD_GAP;
  const startX = (fieldWidth - gridWidth) / 2;
  const cards = levelIds.map(
    (levelId, index): LevelCard => ({
      height: CARD_SIZE,
      levelId,
      width: CARD_SIZE,
      x: startX + (index % COLUMNS) * (CARD_SIZE + CARD_GAP),
      y: GRID_TOP + Math.floor(index / COLUMNS) * (CARD_SIZE + CARD_GAP),
    }),
  );
  const rows = Math.ceil(levelIds.length / COLUMNS);
  const gridBottom = GRID_TOP + rows * (CARD_SIZE + CARD_GAP) - CARD_GAP;
  const slotRowWidth =
    levelIds.length * SLOT_RADIUS * 2 + Math.max(0, levelIds.length - 1) * SLOT_GAP;
  const slotStartX = (fieldWidth - slotRowWidth) / 2;
  const slots = levelIds.map(
    (levelId, index): StickerSlot => ({
      levelId,
      radius: SLOT_RADIUS,
      x: slotStartX + SLOT_RADIUS + index * (SLOT_RADIUS * 2 + SLOT_GAP),
      y: gridBottom + SLOT_OFFSET_BELOW_GRID,
    }),
  );
  return {
    badge: { radius: BADGE_RADIUS, x: fieldWidth / 2, y: BADGE_Y },
    cards,
    home: { radius: HOME_RADIUS, x: HOME_MARGIN, y: fieldHeight - HOME_MARGIN },
    slots,
  };
}

export function hitThemeCard(layout: ThemeLayout, point: Point): string | null {
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
export function hitThemeHome(layout: ThemeLayout, point: Point): boolean {
  return Math.hypot(point.x - layout.home.x, point.y - layout.home.y) <= layout.home.radius;
}

export function themeStickers(save: SaveData, levelIds: readonly string[]): readonly boolean[] {
  return levelIds.map((levelId) => hasSticker(save, levelId));
}
