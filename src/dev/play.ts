// Dev-only playable harness: every level end to end (trace -> chimes ->
// hop -> celebrate -> confetti -> sticker -> success) for feel testing and QA.
// ?level=<id> selects any of the 15 levels (default dino-1); next cycles all.
// Excluded from the production build (only index.html builds).
import '../style.css';
import { createTonePlayer } from '../audio/player';
import { createUnlockGate, playCheckpointChime, playCompletion } from '../audio/synth';
import { canvasLiteFactory } from '../character/adapter';
import { loadCharacter } from '../character/character';
import { ASSIST_START, DEFAULT_ASSIST_CONFIG, stepAssists } from '../engine/assists';
import { CHECKPOINT_START, createCheckpoints, evaluateCheckpoints } from '../engine/checkpoints';
import {
  COMPLETION_START,
  type CompletionEvent,
  type CompletionState,
  DEFAULT_COMPLETION_CONFIG,
  stepCompletion,
  travelProgress,
} from '../engine/completion';
import { pointAtLength } from '../engine/path';
import { advanceTrail, beginStroke, createTrail, endStroke, TRAIL_START } from '../engine/trail';
import type { Point } from '../engine/types';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import { attachTraceInput, type TraceHandlers } from '../input/pointer';
import { type ConfettiParticle, createConfetti, stepConfetti } from '../render/confetti';
import { drawPath, type PathStyle } from '../render/renderPath';
import { require2dContext, requireCanvas } from '../shell/boot';
import { computeBackingSize, fitRect, type Rect } from '../shell/layout';
import { ANIMAL_LEVELS, ANIMALS_THEME } from '../themes/animals';
import { CONSTRUCTION_LEVELS, CONSTRUCTION_THEME } from '../themes/construction';
import { DINO_LEVELS, DINO_THEME } from '../themes/dino';
import { type LevelDef, levelToPath, type ThemeDef } from '../themes/level';
import { hitSuccessButton, type SuccessAction, successLayout } from '../ui/success';

type Trail = ReturnType<typeof createTrail>;
type TrailState = typeof TRAIL_START;
type AssistState = typeof ASSIST_START;
type CheckpointState = typeof CHECKPOINT_START;

interface LevelEntry {
  readonly level: LevelDef;
  readonly theme: ThemeDef;
}

const ALL_LEVELS: readonly LevelEntry[] = [
  ...DINO_LEVELS.map((level) => ({ level, theme: DINO_THEME })),
  ...CONSTRUCTION_LEVELS.map((level) => ({ level, theme: CONSTRUCTION_THEME })),
  ...ANIMAL_LEVELS.map((level: LevelDef) => ({ level, theme: ANIMALS_THEME })),
];

const query = new URLSearchParams(window.location.search);
const requestedId = query.get('level');
const requestedIndex = ALL_LEVELS.findIndex((entry) => entry.level.id === requestedId);

const CHARACTER_SOURCE = `/rive/${ALL_LEVELS[requestedIndex >= 0 ? requestedIndex : 0]?.theme.character ?? DINO_THEME.character}.riv`;
const CHARACTER_SCALE = 0.62;
const CHARACTER_OFFSET_Y = 0.38;
const CHECKPOINT_COUNT = 6;
const TOLERANCE_FRACTION = 0.12;
const CONFETTI_COUNT = 26;
const STICKER_SLOT: Point = { x: FIELD_WIDTH - 68, y: 84 };
// Cheering spot while tracing: clear of every level's path band so the mascot
// never covers the pulsing start star. Completion still hops the full trail
// (glow stage snaps the character back to the path start first).
const TRACE_PARK: Point = { x: FIELD_WIDTH / 2, y: 650 };
// Cheering spot for the success tableau: centered above the button row so the
// mascot never covers a success button. (dino-3's goal sits right behind the
// home button, and the mascot canvas is ~62% of the field wide.)
const SUCCESS_PARK: Point = { x: FIELD_WIDTH / 2, y: 410 };
const SUCCESS = successLayout(FIELD_WIDTH, FIELD_HEIGHT);

