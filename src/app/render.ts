// Production canvas renderer: draws every app screen in field coordinates.
// The shell sets the field transform (see beginField) and owns the mascot
// canvas; this module only paints the trail canvas. Child surfaces stay
// zero-text — the parent zone is the one place labels are allowed.
import { DEFAULT_COMPLETION_CONFIG } from '../engine/completion';
import { pointAtLength } from '../engine/path';
import { pointAtSequence, strokeStartArc } from '../engine/trail';
import type { Point } from '../engine/types';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import { levelToPath } from '../packs/level';
import { NUMBERS_PACK, NUMERAL_LEVELS } from '../packs/numbers';
import { mulberry32 } from '../render/confetti';
import { drawMultiPath, type PathStyle } from '../render/renderPath';
import type { ParentSettings } from '../save/store';
import type { SkinDef } from '../skins/skins';
import type { MenuCard, MenuLayout, SplashLayout } from '../ui/menu';
import type { PackLayout } from '../ui/pack';
import type { ParentZoneLayout } from '../ui/parentZone';
import type { SkinButtonZone } from '../ui/skinButton';
import type { SuccessLayout } from '../ui/success';
import type { SessionSnapshot } from './session';

export const NAVY = '#2e4a63';
export const GOLD = '#e8c15a';
export const CREAM = '#f6e3b8';
export const FIELD_FILL = '#edf5d9';

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

/** Placeholder menu art: "1 2 3" drawn from the numeral level data. */
const NUMERAL_MINI = new Map(
  NUMERAL_LEVELS.map((level) => [level.id, levelToPath(level)] as const),
);

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

export function drawMenu(
  ctx: CanvasRenderingContext2D,
  layout: MenuLayout,
  fills: readonly string[],
  packArts?: ReadonlyMap<string, PackMenuArt>,
  accent?: string,
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
      drawMenuPackCard(ctx, card, art);
    } else {
      drawMenuIcon(ctx, index, card.x + card.width / 2, card.y + card.height / 2);
    }
  });
  // Subtle grown-ups affordance: a quiet dot marking the two-finger hold
  // corner. Single taps here do nothing, so it never tempts little fingers.
  const gate = layout.parentGate;
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(gate.x + gate.width / 2, gate.y + gate.height / 2, 10, 0, Math.PI * 2);
  ctx.fillStyle = NAVY;
  ctx.fill();
  ctx.restore();
}

/** Pack card: pack art (numbers falls back to "123" strokes), a progress dot strip, star on badge. */
function drawMenuPackCard(ctx: CanvasRenderingContext2D, card: MenuCard, art?: PackMenuArt): void {
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
  } else if (card.packId === NUMBERS_PACK.id) {
    drawMenuPackArt(ctx, card);
  } else {
    drawMenuIcon(ctx, 0, centerX, card.y + card.height / 2);
  }
  if (!art || art.cleared <= 0) {
    return;
  }
  const spacing = 22;
  const startX = centerX - (spacing * (art.total - 1)) / 2;
  const dotY = card.y + card.height - 22;
  for (let i = 0; i < art.total; i += 1) {
    ctx.beginPath();
    ctx.arc(startX + i * spacing, dotY, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = i < art.cleared ? NAVY : '#ffffff';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = NAVY;
    ctx.stroke();
  }
  if (art.badge) {
    drawStar(ctx, card.x + card.width - 28, card.y + 28, 16);
    ctx.fillStyle = GOLD;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = NAVY;
    ctx.stroke();
  }
}

/** Fallback "1 2 3" strokes for the first frames before the card art loads. */
function drawMenuPackArt(ctx: CanvasRenderingContext2D, card: MenuCard): void {
  const boxWidth = card.width / 4;
  const startX = card.x + (card.width - boxWidth * 3) / 2;
  const ids = ['num-1', 'num-2', 'num-3'];
  ids.forEach((id, index) => {
    const strokes = NUMERAL_MINI.get(id);
    if (strokes) {
      drawMiniNumeral(
        ctx,
        strokes,
        startX + index * boxWidth + 6,
        card.y + 12,
        boxWidth - 12,
        card.height - 24,
        false,
      );
    }
  });
}

