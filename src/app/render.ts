// Production canvas renderer: draws every app screen in field coordinates.
// The shell sets the field transform (see beginField) and owns the mascot
// canvas; this module only paints the trail canvas. Child surfaces stay
// zero-text — the parent zone is the one place labels are allowed.
import { DEFAULT_COMPLETION_CONFIG } from '../engine/completion';
import { pointAtLength } from '../engine/path';
import { pointAtSequence, strokeStartArc } from '../engine/trail';
import type { Point } from '../engine/types';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import { type ConfettiParticle, mulberry32 } from '../render/confetti';
import { drawMultiPath, type PathStyle } from '../render/renderPath';
import type { ParentSettings } from '../save/store';
import type { SkinDef } from '../skins/skins';
import type { InstallVariant } from '../ui/install';
import {
  MENU_DOT_RADIUS,
  type MenuCard,
  type MenuLayout,
  menuDotPositions,
  type SplashLayout,
} from '../ui/menu';
import type { PackLayout, PackPager, PackPagerSpot } from '../ui/pack';
import { volumePips } from '../ui/parent';
import type {
  NameOverlayLayout,
  ParentZoneAction,
  ParentZoneLayout,
  ZoneCard,
} from '../ui/parentZone';
import type { SkinButtonZone } from '../ui/skinButton';
import type { StickerBoardLayout } from '../ui/stickerBoard';
import type { SuccessLayout } from '../ui/success';
import { menuFallbackStrokes } from './menuArt';
import type { SessionSnapshot } from './session';
import { POP_ART_SCALE, type StickerPopFrame, stickerPopPlacement } from './stickerPop';

export const NAVY = '#2e4a63';
export const GOLD = '#e8c15a';
export const CREAM = '#f6e3b8';
export const FIELD_FILL = '#edf5d9';

/** One-time parent hint tooltip under the gate corner (copy owner-approved). */
const PARENT_HINT = { gapAbove: 8, height: 58, margin: 20, width: 240 } as const;
const PARENT_HINT_LINES = ['Hold here to open', 'Grown-ups'] as const;

const PATH_STYLE: PathStyle = {
  ribbonWidth: 64,
  outlineWidth: 6,
  dotRadius: 7,
  dotSpacing: 46,
  paintColor: '#f6b45a',
  ribbonColor: '#cfe3f2',
  outlineColor: NAVY,
  dotColor: '#6fa8d4',
  tipColor: GOLD,
  tipRadius: 16,
};

/** Sticker fly-in target (top-right of the level screen). */
export const STICKER_SLOT: Point = { x: FIELD_WIDTH - 68, y: 84 };

/** Home button on the badge screen (bottom-center). */
export const BADGE_HOME = { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT - 90, radius: 48 };
export const BADGE_SEAL = { x: FIELD_WIDTH / 2, y: 380, radius: 110 };

