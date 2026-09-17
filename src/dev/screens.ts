// Dev-only preview for the shell screens (menu / pack / success).
// Draws the real layout modules through the real pointer pipeline and
// wires card taps to the real localStorage save: tapping a card completes
// its level (sticker lights), finishing a pack earns its badge,
// double-tapping the badge resets progress. ?screen=menu|pack|success picks
// the starting screen for headless screenshots.
import '../style.css';
import {
  createEntrance,
  type EntranceState,
  type EntranceTimeline,
  entrancePos,
  entranceStart,
  settleEntrance,
  stepEntrance,
} from '../character/entrance';
import type { Point } from '../engine/types';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import { attachTraceInput, type TraceHandlers } from '../input/pointer';
import { allPacks } from '../packs/catalog';
import { levelToPath } from '../packs/level';
import { NUMBERS_PACK, NUMERAL_LEVELS } from '../packs/numbers';
import { shouldAwardPackBadge } from '../packs/progress';
import { type ConfettiParticle, createConfetti, stepConfetti } from '../render/confetti';
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
import { MASCOT_SPARKLE_COUNT, MASCOT_SPARKLE_SEED, mascotZone } from '../ui/mascot';
import { hitMenuCard, inParentGate, menuLayout } from '../ui/menu';
import { hitPackCard, packLayout, packStickers } from '../ui/pack';
import { hitSuccessButton, type SuccessAction, successLayout } from '../ui/success';

type PreviewScreen = 'menu' | 'pack' | 'success';

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
const TUNING_BUTTON_SIZE = 64;
const TUNING_BUTTONS = [
  { id: 'giggle', label: 'G', x: CYCLE.x, y: CYCLE.y + 72 },
  { id: 'entrance', label: 'E', x: CYCLE.x, y: CYCLE.y + 144 },
  { id: 'settle', label: 'S', x: CYCLE.x, y: CYCLE.y + 216 },
] as const;
const GIGGLE_SPARKLES_MS = 1200; // mirrors src/main.ts
/** Mascot parks for the tuning overlay; mirrors src/main.ts MASCOT_SCALE_* / *_PARK. */
const MASCOT_PARKS: Partial<Record<PreviewScreen, { park: Point; scale: number }>> = {
  menu: { park: { x: 215, y: 735 }, scale: 0.32 },
  pack: { park: { x: 215, y: 572 }, scale: 0.26 },
};

const canvas = requireCanvas(document);
const context = require2dContext(canvas);
const lines: string[] = [];

let screen: PreviewScreen = 'menu';
const wanted = new URLSearchParams(window.location.search).get('screen');
if (wanted === 'success' || wanted === 'pack') {
  screen = wanted;
}
let save: SaveData = loadSave(localStorage);
let field: Rect = fitRect(1, 1, FIELD_WIDTH, FIELD_HEIGHT);
let detachInput: () => void = () => {};
let lastBadgeTap = 0;
let mascotOn = false;
let mascotEntrance: { timeline: EntranceTimeline; state: EntranceState } | null = null;
let sparkles: ConfettiParticle[] = [];
let sparklesUntil = 0;
let frameHandle = 0;
let lastFrameAt = 0;

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

/** Tuning overlay: dashed hit zone + placeholder buddy at the park (or mid-hop). */
function drawMascotOverlay(): void {
  const config = MASCOT_PARKS[screen];
  if (!mascotOn || config === undefined || mascotEntrance === null) {
    return;
  }
  const zone = mascotZone(config.park, config.scale);
  const pos = entrancePos(mascotEntrance.timeline, mascotEntrance.state);
  const size = FIELD_WIDTH * config.scale;
  const centerX = pos.x;
  const centerY = pos.y + size * 0.38;
  const radius = size / 2;
  drawCircle(centerX, centerY, radius, '#cfe3f2');
  drawDashedCircle(zone.x, zone.y, zone.radius);
  const eye = radius * 0.14;
  context.fillStyle = NAVY;
  context.beginPath();
  context.arc(centerX - radius * 0.3, centerY - radius * 0.12, eye, 0, Math.PI * 2);
  context.arc(centerX + radius * 0.3, centerY - radius * 0.12, eye, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = NAVY;
  context.lineWidth = 5;
  context.beginPath();
  context.arc(centerX, centerY + radius * 0.18, radius * 0.34, 0.25 * Math.PI, 0.75 * Math.PI);
  context.stroke();
}

/** Giggle sparkles in field space (mirrors src/main.ts drawMascotSparkles). */
function drawSparkles(): void {
  for (const particle of sparkles) {
    context.save();
    context.translate(particle.x, particle.y);
    context.rotate(particle.x * 0.05 + particle.y * 0.02);
    context.fillStyle = particle.color;
    context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
    context.restore();
  }
}

/** Dev-only tuning controls (G/E/S) tucked below the screen cycle button. */
function drawTuningButtons(): void {
  context.font = 'bold 30px monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  for (const button of TUNING_BUTTONS) {
    context.fillStyle = '#ffffff';
    context.fillRect(button.x, button.y, TUNING_BUTTON_SIZE, TUNING_BUTTON_SIZE);
    context.lineWidth = 5;
    context.strokeStyle = NAVY;
    context.strokeRect(button.x, button.y, TUNING_BUTTON_SIZE, TUNING_BUTTON_SIZE);
    context.fillStyle = NAVY;
    context.fillText(
      button.label,
      button.x + TUNING_BUTTON_SIZE / 2,
      button.y + TUNING_BUTTON_SIZE / 2,
    );
  }
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
  } else {
    drawSuccess();
  }
  drawMascotOverlay();
  drawSparkles();
  drawCycle();
  drawTuningButtons();
}