/** Paints a multi-stroke numeral scaled into a card with one shared transform. */
function drawMiniNumeral(
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

/** Pack screen: badge seal, 2x5 numeral grid, sticker shelf, home corner. */
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
      drawMiniNumeral(
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
  ctx.beginPath();
  ctx.arc(layout.home.x, layout.home.y, layout.home.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = NAVY;
  ctx.stroke();
  drawActionIcon(ctx, 'home', layout.home.x, layout.home.y);
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
  for (const particle of snap.confetti) {
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.x * 0.05 + particle.y * 0.02);
    ctx.fillStyle = particle.color;
    ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
    ctx.restore();
  }
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

function drawZoneButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  active: boolean,
  glyph: string,
  label: string,
): void {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
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
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText(label, x, y + radius + 24);
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
): void {
  ctx.fillStyle = NAVY;
  ctx.font = '30px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Grown-ups', FIELD_WIDTH / 2, 70);
  ctx.font = '24px system-ui, sans-serif';
  ctx.fillText('Sound', FIELD_WIDTH / 2, 175);
  drawZoneButton(
    ctx,
    layout.volumeDown.x,
    layout.volumeDown.y,
    layout.volumeDown.radius,
    false,
    '−',
    'quieter',
  );
  drawZoneButton(
    ctx,
    layout.mute.x,
    layout.mute.y,
    layout.mute.radius,
    settings.muted,
    settings.muted ? '✕' : '♪',
    'mute',
  );
  drawZoneButton(
    ctx,
    layout.volumeUp.x,
    layout.volumeUp.y,
    layout.volumeUp.radius,
    false,
    '+',
    'louder',
  );
  ctx.font = '24px system-ui, sans-serif';
  ctx.fillStyle = NAVY;
  ctx.textAlign = 'left';
  ctx.fillText('Tracing', 40, 400);
  ctx.textAlign = 'center';
  drawZoneButton(
    ctx,
    layout.easier.x,
    layout.easier.y,
    layout.easier.radius,
    settings.easierTracing,
    '★',
    settings.easierTracing ? 'easier: on' : 'easier: off',
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
  ctx.font = '24px system-ui, sans-serif';
  ctx.fillText('Trophies', FIELD_WIDTH / 2, 648);
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
  drawZoneButton(
    ctx,
    layout.reset.x,
    layout.reset.y,
    layout.reset.radius,
    confirmReset,
    '↺',
    confirmReset ? 'tap again!' : 'restart',
  );
  drawZoneButton(
    ctx,
    layout.install.x,
    layout.install.y,
    layout.install.radius,
    showInstall,
    '⤓',
    'install',
  );
  drawZoneButton(ctx, layout.done.x, layout.done.y, layout.done.radius, false, '✓', 'done');
  if (confirmReset) {
    ctx.fillStyle = 'rgba(46, 74, 99, 0.85)';
    ctx.fillRect(40, 640, FIELD_WIDTH - 80, 90);
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px system-ui, sans-serif';
    ctx.fillText('Erase all stickers? Tap restart again.', FIELD_WIDTH / 2, 686);
  }
  if (showInstall) {
    ctx.beginPath();
    ctx.rect(40, 120, FIELD_WIDTH - 80, 620);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.97)';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = NAVY;
    ctx.stroke();
    ctx.fillStyle = NAVY;
    ctx.font = '26px system-ui, sans-serif';
    const lines = [
      'Add to Home Screen',
      '',
      'Android: menu ⋮ >',
      '“Add to Home screen”.',
      '',
      'iPad: Share □↑ >',
      '“Add to Home Screen”.',
      '',
      'Then play offline!',
    ];
    lines.forEach((line, index) => {
      ctx.fillText(line, FIELD_WIDTH / 2, 190 + index * 52);
    });
  }
}