/** Top-left skin switch: face icon in a ring, poofing outward on cycle. */
export function drawSkinButton(
  ctx: CanvasRenderingContext2D,
  now: number,
  zone: SkinButtonZone,
  skin: SkinDef,
  face: HTMLImageElement | null,
  poofStartedAt: number | null,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = NAVY;
  ctx.stroke();
  if (face) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.radius - 8, 0, Math.PI * 2);
    ctx.clip();
    const size = (zone.radius - 8) * 2;
    ctx.drawImage(face, zone.x - zone.radius + 8, zone.y - zone.radius + 8, size, size);
    ctx.restore();
  } else {
    // Drawn face until the Phase 4 icon batch ships.
    ctx.fillStyle = skin.accent;
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.radius - 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = NAVY;
    ctx.beginPath();
    ctx.arc(zone.x - 12, zone.y - 8, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(zone.x + 12, zone.y - 8, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(zone.x, zone.y + 4, 15, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.lineWidth = 4;
    ctx.strokeStyle = NAVY;
    ctx.stroke();
  }
  if (poofStartedAt !== null) {
    const progress = (now - poofStartedAt) / 450;
    if (progress >= 0 && progress < 1) {
      ctx.globalAlpha = 1 - progress;
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, zone.radius + 20 * progress, 0, Math.PI * 2);
      ctx.lineWidth = 6;
      ctx.strokeStyle = skin.accent;
      ctx.stroke();
      ctx.fillStyle = skin.accent;
      for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI * 2 * i) / 6 + progress * 0.8;
        const radius = zone.radius + 10 + 26 * progress;
        ctx.beginPath();
        ctx.arc(
          zone.x + Math.cos(angle) * radius,
          zone.y + Math.sin(angle) * radius,
          5 * (1 - progress),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

/** Paints the cream shell, installs the field transform, and clips to the field. */
export function beginField(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  field: { x: number; y: number; width: number },
  dpr: number,
): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  const scale = (field.width * dpr) / FIELD_WIDTH;
  ctx.setTransform(scale, 0, 0, scale, field.x * dpr, field.y * dpr);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
  ctx.clip();
  ctx.fillStyle = FIELD_FILL;
  ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
}

export function endField(ctx: CanvasRenderingContext2D): void {
  ctx.restore();
}

export function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
): void {
  ctx.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const r = point % 2 === 0 ? radius : radius * 0.45;
    const angle = (Math.PI / 5) * point - Math.PI / 2;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (point === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
}

/** Gold star seal for an earned sticker/badge, dashed outline when unearned. */
/** Runtime level art: null until its file loads; renderers fall back to paint. */
export interface LevelArt {
  readonly backdrop: HTMLImageElement | null;
  readonly goal: HTMLImageElement | null;
  readonly sticker: HTMLImageElement | null;
}

export const NO_LEVEL_ART: LevelArt = { backdrop: null, goal: null, sticker: null };

/** Paints the backdrop cover-cropped over the whole field. */
function drawBackdrop(ctx: CanvasRenderingContext2D, image: HTMLImageElement): void {
  const scale = Math.max(FIELD_WIDTH / image.naturalWidth, FIELD_HEIGHT / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.drawImage(image, (FIELD_WIDTH - width) / 2, (FIELD_HEIGHT - height) / 2, width, height);
}

/** Paints a goal vignette centered on the point at the given pixel size. */
function drawGoalArt(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  size: number,
): void {
  ctx.drawImage(image, x - size / 2, y - size / 2, size, size);
}

export function drawSeal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  earned: boolean,
): void {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  if (earned) {
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = NAVY;
    ctx.stroke();
    drawStar(ctx, x, y, radius * 0.62);
    ctx.fillStyle = GOLD;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.stroke();
  } else {
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 5;
    ctx.strokeStyle = NAVY;
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawMenuIcon(ctx: CanvasRenderingContext2D, index: number, x: number, y: number): void {
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 6;
  if (index === 0) {
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (index === 1) {
    ctx.beginPath();
    ctx.moveTo(x, y - 32);
    ctx.lineTo(x + 32, y + 24);
    ctx.lineTo(x - 32, y + 24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.rect(x - 28, y - 28, 56, 56);
    ctx.fill();
    ctx.stroke();
  }
}

/** Replay / next / home glyphs (ported from the verified harness). */
export function drawActionIcon(
  ctx: CanvasRenderingContext2D,
  action: 'replay' | 'next' | 'home',
  x: number,
  y: number,
): void {
  ctx.fillStyle = NAVY;
  ctx.strokeStyle = NAVY;
  if (action === 'replay') {
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(x, y, 16, -Math.PI / 2.6, Math.PI * 1.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 25, y - 4);
    ctx.lineTo(x + 5, y - 16);
    ctx.lineTo(x + 11, y + 12);
    ctx.closePath();
    ctx.fill();
  } else if (action === 'next') {
    ctx.beginPath();
    ctx.moveTo(x - 12, y - 18);
    ctx.lineTo(x + 18, y);
    ctx.lineTo(x - 12, y + 18);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(x - 22, y + 2);
    ctx.lineTo(x, y - 20);
    ctx.lineTo(x + 22, y + 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - 13, y + 2, 26, 18);
  }
}

export function drawSplash(ctx: CanvasRenderingContext2D, now: number, layout: SplashLayout): void {
  const pulse = 1 + 0.08 * Math.sin(now / 350);
  ctx.setLineDash([4, 18]);
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#6fa8d4';
  ctx.beginPath();
  ctx.arc(layout.centerX, layout.centerY, layout.emblemRadius * 1.35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  drawStar(ctx, layout.centerX, layout.centerY, layout.emblemRadius * pulse);
  ctx.fillStyle = GOLD;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = NAVY;
  ctx.stroke();
}

/** Pack card extras: real art plus zero-text progress (first frames: null). */
export interface PackMenuArt {
  readonly image: HTMLImageElement | null;
  readonly cleared: number;
  readonly total: number;
  readonly badge: boolean;
}

/** Skin accent tag: a small identity chip on each pack card. */
function drawAccentTag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  accent: string,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, height / 2);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = NAVY;
  ctx.stroke();
}

/** Confetti/sparkle particles (tracing celebration and the gate burst share one look). */
export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: readonly ConfettiParticle[],
): void {
  for (const particle of particles) {
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.x * 0.05 + particle.y * 0.02);
    ctx.fillStyle = particle.color;
    ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
    ctx.restore();
  }
}

/** Gold progress arc around the gate corner; fills 0 → 1 as the hold builds. */
export function drawGateRing(ctx: CanvasRenderingContext2D, center: Point, progress: number): void {
  const t = Math.min(1, Math.max(0, progress));
  if (t <= 0) {
    return;
  }
  ctx.save();
  ctx.beginPath();
  ctx.arc(center.x, center.y, 24, 0, Math.PI * 2);
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(46, 74, 99, 0.18)';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(center.x, center.y, 24, -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2);
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.strokeStyle = GOLD;
  ctx.stroke();
  ctx.restore();
}

export function drawMenu(
  ctx: CanvasRenderingContext2D,
  now: number,
  layout: MenuLayout,
  fills: readonly string[],
  packArts?: ReadonlyMap<string, PackMenuArt>,
  accent?: string,
  name?: string,
  gateProgress = 0,
  hintVisible = false,
): void {
  layout.cards.forEach((card, index) => {
    ctx.beginPath();
    ctx.rect(card.x, card.y, card.width, card.height);
    ctx.fillStyle = fills[index] ?? '#ffffff';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = NAVY;
    ctx.stroke();
    if (accent) {
      drawAccentTag(ctx, card.x + 16, card.y + 14, 44, 12, accent);
    }
    const art = packArts?.get(card.packId);
    if (art) {
      drawMenuPackCard(ctx, card, art, name);
    } else {
      drawMenuIcon(ctx, index, card.x + card.width / 2, card.y + card.height / 2);
    }
  });
  // Subtle grown-ups affordance: a quiet dot marking the hold corner; the
  // gold ring fills while a grown-up holds. Single taps here do nothing, so
  // it never tempts little fingers.
  const gate = layout.parentGate;
  const gateCenter = { x: gate.x + gate.width / 2, y: gate.y + gate.height / 2 };
  // Gentle pulse while the one-time hint is up so parents notice the corner.
  const dotRadius = hintVisible ? 10 * (1 + 0.22 * Math.sin(now / 250)) : 10;
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(gateCenter.x, gateCenter.y, dotRadius, 0, Math.PI * 2);
  ctx.fillStyle = NAVY;
  ctx.fill();
  ctx.restore();
  drawGateRing(ctx, gateCenter, gateProgress);
  if (hintVisible) {
    drawParentHint(ctx, gate);
  }
}

/** Small parent-facing tooltip under the gate corner (non-interactive, floats over cards). */
function drawParentHint(
  ctx: CanvasRenderingContext2D,
  gate: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): void {
  const x = FIELD_WIDTH - PARENT_HINT.margin - PARENT_HINT.width;
  const y = gate.y + gate.height + PARENT_HINT.gapAbove;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, PARENT_HINT.width, PARENT_HINT.height, 16);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.97)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = NAVY;
  ctx.stroke();
  ctx.fillStyle = NAVY;
  ctx.font = '600 18px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  PARENT_HINT_LINES.forEach((line, index) => {
    ctx.fillText(line, x + PARENT_HINT.width / 2, y + 20 + index * 22);
  });
  ctx.restore();
}