const STYLE: PathStyle = {
  dotColor: '#6fa8d4',
  dotRadius: 7,
  dotSpacing: 46,
  outlineColor: '#2e4a63',
  outlineWidth: 6,
  paintColor: '#f6b45a',
  ribbonColor: '#cfe3f2',
  ribbonWidth: 64,
  tipColor: '#e8c15a',
  tipRadius: 16,
};

interface Play {
  readonly checkpoints: ReturnType<typeof createCheckpoints>;
  readonly level: LevelDef;
  readonly trail: Trail;
  assistState: AssistState;
  charPos: Point;
  checkState: CheckpointState;
  completion: CompletionState | null;
  confetti: readonly ConfettiParticle[];
  stickerT: number | null;
  success: boolean;
  trailState: TrailState;
}

function requireElement<T>(value: T | null, message: string): T {
  if (value === null) {
    throw new Error(message);
  }
  return value;
}

const trailCanvas = requireCanvas(document);
const trailContext = require2dContext(trailCanvas);
const logElement = document.querySelector('#log');
const charCanvas = requireElement(
  document.querySelector<HTMLCanvasElement>('#char'),
  'missing character canvas',
);

const logLines: string[] = [];
function log(line: string): void {
  logLines.push(line);
  if (logLines.length > 6) {
    logLines.shift();
  }
  if (logElement) {
    logElement.textContent = logLines.join('\n');
  }
}

const audioContext = new AudioContext();
const tonePlayer = createTonePlayer(audioContext);
const unlockGate = createUnlockGate();

const character = loadCharacter({
  canvas: charCanvas,
  onError: (error) => {
    log(`character error: ${String(error)}`);
  },
  riveFactory: canvasLiteFactory,
  src: CHARACTER_SOURCE,
  stateMachine: 'State Machine 1',
});

let levelIndex = requestedIndex >= 0 ? requestedIndex : 0;
let play = freshPlay(levelIndex);
let field: Rect = fitRect(1, 1, FIELD_WIDTH, FIELD_HEIGHT);
let pointer: Point | null = null;
let nudgeTarget: number | null = null;
let lastTime = performance.now();
let detachInput = (): void => {};

interface QaHook {
  readonly charPos: () => Point;
  readonly isSuccess: () => boolean;
  readonly levelId: string;
  readonly path: readonly Point[];
  readonly field: Rect;
  readonly stage: () => string;
}

declare global {
  interface Window {
    __qa?: QaHook;
  }
}

function refreshQa(): void {
  window.__qa = {
    charPos: () => ({ ...play.charPos }),
    field,
    isSuccess: () => play.success,
    levelId: play.level.id,
    path: play.trail.points,
    stage: () => play.completion?.stage ?? '(none)',
  };
}

function endPoint(): Point {
  return pointAtLength(play.trail.points, play.trail.cumulative, play.trail.total);
}

function freshPlay(index: number): Play {
  const entry = ALL_LEVELS[index % ALL_LEVELS.length];
  if (!entry) {
    throw new Error('missing level');
  }
  const { level } = entry;
  const trail = createTrail(levelToPath(level), {
    maxAdvanceSpeed: 600,
    tolerance: FIELD_WIDTH * TOLERANCE_FRACTION,
  });
  return {
    assistState: ASSIST_START,
    charPos: { ...TRACE_PARK },
    checkState: CHECKPOINT_START,
    checkpoints: createCheckpoints(trail, CHECKPOINT_COUNT),
    completion: null,
    confetti: [],
    level,
    stickerT: null,
    success: false,
    trail,
    trailState: TRAIL_START,
  };
}

async function unlockAudio(): Promise<void> {
  if (unlockGate.unlocked) {
    return;
  }
  unlockGate.unlock();
  try {
    await audioContext.resume();
  } catch (error) {
    log(`audio resume failed: ${String(error)}`);
  }
}