function cycle(): void {
  if (screen === 'menu') {
    screen = 'pack';
  } else if (screen === 'pack') {
    screen = 'success';
  } else {
    screen = 'menu';
  }
  if (mascotOn) {
    parkMascot();
  }
  log(`preview: ${screen}`);
}

/** Places the overlay mascot at the current screen's park, already settled. */
function parkMascot(): void {
  const config = MASCOT_PARKS[screen];
  if (config === undefined) {
    mascotEntrance = null;
    return;
  }
  mascotOn = true;
  const timeline = createEntrance(config.park);
  mascotEntrance = { timeline, state: settleEntrance(timeline, entranceStart()) };
}

function ensureFrame(): void {
  if (frameHandle !== 0) {
    return;
  }
  lastFrameAt = performance.now();
  frameHandle = requestAnimationFrame(frame);
}

function frame(): void {
  frameHandle = 0;
  const now = performance.now();
  const dtMs = Math.min(50, now - lastFrameAt);
  lastFrameAt = now;
  if (mascotEntrance !== null && !mascotEntrance.state.settled) {
    mascotEntrance.state = stepEntrance(mascotEntrance.timeline, mascotEntrance.state, dtMs);
  }
  if (sparkles.length > 0) {
    if (now >= sparklesUntil) {
      sparkles = [];
    } else {
      sparkles = stepConfetti(sparkles, dtMs / 1000);
    }
  }
  render();
  const busy = (mascotEntrance !== null && !mascotEntrance.state.settled) || sparkles.length > 0;
  if (busy) {
    ensureFrame();
  }
}

function tuningTap(id: (typeof TUNING_BUTTONS)[number]['id']): void {
  const config = MASCOT_PARKS[screen];
  if (config === undefined) {
    log(`tuning: no mascot on the ${screen} screen`);
    return;
  }
  if (id === 'giggle') {
    if (mascotEntrance === null) {
      parkMascot();
    }
    const zone = mascotZone(config.park, config.scale);
    sparkles = createConfetti(MASCOT_SPARKLE_COUNT, MASCOT_SPARKLE_SEED, {
      x: zone.x,
      y: zone.y,
    });
    sparklesUntil = performance.now() + GIGGLE_SPARKLES_MS;
    log('tuning: giggle burst');
  } else if (id === 'entrance') {
    mascotOn = true;
    const timeline = createEntrance(config.park);
    mascotEntrance = { timeline, state: entranceStart() };
    log('tuning: entrance replay');
  } else if (mascotEntrance !== null && !mascotEntrance.state.settled) {
    mascotEntrance.state = settleEntrance(mascotEntrance.timeline, mascotEntrance.state);
    log('tuning: settled');
  } else {
    log('tuning: already settled');
  }
  ensureFrame();
}

function hitTuningButton(point: Point): (typeof TUNING_BUTTONS)[number]['id'] | null {
  for (const button of TUNING_BUTTONS) {
    if (
      insideRect(point, {
        height: TUNING_BUTTON_SIZE,
        width: TUNING_BUTTON_SIZE,
        x: button.x,
        y: button.y,
      })
    ) {
      return button.id;
    }
  }
  return null;
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
  const tuning = hitTuningButton(point);
  if (tuning !== null) {
    tuningTap(tuning);
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
log('screens ready — tap cards; top-left triangle switches screen; G/E/S tune the mascot');