/** Pack card: pack art (numbers "1 2 3" / letters "A B C" fallbacks), a progress dot strip, star on badge. */
function drawMenuPackCard(
  ctx: CanvasRenderingContext2D,
  card: MenuCard,
  art?: PackMenuArt,
  name?: string,
): void {
  const centerX = card.x + card.width / 2;
  const image = art?.image;
  if (image) {
    const maxHeight = card.height - 58;
    const maxWidth = card.width - 44;
    const scale = Math.min(maxHeight / image.naturalHeight, maxWidth / image.naturalWidth);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    ctx.drawImage(
      image,
      centerX - width / 2,
      card.y + 14 + (maxHeight - height) / 2,
      width,
      height,
    );
  } else {
    const sets = menuFallbackStrokes(card.packId, name);
    if (sets.length > 0) {
      drawMenuFallback(ctx, card, sets);
    } else {
      drawMenuIcon(ctx, 0, centerX, card.y + card.height / 2);
    }
  }
  if (!art || art.cleared <= 0) {
    return;
  }
  const positions = menuDotPositions(art.total, card);
  positions.forEach((position, index) => {
    ctx.beginPath();
    ctx.arc(position.x, position.y, MENU_DOT_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = index < art.cleared ? NAVY : '#ffffff';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = NAVY;
    ctx.stroke();
  });
  if (art.badge) {
    drawStar(ctx, card.x + card.width - 28, card.y + 28, 16);
    ctx.fillStyle = GOLD;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = NAVY;
    ctx.stroke();
  }
}

/** Fallback mini strokes for cards without art: "1 2 3", "A B C", or the composed name. */
function drawMenuFallback(
  ctx: CanvasRenderingContext2D,
  card: MenuCard,
  sets: readonly (readonly (readonly Point[])[])[],
): void {
  if (sets.length === 1) {
    // One composed set (the name pack) uses the full card width.
    const composed = sets[0];
    if (composed) {
      drawMiniPath(
        ctx,
        composed,
        card.x + 24,
        card.y + 12,
        card.width - 48,
        card.height - 24,
        false,
      );
    }
    return;
  }
  const boxWidth = card.width / 4;
  const startX = card.x + (card.width - boxWidth * 3) / 2;
  sets.forEach((strokes, index) => {
    drawMiniPath(
      ctx,
      strokes,
      startX + index * boxWidth + 6,
      card.y + 12,
      boxWidth - 12,
      card.height - 24,
      false,
    );
  });
}

/** Paints multi-stroke level paths scaled into a card with one shared transform. */
function drawMiniPath(
  ctx: CanvasRenderingContext2D,
  strokes: readonly (readonly Point[])[],
  x: number,
  y: number,
  width: number,
  height: number,
  completed: boolean,
): void {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const stroke of strokes) {
    for (const point of stroke) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }
  const pad = 60;
  const scale = Math.min(
    width / Math.max(1, maxX - minX + pad),
    height / Math.max(1, maxY - minY + pad),
  );
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (const stroke of strokes) {
    stroke.forEach((point, index) => {
      const px = x + width / 2 + (point.x - (minX + maxX) / 2) * scale;
      const py = y + height / 2 + (point.y - (minY + maxY) / 2) * scale;
      if (index === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    });
  }
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 14;
  ctx.stroke();
  ctx.strokeStyle = completed ? '#f6b45a' : '#cfe3f2';
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.restore();
}

/** Pager state for a paginated pack screen: which page is shown + its spots. */
export interface PackPagerView {
  readonly page: number;
  readonly spots: PackPager;
}

/** Pack screen: badge seal, level-card grid (per-page shape), sticker shelf, home corner. */
export function drawPack(
  ctx: CanvasRenderingContext2D,
  now: number,
  layout: PackLayout,
  stickers: readonly boolean[],
  badgeEarned: boolean,
  highlightBadge: boolean,
  miniPaths: ReadonlyMap<string, readonly (readonly Point[])[]>,
  stickerImages: ReadonlyMap<string, HTMLImageElement> = new Map(),
  badgeImage: HTMLImageElement | null = null,
  accent?: string,
  pager?: PackPagerView | null,
): void {
  const badgePulse = highlightBadge ? 1 + 0.1 * Math.sin(now / 250) : 1;
  if (badgeEarned && badgeImage) {
    drawGoalArt(
      ctx,
      badgeImage,
      layout.badge.x,
      layout.badge.y,
      layout.badge.radius * 2.2 * badgePulse,
    );
  } else {
    drawSeal(ctx, layout.badge.x, layout.badge.y, layout.badge.radius * badgePulse, badgeEarned);
  }
  layout.cards.forEach((card, index) => {
    ctx.beginPath();
    ctx.rect(card.x, card.y, card.width, card.height);
    ctx.fillStyle = '#cfe3f2';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = NAVY;
    ctx.stroke();
    if (accent) {
      drawAccentTag(ctx, card.x + 10, card.y + 10, 30, 9, accent);
    }
    const strokes = miniPaths.get(card.levelId);
    if (strokes && strokes.length > 0) {
      drawMiniPath(
        ctx,
        strokes,
        card.x + 10,
        card.y + 10,
        card.width - 20,
        card.height - 20,
        stickers[index] ?? false,
      );
    }
    if (stickers[index] === true) {
      drawStar(ctx, card.x + card.width - 24, card.y + 24, 14);
      ctx.fillStyle = GOLD;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = NAVY;
      ctx.stroke();
    }
  });
  layout.slots.forEach((slot, index) => {
    const earned = stickers[index] === true;
    const card = layout.cards[index];
    const sticker = card ? stickerImages.get(card.levelId) : undefined;
    if (earned && sticker) {
      drawGoalArt(ctx, sticker, slot.x, slot.y, slot.radius * 2.48);
    } else {
      drawSeal(ctx, slot.x, slot.y, slot.radius, earned);
    }
  });
  if (pager) {
    drawPackPager(ctx, pager.spots, pager.page);
  }
  ctx.beginPath();
  ctx.arc(layout.home.x, layout.home.y, layout.home.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = NAVY;
  ctx.stroke();
  drawActionIcon(ctx, 'home', layout.home.x, layout.home.y);
}

/** Zero-text pager: chevron buttons for the directions that exist + page dots. */
export function drawPackPager(ctx: CanvasRenderingContext2D, spots: PackPager, page: number): void {
  if (page > 0) {
    drawPagerButton(ctx, spots.prev, -1);
  }
  if (page < spots.dots.length - 1) {
    drawPagerButton(ctx, spots.next, 1);
  }
  spots.dots.forEach((dot, index) => {
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, index === page ? dot.radius * 1.4 : dot.radius, 0, Math.PI * 2);
    ctx.fillStyle = index === page ? NAVY : '#cfe3f2';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = NAVY;
    ctx.stroke();
  });
}

function drawPagerButton(
  ctx: CanvasRenderingContext2D,
  spot: PackPagerSpot,
  direction: -1 | 1,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(spot.x, spot.y, spot.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = NAVY;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(spot.x - direction * 9, spot.y - 17);
  ctx.lineTo(spot.x + direction * 11, spot.y);
  ctx.lineTo(spot.x - direction * 9, spot.y + 17);
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = NAVY;
  ctx.stroke();
  ctx.restore();
}

/** Sticker board: skin backdrop, earned sticker art / ghosted slots, home corner. */
export function drawStickerBoard(
  ctx: CanvasRenderingContext2D,
  layout: StickerBoardLayout,
  stickers: readonly boolean[],
  stickerImages: ReadonlyMap<string, HTMLImageElement> = new Map(),
  backdrop: HTMLImageElement | null = null,
  accent?: string,
): void {
  if (backdrop) {
    drawBackdrop(ctx, backdrop);
  } else if (accent) {
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
    ctx.restore();
  }
  layout.cells.forEach((cell, index) => {
    const earned = stickers[index] === true;
    const sticker = earned ? stickerImages.get(cell.levelId) : undefined;
    if (sticker) {
      drawGoalArt(ctx, sticker, cell.x, cell.y, cell.radius * POP_ART_SCALE);
    } else {
      drawSeal(ctx, cell.x, cell.y, cell.radius, earned);
    }
  });
  ctx.beginPath();
  ctx.arc(layout.home.x, layout.home.y, layout.home.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = NAVY;
  ctx.stroke();
  drawActionIcon(ctx, 'home', layout.home.x, layout.home.y);
}

/** Pop overlay for a tapped board sticker: the cell's sticker springs up
 *  (scaled with squash-and-stretch) with a radial sparkle burst. */
export function drawStickerPop(
  ctx: CanvasRenderingContext2D,
  cell: { readonly radius: number; readonly x: number; readonly y: number },
  image: HTMLImageElement | null,
  frame: StickerPopFrame,
  tint: string = GOLD,
): void {
  const placement = stickerPopPlacement(cell, frame, FIELD_WIDTH, FIELD_HEIGHT);
  if (frame.sparkle > 0) {
    const count = 10;
    ctx.globalAlpha = frame.sparkle;
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      const distance = cell.radius * 0.9 + 90 * frame.sparkle;
      ctx.beginPath();
      ctx.arc(
        placement.x + Math.cos(angle) * distance,
        placement.y + Math.sin(angle) * distance * 0.8,
        5 + 6 * frame.sparkle,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = index % 2 === 0 ? GOLD : tint;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  const width = cell.radius * POP_ART_SCALE * placement.scaleX;
  const height = cell.radius * POP_ART_SCALE * placement.scaleY;
  if (image) {
    ctx.drawImage(image, placement.x - width / 2, placement.y - height / 2, width, height);
    return;
  }
  ctx.save();
  ctx.translate(placement.x, placement.y);
  ctx.scale(placement.scaleX, placement.scaleY);
  ctx.beginPath();
  drawStar(ctx, 0, 0, cell.radius * 0.62);
  ctx.fillStyle = GOLD;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = NAVY;
  ctx.stroke();
  ctx.restore();
}

/** Drawn stand-in while a skin's backdrop art has not shipped yet. */
function drawDuskPlaceholder(ctx: CanvasRenderingContext2D, now: number, accent: string): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, FIELD_HEIGHT);
  gradient.addColorStop(0, '#20264d');
  gradient.addColorStop(1, '#4a3b6b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
  const random = mulberry32(7);
  ctx.fillStyle = '#ffe9a8';
  for (let i = 0; i < 26; i += 1) {
    const x = random() * FIELD_WIDTH;
    const y = random() * FIELD_HEIGHT;
    const radius = 1.5 + random() * 2.5;
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(now / 600 + i);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(FIELD_WIDTH / 2, 150, 64, 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawLevel(
  ctx: CanvasRenderingContext2D,
  now: number,
  snap: SessionSnapshot,
  art: LevelArt = NO_LEVEL_ART,
  skin?: SkinDef,
): void {
  if (art.backdrop) {
    drawBackdrop(ctx, art.backdrop);
  } else if (skin) {
    drawDuskPlaceholder(ctx, now, skin.accent);
  }
  const pulse = 1 + 0.12 * Math.sin(now / 300);
  if (snap.completionStarted && snap.completion.stage === 'glow') {
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.25 * Math.sin(now / 150);
    ctx.lineWidth = 74;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#ffd76a';
    for (const stroke of snap.multi.strokes) {
      ctx.beginPath();
      stroke.points.forEach((pathPoint, index) => {
        if (index === 0) {
          ctx.moveTo(pathPoint.x, pathPoint.y);
        } else {
          ctx.lineTo(pathPoint.x, pathPoint.y);
        }
      });
      ctx.stroke();
    }
    ctx.restore();
  }
  drawMultiPath(ctx, snap.multi, snap.multiState, PATH_STYLE);
  const activeStroke = snap.multi.strokes[snap.multiState.strokeIndex];
  const start = activeStroke
    ? pointAtLength(activeStroke.points, activeStroke.cumulative, 0)
    : { x: 0, y: 0 };
  ctx.beginPath();
  ctx.arc(start.x, start.y, 22 * pulse, 0, Math.PI * 2);
  ctx.fillStyle = GOLD;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = NAVY;
  ctx.stroke();
  const end = pointAtSequence(snap.multi, snap.multi.total);
  if (art.goal) {
    drawGoalArt(ctx, art.goal, end.x, end.y, 104);
  } else {
    ctx.beginPath();
    ctx.arc(end.x, end.y, 26, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = NAVY;
    ctx.stroke();
  }
  if (snap.nudgeAt !== null && !snap.completionStarted) {
    const target = pointAtSequence(
      snap.multi,
      strokeStartArc(snap.multi, snap.multiState.strokeIndex) + snap.nudgeAt,
    );
    ctx.beginPath();
    ctx.arc(target.x, target.y, 18 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(232, 193, 90, 0.55)';
    ctx.fill();
  }
  if (snap.hintVisible && !snap.completionStarted) {
    ctx.beginPath();
    ctx.arc(snap.tip.x, snap.tip.y, 34 * pulse, 0, Math.PI * 2);
    ctx.lineWidth = 6;
    ctx.strokeStyle = GOLD;
    ctx.stroke();
  }
  const stickerT =
    snap.completion.stage === 'sticker'
      ? Math.min(1, snap.completion.elapsedMs / DEFAULT_COMPLETION_CONFIG.stickerMs)
      : snap.completion.stage === 'done'
        ? 1
        : null;
  if (stickerT !== null) {
    const sx = end.x + (STICKER_SLOT.x - end.x) * stickerT;
    const sy = end.y + (STICKER_SLOT.y - end.y) * stickerT - Math.sin(Math.PI * stickerT) * 70;
    if (art.sticker) {
      drawGoalArt(ctx, art.sticker, sx, sy, 64);
    } else {
      drawSeal(ctx, sx, sy, 26, true);
    }
  } else if (snap.completionStarted && snap.completion.stage === 'done') {
    if (art.sticker) {
      drawGoalArt(ctx, art.sticker, STICKER_SLOT.x, STICKER_SLOT.y, 64);
    } else {
      drawSeal(ctx, STICKER_SLOT.x, STICKER_SLOT.y, 26, true);
    }
  }
  drawParticles(ctx, snap.confetti);
}

export function drawSuccess(ctx: CanvasRenderingContext2D, layout: SuccessLayout): void {
  ctx.fillStyle = 'rgba(246, 227, 184, 0.55)';
  ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
  for (const button of layout.buttons) {
    ctx.beginPath();
    ctx.arc(button.x, button.y, button.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = NAVY;
    ctx.stroke();
    drawActionIcon(ctx, button.action, button.x, button.y);
  }
}

export function drawBadge(
  ctx: CanvasRenderingContext2D,
  now: number,
  art: HTMLImageElement | null = null,
): void {
  const pulse = 1 + 0.08 * Math.sin(now / 280);
  if (art) {
    drawGoalArt(ctx, art, BADGE_SEAL.x, BADGE_SEAL.y, BADGE_SEAL.radius * 2.2 * pulse);
  } else {
    drawSeal(ctx, BADGE_SEAL.x, BADGE_SEAL.y, BADGE_SEAL.radius * pulse, true);
  }
  ctx.beginPath();
  ctx.arc(BADGE_HOME.x, BADGE_HOME.y, BADGE_HOME.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = NAVY;
  ctx.stroke();
  drawActionIcon(ctx, 'home', BADGE_HOME.x, BADGE_HOME.y);
}

/** Duration of the pressed-control pop, in ms. */
const PRESS_PULSE_MS = 240;

function drawZoneButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  active: boolean,
  glyph: string,
  label: string,
  pressT = 0,
): void {
  const pop = 1 + 0.08 * Math.sin(Math.PI * Math.max(0, Math.min(1, pressT)));
  ctx.beginPath();
  ctx.arc(x, y, radius * pop, 0, Math.PI * 2);
  ctx.fillStyle = active ? GOLD : '#ffffff';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = NAVY;
  ctx.stroke();
  ctx.fillStyle = NAVY;
  ctx.font = `${Math.round(radius * 0.7)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, x, y + 2);
  if (label) {
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText(label, x, y + radius + 24);
  }
}

/** State of the pressed-control pop (set by the shell on each parent tap). */
export interface ParentPress {
  readonly action: ParentZoneAction;
  readonly atMs: number;
}

/** Rounded section panel + its label (parent copy lives on the parent screen). */
function drawZoneCard(ctx: CanvasRenderingContext2D, card: ZoneCard): void {
  ctx.beginPath();
  ctx.roundRect(card.rect.x, card.rect.y, card.rect.width, card.rect.height, 18);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.97)';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = NAVY;
  ctx.stroke();
  ctx.fillStyle = NAVY;
  ctx.font = '20px system-ui, sans-serif';
  const mini = card.mini;
  ctx.textAlign = mini ? 'center' : 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    card.label,
    mini ? card.rect.x + card.rect.width / 2 : card.rect.x + 20,
    card.rect.y + 22,
  );
}

const PIP_RADIUS = 6;
const PIP_GAP = 18;

/** Five pips track the volume level; muted dims the filled pips. */
function drawVolumePips(
  ctx: CanvasRenderingContext2D,
  rightX: number,
  centerY: number,
  volume: number,
  muted: boolean,
): void {
  const filled = volumePips(volume);
  for (let index = 0; index < 5; index += 1) {
    ctx.beginPath();
    ctx.arc(rightX - (4 - index) * PIP_GAP, centerY, PIP_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle =
      index < filled ? (muted ? 'rgba(46, 74, 99, 0.28)' : GOLD) : 'rgba(46, 74, 99, 0.15)';
    ctx.fill();
  }
}

/** Copy per install variant; the panel shows only the steps that apply. */
const INSTALL_LINES: Readonly<Record<InstallVariant, readonly string[]>> = {
  android: [
    'Add to Home Screen',
    '',
    'Menu ⋮ >',
    '“Add to Home screen”.',
    '',
    'Then play offline!',
  ],
  generic: [
    'Add to Home Screen',
    '',
    'Android: menu ⋮ >',
    '“Add to Home screen”.',
    '',
    'iPad: Share □↑ >',
    '“Add to Home Screen”.',
    '',
    'Then play offline!',
  ],
  installed: ['All set!', '', 'You are playing the', 'installed app.', '', 'It works offline.'],
  ios: [
    'Add to Home Screen',
    '',
    'Tap Share □↑ >',
    '“Add to Home Screen”.',
    '',
    'Then play offline!',
  ],
};

function drawInstallPanel(ctx: CanvasRenderingContext2D, variant: InstallVariant): void {
  ctx.beginPath();
  ctx.roundRect(40, 120, FIELD_WIDTH - 80, 620, 18);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.97)';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = NAVY;
  ctx.stroke();
  ctx.fillStyle = NAVY;
  ctx.font = '26px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const [index, line] of INSTALL_LINES[variant].entries()) {
    ctx.fillText(line, FIELD_WIDTH / 2, 190 + index * 52);
  }
}

export function drawParent(
  ctx: CanvasRenderingContext2D,
  now: number,
  layout: ParentZoneLayout,
  settings: ParentSettings,
  confirmReset: boolean,
  showInstall: boolean,
  skin: SkinDef,
  skinFace: HTMLImageElement | null,
  trophies: readonly string[],
  pressed: ParentPress | null = null,
  installVariant: InstallVariant = 'generic',
): void {
  const pressT = (action: ParentZoneAction): number => {
    if (!pressed || pressed.action !== action) {
      return 0;
    }
    return 1 - Math.min(1, Math.max(0, (now - pressed.atMs) / PRESS_PULSE_MS));
  };
  ctx.fillStyle = NAVY;
  ctx.font = '30px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Grown-ups', FIELD_WIDTH / 2, 70);
  for (const card of layout.cards) {
    drawZoneCard(ctx, card);
  }
  const soundCard = layout.cards.find((card) => card.id === 'sound');
  if (soundCard) {
    drawVolumePips(
      ctx,
      soundCard.rect.x + soundCard.rect.width - 20,
      soundCard.rect.y + 22,
      settings.volume,
      settings.muted,
    );
  }
  drawZoneButton(
    ctx,
    layout.volumeDown.x,
    layout.volumeDown.y,
    layout.volumeDown.radius,
    false,
    '−',
    '',
    pressT('volume-down'),
  );
  drawZoneButton(
    ctx,
    layout.mute.x,
    layout.mute.y,
    layout.mute.radius,
    settings.muted,
    settings.muted ? '✕' : '♪',
    '',
    pressT('mute'),
  );
  drawZoneButton(
    ctx,
    layout.volumeUp.x,
    layout.volumeUp.y,
    layout.volumeUp.radius,
    false,
    '+',
    '',
    pressT('volume-up'),
  );
  drawZoneButton(
    ctx,
    layout.easier.x,
    layout.easier.y,
    layout.easier.radius,
    settings.easierTracing,
    '★',
    settings.easierTracing ? 'easier: on' : 'easier: off',
    pressT('easier'),
  );
  const skinButton = layout.skin;
  drawSkinButton(
    ctx,
    now,
    { radius: skinButton.radius, x: skinButton.x, y: skinButton.y },
    skin,
    skinFace,
    null,
  );
  ctx.fillStyle = NAVY;
  ctx.font = '22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('skin', skinButton.x, skinButton.y + skinButton.radius + 24);
  const nameButton = layout.name;
  drawZoneButton(
    ctx,
    nameButton.x,
    nameButton.y,
    nameButton.radius,
    false,
    '✎',
    'name',
    pressT('name'),
  );
  if (!confirmReset) {
    ctx.font = '24px system-ui, sans-serif';
    ctx.fillText('Trophies', FIELD_WIDTH / 2, 672);
    layout.trophies.forEach((slot, index) => {
      ctx.beginPath();
      if (index < trophies.length) {
        ctx.arc(slot.x, slot.y, slot.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = NAVY;
        ctx.stroke();
        drawStar(ctx, slot.x, slot.y, slot.radius - 8);
        ctx.fillStyle = GOLD;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = NAVY;
        ctx.stroke();
      } else {
        ctx.setLineDash([8, 6]);
        ctx.arc(slot.x, slot.y, slot.radius, 0, Math.PI * 2);
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(46, 74, 99, 0.35)';
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
  }
  drawZoneButton(
    ctx,
    layout.reset.x,
    layout.reset.y,
    layout.reset.radius,
    confirmReset,
    '↺',
    confirmReset ? 'tap again!' : 'restart',
    pressT('reset'),
  );
  drawZoneButton(
    ctx,
    layout.install.x,
    layout.install.y,
    layout.install.radius,
    showInstall,
    '⤓',
    'install',
    pressT('install'),
  );
  drawZoneButton(
    ctx,
    layout.done.x,
    layout.done.y,
    layout.done.radius,
    false,
    '✓',
    'done',
    pressT('done'),
  );
  if (confirmReset) {
    ctx.beginPath();
    ctx.roundRect(40, 648, FIELD_WIDTH - 80, 64, 16);
    ctx.fillStyle = 'rgba(46, 74, 99, 0.85)';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText('Erase all stickers? Tap restart again.', FIELD_WIDTH / 2, 680);
  }
  if (showInstall) {
    drawInstallPanel(ctx, installVariant);
  }
}

/**
 * Modal for the parent-set name: backdrop, white panel, field frame (the DOM
 * input mounts over it), hint copy, and Save / Clear / Cancel targets.
 * Parent copy only - the child never reaches this screen.
 */
export function drawNameOverlay(ctx: CanvasRenderingContext2D, layout: NameOverlayLayout): void {
  ctx.save();
  ctx.fillStyle = 'rgba(46, 74, 99, 0.45)';
  ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
  const { panel, field } = layout;
  ctx.beginPath();
  ctx.rect(panel.x, panel.y, panel.width, panel.height);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = NAVY;
  ctx.stroke();
  ctx.fillStyle = NAVY;
  ctx.font = '26px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText("Child's name", FIELD_WIDTH / 2, panel.y + 36);
  ctx.beginPath();
  ctx.rect(field.x, field.y, field.width, field.height);
  ctx.setLineDash([8, 6]);
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(46, 74, 99, 0.45)';
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = NAVY;
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText('2-7 letters, A-Z', FIELD_WIDTH / 2, field.y + field.height + 34);
  drawZoneButton(ctx, layout.save.x, layout.save.y, layout.save.radius, false, '✓', 'save');
  if (layout.clear) {
    drawZoneButton(ctx, layout.clear.x, layout.clear.y, layout.clear.radius, false, '⌫', 'clear');
  }
  drawZoneButton(ctx, layout.cancel.x, layout.cancel.y, layout.cancel.radius, false, '✕', 'cancel');
  ctx.restore();
}