const handlers: TraceHandlers = {
  onDown: (point) => {
    void unlockAudio();
    if (play.success) {
      const action = hitSuccessButton(SUCCESS, point);
      if (action) {
        handleSuccessAction(action);
      }
      return;
    }
    if (play.completion !== null) {
      return;
    }
    pointer = point;
    play.trailState = beginStroke(play.trailState);
  },
  onMove: (point) => {
    if (!play.success && play.completion === null) {
      pointer = point;
    }
  },
  onUp: () => {
    if (play.success || play.completion !== null) {
      pointer = null;
      return;
    }
    pointer = null;
    play.trailState = endStroke(play.trailState);
  },
};

function handleSuccessAction(action: SuccessAction): void {
  if (action === 'home') {
    levelIndex = 0;
  } else if (action === 'next') {
    levelIndex = (levelIndex + 1) % ALL_LEVELS.length;
  }
  play = freshPlay(levelIndex);
  pointer = null;
  nudgeTarget = null;
  refreshQa();
  log(action);
}

function resize(): void {
  const backing = computeBackingSize(
    window.innerWidth,
    window.innerHeight,
    window.devicePixelRatio || 1,
  );
  trailCanvas.width = backing.width;
  trailCanvas.height = backing.height;
  field = fitRect(window.innerWidth, window.innerHeight, FIELD_WIDTH, FIELD_HEIGHT);
  detachInput();
  detachInput = attachTraceInput(trailCanvas, field, handlers);
  refreshQa();
}

function traceStep(dt: number): void {
  const before = play.trailState.frontier;
  if (pointer !== null) {
    play.trailState = advanceTrail(play.trail, play.trailState, pointer.x, pointer.y, dt);
  }
  const advanced = play.trailState.frontier > before;
  const assist = stepAssists(
    DEFAULT_ASSIST_CONFIG,
    play.assistState,
    {
      advanced,
      frontier: play.trailState.frontier,
      total: play.trail.total,
      touching: pointer !== null,
    },
    dt * 1000,
  );
  play.assistState = assist.state;
  if (assist.nudgeTarget !== null) {
    nudgeTarget = assist.nudgeTarget;
  }
  if (advanced) {
    nudgeTarget = null;
  }

  const evaluated = evaluateCheckpoints(
    play.checkpoints,
    play.checkState,
    play.trailState.frontier,
  );
  play.checkState = evaluated.state;
  for (const event of evaluated.events) {
    if (event.type === 'checkpoint') {
      if (unlockGate.unlocked) {
        playCheckpointChime(tonePlayer, event.index);
      }
      log(`chime ${event.index + 1}/${CHECKPOINT_COUNT}`);
    } else {
      log('complete!');
      pointer = null;
      play.trailState = endStroke(play.trailState);
      play.completion = COMPLETION_START;
    }
  }
  play.charPos = { ...TRACE_PARK };
}

function handleCompletionEvent(event: CompletionEvent): void {
  switch (event) {
    case 'burst':
      play.confetti = createConfetti(CONFETTI_COUNT, 7 + levelIndex * 13, play.charPos);
      log('burst!');
      break;
    case 'land':
      play.charPos = endPoint();
      break;
    case 'celebrateStart':
      character.fire('celebrate');
      if (unlockGate.unlocked) {
        playCompletion(tonePlayer);
      }
      break;
    case 'stickerStart':
      play.stickerT = 0;
      break;
    case 'done':
      play.confetti = [];
      play.stickerT = null;
      play.success = true;
      log('success');
      break;
    default:
      break;
  }
}

