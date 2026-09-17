// Dev-only preview for the shell screens (menu / pack / success / parent).
// Draws the real layout modules through the real pointer pipeline and
// wires card taps to the real localStorage save: tapping a card completes
// its level (sticker lights), finishing a pack earns its badge,
// double-tapping the badge resets progress. ?screen=menu|pack|success|parent
// picks the starting screen for headless screenshots.
import '../style.css';
import { drawGateRing, drawParent, drawParticles } from '../app/render';
import type { Point } from '../engine/types';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import { attachTraceInput, type TraceHandlers } from '../input/pointer';
import { allPacks } from '../packs/catalog';
import { levelToPath } from '../packs/level';
import { NUMBERS_PACK, NUMERAL_LEVELS } from '../packs/numbers';
import { shouldAwardPackBadge } from '../packs/progress';
import { createConfetti, stepConfetti } from '../render/confetti';
import {
  awardBadge,
  completeLevel,
  createDefaultSave,
  loadSave,
  type SaveData,
  saveSave,
} from '../save/store';
import { require2dContext, requireCanvas } from '../shell/boot';
import { computeBackingSize, fitRect, type Rect } from '../shell/layout';
import { SKINS, type SkinDef, skinById } from '../skins/skins';
import { hitMenuCard, inParentGate, menuLayout } from '../ui/menu';
import { hitPackCard, packLayout, packStickers } from '../ui/pack';
import { parentZoneLayout } from '../ui/parentZone';
import { hitSuccessButton, type SuccessAction, successLayout } from '../ui/success';

type PreviewScreen = 'menu' | 'pack' | 'success' | 'parent';

const PACK_IDS = allPacks().map((pack) => pack.id);
const NUMERALS = NUMERAL_LEVELS.map((level) => level.id);
const NUMERAL_STROKES = new Map(
  NUMERAL_LEVELS.map((level) => [level.id, levelToPath(level)] as const),
);
const MENU_FILLS = allPacks().map((pack) => pack.menuFill);
const NAVY = '#2e4a63';
const GOLD = '#e8c15a';
const CREAM = '#f6e3b8';
const FIELD_FILL = '#edf5d9';
const CYCLE = { height: 64, width: 64, x: 24, y: 24 };
const DOUBLE_TAP_MS = 400;

const canvas = requireCanvas(document);
const context = require2dContext(canvas);
const lines: string[] = [];

let screen: PreviewScreen = 'menu';
const wanted = new URLSearchParams(window.location.search).get('screen');
if (wanted === 'success' || wanted === 'pack' || wanted === 'parent') {
  screen = wanted;
}
let save: SaveData = loadSave(localStorage);
let field: Rect = fitRect(1, 1, FIELD_WIDTH, FIELD_HEIGHT);
let detachInput: () => void = () => {};
let lastBadgeTap = 0;

function log(message: string): void {
  lines.push(message);
  while (lines.length > 6) {
    lines.shift();
  }
  const element = document.querySelector('#log');
  if (element !== null) {
    element.textContent = lines.join('\n');
  }
}

function insideRect(
  point: Point,
  rect: { height: number; width: number; x: number; y: number },
): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function drawCard(x: number, y: number, width: number, height: number, fill: string): void {
  context.fillStyle = fill;
  context.fillRect(x, y, width, height);
  context.lineWidth = 6;
  context.strokeStyle = NAVY;
  context.strokeRect(x, y, width, height);
}

function drawCircle(x: number, y: number, radius: number, fill: string | null): void {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  if (fill !== null) {
    context.fillStyle = fill;
    context.fill();
  }
  context.lineWidth = 6;
  context.strokeStyle = NAVY;
  context.stroke();
}

function drawDashedCircle(x: number, y: number, radius: number): void {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.setLineDash([10, 8]);
  context.lineWidth = 5;
  context.strokeStyle = NAVY;
  context.stroke();
  context.setLineDash([]);
}

