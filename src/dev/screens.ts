// Dev-only preview for the Phase 4 screens (menu / theme / success).
// Draws the real layout modules through the real pointer pipeline and
// wires theme taps to the real localStorage save: tapping a level card
// completes it (sticker lights), the 4th completion earns the badge,
// double-tapping the badge resets progress. ?screen=theme picks the
// starting screen for headless screenshots.
import '../style.css';
import type { Point } from '../engine/types';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import { attachTraceInput, type TraceHandlers } from '../input/pointer';
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
import { isThemeComplete, shouldAwardBadge } from '../themes/progress';
import { hitMenuCard, inParentGate, menuLayout } from '../ui/menu';
import { hitSuccessButton, type SuccessAction, successLayout } from '../ui/success';
import { hitThemeCard, themeLayout, themeStickers } from '../ui/theme';

type PreviewScreen = 'menu' | 'success' | 'theme';

const THEME_IDS = ['dino', 'construction', 'animals'];
const DINO_IDS = ['dino-1', 'dino-2', 'dino-3', 'dino-4'];
const MENU_FILLS = ['#8ecae6', '#ffd166', '#90be6d'];
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
if (wanted === 'theme' || wanted === 'success') {
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
  const layout = menuLayout(FIELD_WIDTH, FIELD_HEIGHT, THEME_IDS);
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
}

function drawTheme(): void {
  const layout = themeLayout(FIELD_WIDTH, FIELD_HEIGHT, DINO_IDS);
  const stickers = themeStickers(save, DINO_IDS);
  const badged = save.badges.includes('dino');
  if (badged) {
    drawCircle(layout.badge.x, layout.badge.y, layout.badge.radius, GOLD);
  } else {
    drawDashedCircle(layout.badge.x, layout.badge.y, layout.badge.radius);
  }
  layout.cards.forEach((card) => {
    drawCard(card.x, card.y, card.width, card.height, '#cfe3f2');
    drawCircle(card.x + card.width / 2, card.y + card.height / 2, 30, '#6fa8d4');
  });
  layout.slots.forEach((slot, index) => {
    if (stickers[index] === true) {
      drawCircle(slot.x, slot.y, slot.radius, GOLD);
    } else {
      drawDashedCircle(slot.x, slot.y, slot.radius);
    }
  });
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
  } else if (screen === 'theme') {
    drawTheme();
  } else {
    drawSuccess();
  }
  drawCycle();
}

function cycle(): void {
  if (screen === 'menu') {
    screen = 'theme';
  } else if (screen === 'theme') {
    screen = 'success';
  } else {
    screen = 'menu';
  }
  log(`preview: ${screen}`);
}

function tapTheme(point: Point): void {
  const layout = themeLayout(FIELD_WIDTH, FIELD_HEIGHT, DINO_IDS);
  if (
    Math.hypot(point.x - layout.badge.x, point.y - layout.badge.y) <= layout.badge.radius &&
    save.badges.includes('dino')
  ) {
    const now = performance.now();
    if (now - lastBadgeTap < DOUBLE_TAP_MS) {
      save = createDefaultSave();
      saveSave(localStorage, save);
      log('progress reset');
    }
    lastBadgeTap = now;
    return;
  }
  const levelId = hitThemeCard(layout, point);
  if (levelId === null) {
    return;
  }
  save = completeLevel(save, levelId);
  if (shouldAwardBadge(save, 'dino', DINO_IDS)) {
    save = awardBadge(save, 'dino');
    log(`complete ${levelId} — badge earned, bonus open`);
  } else {
    log(`complete ${levelId} — sticker on`);
  }
  saveSave(localStorage, save);
  if (isThemeComplete(save, DINO_IDS)) {
    log(`stickers: ${themeStickers(save, DINO_IDS).join(',')}`);
  }
}

function onTap(point: Point): void {
  if (insideRect(point, CYCLE)) {
    cycle();
    render();
    return;
  }
  if (screen === 'menu') {
    const layout = menuLayout(FIELD_WIDTH, FIELD_HEIGHT, THEME_IDS);
    if (inParentGate(layout, point)) {
      log('parent gate tapped (2-finger hold opens it in the shell)');
    } else {
      const themeId = hitMenuCard(layout, point);
      if (themeId !== null) {
        log(`open theme ${themeId}`);
        screen = 'theme';
      }
    }
  } else if (screen === 'theme') {
    tapTheme(point);
  } else {
    const action = hitSuccessButton(successLayout(FIELD_WIDTH, FIELD_HEIGHT), point);
    if (action === 'home') {
      screen = 'menu';
      log('success: home');
    } else if (action === 'next') {
      screen = 'theme';
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