function completionStep(dt: number): void {
  if (!play.completion) {
    return;
  }
  const stepped = stepCompletion(
    DEFAULT_COMPLETION_CONFIG,
    play.completion,
    dt * 1000,
    play.trail.total,
  );
  play.completion = stepped.state;
  for (const event of stepped.events) {
    handleCompletionEvent(event);
  }

  const stage = play.completion.stage;
  if (stage === 'glow') {
    play.charPos = pointAtLength(play.trail.points, play.trail.cumulative, 0);
  } else if (stage === 'hop') {
    const progress = travelProgress(play.completion, DEFAULT_COMPLETION_CONFIG, play.trail.total);
    play.charPos = pointAtLength(
      play.trail.points,
      play.trail.cumulative,
      play.trail.total * progress,
    );
  } else if (!play.success) {
    // Pre-success the mascot waits at the goal; once success lands, charPos is
    // owned by the glide below (resetting to the goal every frame would pin it
    // there and the glide would never accumulate).
    play.charPos = endPoint();
  }

  if (play.success) {
    // Success buttons are in: glide the mascot up to the cheering spot so it
    // never covers a button (pointer taps pass through, but a toddler cannot
    // tap a button they cannot see).
    const blend = 1 - Math.exp(-dt * 5);
    play.charPos = {
      x: play.charPos.x + (SUCCESS_PARK.x - play.charPos.x) * blend,
      y: play.charPos.y + (SUCCESS_PARK.y - play.charPos.y) * blend,
    };
  }

  if (play.confetti.length > 0) {
    play.confetti = stepConfetti(play.confetti, dt);
  }
  if (play.stickerT !== null) {
    play.stickerT = Math.min(1, play.stickerT + (dt * 1000) / DEFAULT_COMPLETION_CONFIG.stickerMs);
  }
}

function drawStar(x: number, y: number, radius: number): void {
  trailContext.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const r = point % 2 === 0 ? radius : radius * 0.45;
    const angle = (Math.PI / 5) * point - Math.PI / 2;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (point === 0) {
      trailContext.moveTo(px, py);
    } else {
      trailContext.lineTo(px, py);
    }
  }
  trailContext.closePath();
}

function drawStickerAt(x: number, y: number, radius: number): void {
  trailContext.beginPath();
  trailContext.arc(x, y, radius + 6, 0, Math.PI * 2);
  trailContext.fillStyle = '#ffffff';
  trailContext.fill();
  trailContext.lineWidth = 4;
  trailContext.strokeStyle = '#2e4a63';
  trailContext.stroke();
  drawStar(x, y, radius);
  trailContext.fillStyle = '#e8c15a';
  trailContext.fill();
  trailContext.lineWidth = 4;
  trailContext.stroke();
}

function drawIcon(action: SuccessAction, x: number, y: number): void {
  trailContext.fillStyle = '#2e4a63';
  trailContext.strokeStyle = '#2e4a63';
  if (action === 'replay') {
    trailContext.lineWidth = 7;
    trailContext.beginPath();
    trailContext.arc(x, y, 16, -Math.PI / 2.6, Math.PI * 1.35);
    trailContext.stroke();
    trailContext.beginPath();
    trailContext.moveTo(x + 25, y - 4);
    trailContext.lineTo(x + 5, y - 16);
    trailContext.lineTo(x + 11, y + 12);
    trailContext.closePath();
    trailContext.fill();
  } else if (action === 'next') {
    trailContext.beginPath();
    trailContext.moveTo(x - 12, y - 18);
    trailContext.lineTo(x + 18, y);
    trailContext.lineTo(x - 12, y + 18);
    trailContext.closePath();
    trailContext.fill();
  } else {
    trailContext.beginPath();
    trailContext.moveTo(x - 22, y + 2);
    trailContext.lineTo(x, y - 20);
    trailContext.lineTo(x + 22, y + 2);
    trailContext.closePath();
    trailContext.fill();
    trailContext.fillRect(x - 13, y + 2, 26, 18);
  }
}

