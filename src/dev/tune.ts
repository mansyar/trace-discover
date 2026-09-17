// Dev-only feel-test harness: runs the full engine stack (path -> trail -> assists
// -> checkpoints -> renderer -> input) on a demo curve for on-device tracing tests.
// Excluded from the production build (only index.html is built).
import '../style.css';
import { ASSIST_START, DEFAULT_ASSIST_CONFIG, stepAssists } from '../engine/assists';
import {
  CHECKPOINT_START,
  createMultiCheckpoints,
  evaluateMultiCheckpoints,
} from '../engine/checkpoints';
import { catmullRom, pointAtLength, resample } from '../engine/path';
import {
  advanceMultiTrail,
  beginMultiStroke,
  createMultiTrail,
  endMultiStroke,
  MULTI_TRAIL_START,
  type MultiTrail,
} from '../engine/trail';
import type { Point } from '../engine/types';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import { attachTraceInput, type TraceHandlers } from '../input/pointer';
import { drawMultiPath, type PathStyle } from '../render/renderPath';
import { require2dContext, requireCanvas } from '../shell/boot';
import { computeBackingSize, fitRect, type Rect } from '../shell/layout';

const CHECKPOINT_COUNT = 8;
const TOLERANCE_FRACTION = 0.12;
const AUTO_RESET_MS = 2000;

// Demo level: a wavy S-curve stressing tolerance, the speed cap, and assists.
// ?strokes=2 appends a loop stroke so multi-stroke hand-over can be feel-tested.
const CONTROL_POINTS: readonly Point[] = [
  { x: 90, y: 150 },
  { x: 230, y: 230 },
  { x: 140, y: 420 },
  { x: 300, y: 520 },
  { x: 200, y: 700 },
  { x: 340, y: 780 },
];

const query = new URLSearchParams(window.location.search);

/** Loop stroke near the lower right: an easy hand-over target after the curve. */
function loopPoints(): readonly Point[] {
  const centerX = 300;
  const centerY = 620;
  const radius = 80;
  const ring = Array.from({ length: 8 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 8;
    return { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius };
  });
  const first = ring[0];
  return first ? [...ring, first] : ring;
}

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

const demoStrokes =
  query.get('strokes') === '2' ? [CONTROL_POINTS, loopPoints()] : [CONTROL_POINTS];
const multi = createMultiTrail(
  demoStrokes.map((stroke) => resample(catmullRom(stroke, 32), 8)),
  {
    maxAdvanceSpeed: 600,
    tolerance: FIELD_WIDTH * TOLERANCE_FRACTION,
  },
);
const checkpoints = createMultiCheckpoints(multi, CHECKPOINT_COUNT);

let field: Rect = fitRect(1, 1, FIELD_WIDTH, FIELD_HEIGHT);
let multiState = MULTI_TRAIL_START;
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
  multiState = MULTI_TRAIL_START;
  checkState = CHECKPOINT_START;
  assistState = ASSIST_START;
  nudgeTarget = null;
  completeTimer = 0;
  log('reset');
}

/** Arc length before the active stroke (prefix sum of earlier strokes). */
function strokeStartArc(trail: MultiTrail, index: number): number {
  let sum = 0;
  for (let i = 0; i < index; i += 1) {
    sum += trail.strokes[i]?.total ?? 0;
  }
  return sum;
}

/** Point at a global arc distance across the whole stroke sequence. */
function pointAtSequence(trail: MultiTrail, distance: number): Point {
  let remaining = distance;
  for (const stroke of trail.strokes) {
    if (remaining <= stroke.total) {
      return pointAtLength(stroke.points, stroke.cumulative, remaining);
    }
    remaining -= stroke.total;
  }
  const last = trail.strokes[trail.strokes.length - 1];
  return last ? pointAtLength(last.points, last.cumulative, last.total) : { x: 0, y: 0 };
}

const handlers: TraceHandlers = {
  onDown: (point) => {
    pointer = point;
    multiState = beginMultiStroke(multiState);
  },
  onMove: (point) => {
    pointer = point;
  },
  onUp: () => {
    pointer = null;
    multiState = endMultiStroke(multiState);
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
  detachInput = attachTraceInput(
    canvas,
    field,
    { width: FIELD_WIDTH, height: FIELD_HEIGHT },
    handlers,
  );
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

  drawMultiPath(context, multi, multiState, STYLE);

  const activeStroke = multi.strokes[multiState.strokeIndex];
  const start = activeStroke
    ? pointAtLength(activeStroke.points, activeStroke.cumulative, 0)
    : { x: 0, y: 0 };
  context.beginPath();
  context.arc(start.x, start.y, 22 * pulse, 0, Math.PI * 2);
  context.fillStyle = '#e8c15a';
  context.fill();
  context.lineWidth = 6;
  context.strokeStyle = '#2e4a63';
  context.stroke();

  const lastStroke = multi.strokes[multi.strokes.length - 1];
  const goal = lastStroke
    ? pointAtLength(lastStroke.points, lastStroke.cumulative, lastStroke.total)
    : { x: 0, y: 0 };
  context.beginPath();
  context.arc(goal.x, goal.y, 26, 0, Math.PI * 2);
  context.fillStyle = '#ffffff';
  context.fill();
  context.lineWidth = 8;
  context.strokeStyle = '#2e4a63';
  context.stroke();

  if (nudgeTarget !== null) {
    const target = pointAtSequence(
      multi,
      strokeStartArc(multi, multiState.strokeIndex) + nudgeTarget,
    );
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

  const beforeFrontier = multiState.frontier;
  const beforeStroke = multiState.strokeIndex;
  if (pointer !== null) {
    multiState = advanceMultiTrail(multi, multiState, pointer.x, pointer.y, dt);
  }
  const advanced = multiState.frontier > beforeFrontier || multiState.strokeIndex > beforeStroke;
  const activeTotal = multi.strokes[multiState.strokeIndex]?.total ?? 0;

  const assist = stepAssists(
    DEFAULT_ASSIST_CONFIG,
    assistState,
    {
      advanced,
      frontier: multiState.frontier,
      strokeTotal: activeTotal,
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

  const evaluated = evaluateMultiCheckpoints(
    checkpoints,
    checkState,
    multiState.strokeIndex,
    multiState.frontier,
  );
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
  `harness ready - ${multi.strokes.length} stroke(s), ${CHECKPOINT_COUNT} checkpoints, tolerance ${Math.round(FIELD_WIDTH * TOLERANCE_FRACTION)}px`,
);
requestAnimationFrame(frame);
