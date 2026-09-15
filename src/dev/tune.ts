// Dev-only feel-test harness: runs the full engine stack (path -> trail -> assists
// -> checkpoints -> renderer -> input) on a demo curve for on-device tracing tests.
// Excluded from the production build (only index.html is built).
import '../style.css';
import { ASSIST_START, DEFAULT_ASSIST_CONFIG, stepAssists } from '../engine/assists';
import { CHECKPOINT_START, createCheckpoints, evaluateCheckpoints } from '../engine/checkpoints';
import { catmullRom, pointAtLength, resample } from '../engine/path';
import { advanceTrail, beginStroke, createTrail, endStroke, TRAIL_START } from '../engine/trail';
import type { Point } from '../engine/types';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import { attachTraceInput, type TraceHandlers } from '../input/pointer';
import { drawPath, type PathStyle } from '../render/renderPath';
import { require2dContext, requireCanvas } from '../shell/boot';
import { computeBackingSize, fitRect, type Rect } from '../shell/layout';

const CHECKPOINT_COUNT = 8;
const TOLERANCE_FRACTION = 0.12;
const AUTO_RESET_MS = 2000;

// Demo level: a wavy S-curve stressing tolerance, the speed cap, and assists.
const CONTROL_POINTS: readonly Point[] = [
  { x: 90, y: 150 },
  { x: 230, y: 230 },
  { x: 140, y: 420 },
  { x: 300, y: 520 },
  { x: 200, y: 700 },
  { x: 340, y: 780 },
];

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

const canvas = requireCanvas(document);
const context = require2dContext(canvas);
const logElement = document.querySelector('#log');

const level = createTrail(resample(catmullRom(CONTROL_POINTS, 32), 8), {
  maxAdvanceSpeed: 600,
  tolerance: FIELD_WIDTH * TOLERANCE_FRACTION,
});
const checkpoints = createCheckpoints(level, CHECKPOINT_COUNT);

let field: Rect = fitRect(1, 1, FIELD_WIDTH, FIELD_HEIGHT);
let trailState = TRAIL_START;
let checkState = CHECKPOINT_START;
let assistState = ASSIST_START;
let pointer: Point | null = null;
let nudgeTarget: number | null = null;
let lastTime = performance.now();
let completeTimer = 0;

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

function reset(): void {
  trailState = TRAIL_START;
  checkState = CHECKPOINT_START;
  assistState = ASSIST_START;
  nudgeTarget = null;
  completeTimer = 0;
  log('reset');
}

const handlers: TraceHandlers = {
  onDown: (point) => {
    pointer = point;
    trailState = beginStroke(trailState);
  },
  onMove: (point) => {
    pointer = point;
  },
  onUp: () => {
    pointer = null;
    trailState = endStroke(trailState);
  },
};

function resize(): void {
  const backing = computeBackingSize(
    window.innerWidth,
    window.innerHeight,
    window.devicePixelRatio || 1,
  );
  canvas.width = backing.width;
  canvas.height = backing.height;
  field = fitRect(window.innerWidth, window.innerHeight, FIELD_WIDTH, FIELD_HEIGHT);
  detachInput();
  detachInput = attachTraceInput(canvas, field, handlers);
}

let detachInput = (): void => {};

function render(now: number): void {
  const dpr = window.innerWidth > 0 ? canvas.width / window.innerWidth : 1;
  const scale = (field.width * dpr) / FIELD_WIDTH;
  const pulse = 1 + 0.12 * Math.sin(now / 300);

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = '#f6e3b8';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.setTransform(scale, 0, 0, scale, field.x * dpr, field.y * dpr);
  context.save();
  context.beginPath();
  context.rect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
  context.clip();
  context.fillStyle = '#edf5d9';
  context.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

  drawPath(context, level, trailState, STYLE);

  const start = pointAtLength(level.points, level.cumulative, 0);
  context.beginPath();
  context.arc(start.x, start.y, 22 * pulse, 0, Math.PI * 2);
  context.fillStyle = '#e8c15a';
  context.fill();
  context.lineWidth = 6;
  context.strokeStyle = '#2e4a63';
  context.stroke();

  const goal = pointAtLength(level.points, level.cumulative, level.total);
  context.beginPath();
  context.arc(goal.x, goal.y, 26, 0, Math.PI * 2);
  context.fillStyle = '#ffffff';
  context.fill();
  context.lineWidth = 8;
  context.strokeStyle = '#2e4a63';
  context.stroke();

  if (nudgeTarget !== null) {
    const target = pointAtLength(level.points, level.cumulative, nudgeTarget);
    context.beginPath();
    context.arc(target.x, target.y, 18 * pulse, 0, Math.PI * 2);
    context.fillStyle = 'rgba(232, 193, 90, 0.55)';
    context.fill();
  }

  context.restore();
}

function frame(now: number): void {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  const before = trailState.frontier;
  if (pointer !== null) {
    trailState = advanceTrail(level, trailState, pointer.x, pointer.y, dt);
  }
  const advanced = trailState.frontier > before;

  const assist = stepAssists(
    DEFAULT_ASSIST_CONFIG,
    assistState,
    {
      advanced,
      frontier: trailState.frontier,
      strokeTotal: level.total,
      touching: pointer !== null,
    },
    dt * 1000,
  );
  assistState = assist.state;
  if (assist.nudgeTarget !== null) {
    nudgeTarget = assist.nudgeTarget;
  }
  if (advanced) {
    nudgeTarget = null;
  }

  const evaluated = evaluateCheckpoints(checkpoints, checkState, trailState.frontier);
  checkState = evaluated.state;
  for (const event of evaluated.events) {
    log(event.type === 'checkpoint' ? `chime ${event.index + 1}/${CHECKPOINT_COUNT}` : 'complete!');
  }

  if (evaluated.state.completed) {
    completeTimer += dt * 1000;
    if (completeTimer > AUTO_RESET_MS) {
      reset();
    }
  }

  render(now);
  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
resize();
log(
  `harness ready - ${CHECKPOINT_COUNT} checkpoints, tolerance ${Math.round(FIELD_WIDTH * TOLERANCE_FRACTION)}px`,
);
requestAnimationFrame(frame);