function drawMenuIcon(index: number, x: number, y: number): void {
  context.fillStyle = '#ffffff';
  context.strokeStyle = NAVY;
  context.lineWidth = 5;
  if (index === 0) {
    context.beginPath();
    context.arc(x, y, 26, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  } else if (index === 1) {
    context.beginPath();
    context.moveTo(x, y - 28);
    context.lineTo(x + 28, y + 22);
    context.lineTo(x - 28, y + 22);
    context.closePath();
    context.fill();
    context.stroke();
  } else {
    context.fillRect(x - 25, y - 25, 50, 50);
    context.strokeRect(x - 25, y - 25, 50, 50);
  }
}

function drawSuccessIcon(action: SuccessAction, x: number, y: number): void {
  context.strokeStyle = NAVY;
  context.fillStyle = NAVY;
  context.lineWidth = 7;
  if (action === 'next') {
    context.beginPath();
    context.moveTo(x - 12, y - 18);
    context.lineTo(x + 18, y);
    context.lineTo(x - 12, y + 18);
    context.closePath();
    context.fill();
  } else if (action === 'home') {
    context.beginPath();
    context.moveTo(x - 22, y + 2);
    context.lineTo(x, y - 20);
    context.lineTo(x + 22, y + 2);
    context.closePath();
    context.stroke();
    context.strokeRect(x - 13, y + 2, 26, 18);
  } else {
    context.beginPath();
    context.arc(x, y, 16, -Math.PI / 2.6, Math.PI * 1.35);
    context.stroke();
    context.beginPath();
    context.moveTo(x + 25, y - 4);
    context.lineTo(x + 5, y - 16);
    context.lineTo(x + 11, y + 12);
    context.closePath();
    context.fill();
  }
}

function drawMenu(): void {
  const layout = menuLayout(FIELD_WIDTH, FIELD_HEIGHT, PACK_IDS);
  layout.cards.forEach((card, index) => {
    drawCard(card.x, card.y, card.width, card.height, MENU_FILLS[index] ?? '#ffffff');
    drawMenuIcon(index, card.x + card.width / 2, card.y + card.height / 2);
  });
  context.setLineDash([10, 8]);
  context.lineWidth = 4;
  context.strokeStyle = '#c0392b';
  context.strokeRect(
    layout.parentGate.x,
    layout.parentGate.y,
    layout.parentGate.width,
    layout.parentGate.height,
  );
  context.setLineDash([]);
  // Static preview of the one-finger hold ring + open burst (Task 2 evidence).
  const gateCenter = {
    x: layout.parentGate.x + layout.parentGate.width / 2,
    y: layout.parentGate.y + layout.parentGate.height / 2,
  };
  drawGateRing(context, gateCenter, 0.6);
  drawParticles(context, stepConfetti(createConfetti(12, 7, gateCenter), 0.18));
}

function drawPackPreview(): void {
  const layout = packLayout(FIELD_WIDTH, FIELD_HEIGHT, NUMERALS);
  const stickers = packStickers(save, NUMERALS);
  if (save.badges.includes('numbers-badge')) {
    drawCircle(layout.badge.x, layout.badge.y, layout.badge.radius, GOLD);
  } else {
    drawDashedCircle(layout.badge.x, layout.badge.y, layout.badge.radius);
  }
  layout.cards.forEach((card, index) => {
    drawCard(card.x, card.y, card.width, card.height, '#cfe3f2');
    const strokes = NUMERAL_STROKES.get(card.levelId);
    if (strokes) {
      drawNumeralMini(
        strokes,
        card.x + 10,
        card.y + 10,
        card.width - 20,
        card.height - 20,
        stickers[index] === true,
      );
    }
  });
  layout.slots.forEach((slot, index) => {
    if (stickers[index] === true) {
      drawCircle(slot.x, slot.y, slot.radius, GOLD);
    } else {
      drawDashedCircle(slot.x, slot.y, slot.radius);
    }
  });
  drawCircle(layout.home.x, layout.home.y, layout.home.radius, '#ffffff');
  drawSuccessIcon('home', layout.home.x, layout.home.y);
}

/** Scaled multi-stroke numeral preview inside a card. */
function drawNumeralMini(
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
  const scale = Math.min(
    width / Math.max(1, maxX - minX + 60),
    height / Math.max(1, maxY - minY + 60),
  );
  context.save();
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  for (const stroke of strokes) {
    stroke.forEach((point, index) => {
      const px = x + width / 2 + (point.x - (minX + maxX) / 2) * scale;
      const py = y + height / 2 + (point.y - (minY + maxY) / 2) * scale;
      if (index === 0) {
        context.moveTo(px, py);
      } else {
        context.lineTo(px, py);
      }
    });
  }
  context.strokeStyle = NAVY;
  context.lineWidth = 12;
  context.stroke();
  context.strokeStyle = completed ? GOLD : '#6fa8d4';
  context.lineWidth = 8;
  context.stroke();
  context.restore();
}

function drawSuccess(): void {
  context.fillStyle = 'rgba(246, 227, 184, 0.55)';
  context.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
  const layout = successLayout(FIELD_WIDTH, FIELD_HEIGHT);
  for (const button of layout.buttons) {
    drawCircle(button.x, button.y, button.radius, '#ffffff');
    drawSuccessIcon(button.action, button.x, button.y);
  }
}

function previewSkin(): SkinDef {
  const skin = skinById(save.settings.skin) ?? SKINS[0];
  if (!skin) {
    throw new Error('The skin registry is empty.');
  }
  return skin;
}

function drawParentPreview(): void {
  drawParent(
    context,
    performance.now(),
    parentZoneLayout(FIELD_WIDTH, FIELD_HEIGHT),
    save.settings,
    false,
    false,
    previewSkin(),
    null,
    save.trophies,
  );
}

function drawCycle(): void {
  context.fillStyle = GOLD;
  context.fillRect(CYCLE.x, CYCLE.y, CYCLE.width, CYCLE.height);
  context.lineWidth = 5;
  context.strokeStyle = NAVY;
  context.strokeRect(CYCLE.x, CYCLE.y, CYCLE.width, CYCLE.height);
  context.fillStyle = NAVY;
  context.beginPath();
  context.moveTo(CYCLE.x + 22, CYCLE.y + 14);
  context.lineTo(CYCLE.x + 42, CYCLE.y + 32);
  context.lineTo(CYCLE.x + 22, CYCLE.y + 50);
  context.closePath();
  context.fill();
}

function render(): void {
  const dpr = canvas.width / window.innerWidth;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.fillStyle = CREAM;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const scale = (field.width * dpr) / FIELD_WIDTH;
  context.setTransform(scale, 0, 0, scale, field.x * dpr, field.y * dpr);
  context.fillStyle = FIELD_FILL;
  context.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
  if (screen === 'menu') {
    drawMenu();
  } else if (screen === 'pack') {
    drawPackPreview();
  } else if (screen === 'parent') {
    drawParentPreview();
  } else {
    drawSuccess();
  }
  drawCycle();
}

function cycle(): void {
  if (screen === 'menu') {
    screen = 'pack';
  } else if (screen === 'pack') {
    screen = 'success';
  } else if (screen === 'success') {
    screen = 'parent';
  } else {
    screen = 'menu';
  }
  log(`preview: ${screen}`);
}

function tapPack(point: Point): void {
  const layout = packLayout(FIELD_WIDTH, FIELD_HEIGHT, NUMERALS);
  if (
    Math.hypot(point.x - layout.badge.x, point.y - layout.badge.y) <= layout.badge.radius &&
    save.badges.includes(NUMBERS_PACK.badgeId)
  ) {
    const now = performance.now();
    if (now - lastBadgeTap < DOUBLE_TAP_MS) {
      save = createDefaultSave();
      saveSave(localStorage, save);
      log('pack progress reset');
    }
    lastBadgeTap = now;
    return;
  }
  const levelId = hitPackCard(layout, point);
  if (levelId === null) {
    return;
  }
  save = completeLevel(save, levelId);
  if (shouldAwardPackBadge(save, NUMBERS_PACK)) {
    save = awardBadge(save, NUMBERS_PACK.badgeId);
    log(`complete ${levelId} — pack badge earned`);
  } else {
    log(`complete ${levelId} — sticker on`);
  }
  saveSave(localStorage, save);
}

function onTap(point: Point): void {
  if (insideRect(point, CYCLE)) {
    cycle();
    render();
    return;
  }
  if (screen === 'menu') {
    const layout = menuLayout(FIELD_WIDTH, FIELD_HEIGHT, PACK_IDS);
    if (inParentGate(layout, point)) {
      log('parent gate tapped (2-finger hold opens it in the shell)');
    } else {
      const packId = hitMenuCard(layout, point);
      if (packId !== null) {
        log(`open pack ${packId}`);
        screen = 'pack';
      }
    }
  } else if (screen === 'pack') {
    tapPack(point);
  } else {
    const action = hitSuccessButton(successLayout(FIELD_WIDTH, FIELD_HEIGHT), point);
    if (action === 'home') {
      screen = 'menu';
      log('success: home');
    } else if (action === 'next') {
      screen = 'pack';
      log('success: next');
    } else if (action === 'replay') {
      log('success: replay');
    }
  }
  render();
}

const handlers: TraceHandlers = {
  onDown: (point: Point): void => {
    onTap(point);
  },
  onMove: (): void => {},
  onUp: (): void => {},
};

function resize(): void {
  const size = computeBackingSize(window.innerWidth, window.innerHeight, window.devicePixelRatio);
  canvas.width = size.width;
  canvas.height = size.height;
  field = fitRect(window.innerWidth, window.innerHeight, FIELD_WIDTH, FIELD_HEIGHT);
  detachInput();
  detachInput = attachTraceInput(canvas, field, handlers);
  render();
}

window.addEventListener('resize', resize);
resize();
log('screens ready — tap cards; top-left triangle switches screen');