function render(now: number): void {
  const dpr = window.innerWidth > 0 ? trailCanvas.width / window.innerWidth : 1;
  const scale = (field.width * dpr) / FIELD_WIDTH;
  const pulse = 1 + 0.12 * Math.sin(now / 300);

  trailContext.setTransform(1, 0, 0, 1, 0, 0);
  trailContext.fillStyle = '#f6e3b8';
  trailContext.fillRect(0, 0, trailCanvas.width, trailCanvas.height);

  trailContext.setTransform(scale, 0, 0, scale, field.x * dpr, field.y * dpr);
  trailContext.save();
  trailContext.beginPath();
  trailContext.rect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
  trailContext.clip();
  trailContext.fillStyle = '#edf5d9';
  trailContext.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

  if (play.completion?.stage === 'glow') {
    trailContext.save();
    trailContext.globalAlpha = 0.35 + 0.25 * Math.sin(now / 150);
    trailContext.lineWidth = 74;
    trailContext.lineCap = 'round';
    trailContext.lineJoin = 'round';
    trailContext.strokeStyle = '#ffd76a';
    trailContext.beginPath();
    play.trail.points.forEach((pathPoint, index) => {
      if (index === 0) {
        trailContext.moveTo(pathPoint.x, pathPoint.y);
      } else {
        trailContext.lineTo(pathPoint.x, pathPoint.y);
      }
    });
    trailContext.stroke();
    trailContext.restore();
  }

  drawPath(trailContext, play.trail, play.trailState, STYLE);

  const start = pointAtLength(play.trail.points, play.trail.cumulative, 0);
  trailContext.beginPath();
  trailContext.arc(start.x, start.y, 22 * pulse, 0, Math.PI * 2);
  trailContext.fillStyle = '#e8c15a';
  trailContext.fill();
  trailContext.lineWidth = 6;
  trailContext.strokeStyle = '#2e4a63';
  trailContext.stroke();

  const goal = endPoint();
  trailContext.beginPath();
  trailContext.arc(goal.x, goal.y, 26, 0, Math.PI * 2);
  trailContext.fillStyle = '#ffffff';
  trailContext.fill();
  trailContext.lineWidth = 8;
  trailContext.strokeStyle = '#2e4a63';
  trailContext.stroke();

  if (nudgeTarget !== null && play.completion === null) {
    const target = pointAtLength(play.trail.points, play.trail.cumulative, nudgeTarget);
    trailContext.beginPath();
    trailContext.arc(target.x, target.y, 18 * pulse, 0, Math.PI * 2);
    trailContext.fillStyle = 'rgba(232, 193, 90, 0.55)';
    trailContext.fill();
  }

  if (play.stickerT !== null) {
    const end = endPoint();
    const t = play.stickerT;
    const sx = end.x + (STICKER_SLOT.x - end.x) * t;
    const sy = end.y + (STICKER_SLOT.y - end.y) * t - Math.sin(Math.PI * t) * 70;
    drawStickerAt(sx, sy, 26);
  } else if (play.success) {
    drawStickerAt(STICKER_SLOT.x, STICKER_SLOT.y, 26);
  }

  for (const particle of play.confetti) {
    trailContext.save();
    trailContext.translate(particle.x, particle.y);
    trailContext.rotate(particle.x * 0.05 + particle.y * 0.02);
    trailContext.fillStyle = particle.color;
    trailContext.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
    trailContext.restore();
  }

  if (play.success) {
    trailContext.fillStyle = 'rgba(246, 227, 184, 0.55)';
    trailContext.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
    for (const button of SUCCESS.buttons) {
      trailContext.beginPath();
      trailContext.arc(button.x, button.y, button.radius, 0, Math.PI * 2);
      trailContext.fillStyle = '#ffffff';
      trailContext.fill();
      trailContext.lineWidth = 6;
      trailContext.strokeStyle = '#2e4a63';
      trailContext.stroke();
      drawIcon(button.action, button.x, button.y);
    }
  }

  trailContext.restore();

  const charSize = field.width * CHARACTER_SCALE;
  if (charCanvas.style.width !== `${charSize}px`) {
    charCanvas.style.width = `${charSize}px`;
    charCanvas.style.height = `${charSize}px`;
    character.resize();
  }
  const cssX = field.x + (play.charPos.x / FIELD_WIDTH) * field.width;
  const cssY =
    field.y + (play.charPos.y / FIELD_HEIGHT) * field.height + charSize * CHARACTER_OFFSET_Y;
  charCanvas.style.transform = `translate(${cssX - charSize / 2}px, ${cssY - charSize / 2}px)`;
}

function frame(now: number): void {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  if (play.completion === null) {
    traceStep(dt);
  } else {
    completionStep(dt);
  }
  render(now);
  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
resize();
refreshQa();
log(`play ready - level ${play.level.id} (${play.level.stroke})`);
requestAnimationFrame(frame);
