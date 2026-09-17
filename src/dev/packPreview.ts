// Dev-only pack content preview: renders a level from a `src/packs/data/*.json`
// pack exactly as authored — field gutters at the 24pt margin, each stroke as
// its own color over the engine-resampled path, control points, start/goal
// markers, and the six equal arc-length checkpoint circles from the engine's
// checkpoint plan. URL params: ?pack=<id> (default first pack), ?level=<id>
// (default first level). Click the canvas to read field coordinates (logged).
import '../style.css';
import { cumulativeLengths, pointAtLength } from '../engine/path';
import type { Point } from '../engine/types';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import { collectPackProblems } from '../packs/json';
import { levelToPath, MARGIN } from '../packs/level';
import type { PackEntry } from '../packs/pack';
import { require2dContext, requireCanvas } from '../shell/boot';
import { computeBackingSize, fitRect, type Rect } from '../shell/layout';

const CHECKPOINT_COUNT = 6;
const STROKE_COLORS = ['#2e7d5b', '#b4552d', '#4a5fa5', '#8a4f9e', '#2f8fa3', '#a67c00'];
const INK = '#2e4a63';
const CREAM = '#f6e3b8';
const PAPER = '#edf5d9';

const PACKS = Object.fromEntries(
  Object.entries(
    import.meta.glob('../../src/packs/data/*.json', {
      eager: true,
      import: 'default',
    }) as Record<string, unknown>,
  )
    .map(([path, data]) => {
      const file = path.split('/').pop() ?? '';
      const pack = collectPackProblems(data).length === 0 ? (data as PackEntry) : undefined;
      return [file.replace(/\.json$/, ''), pack] as const;
    })
    .filter(([, pack]) => pack !== undefined),
) as Record<string, PackEntry>;

const params = new URLSearchParams(location.search);
const packId = params.get('pack') ?? Object.keys(PACKS)[0] ?? '';
const pack = PACKS[packId];
const levels = [...(pack?.levels ?? []), ...(pack?.bonuses ?? [])];
const level = levels.find((candidate) => candidate.id === params.get('level')) ?? levels[0];

interface Preview {
  readonly pack: PackEntry;
  readonly levelId: string;
  readonly strokes: readonly Point[][];
  readonly start: Point;
  readonly goal: Point;
  readonly checkpointPoints: readonly Point[];
}

function buildPreview(): Preview {
  if (!pack || !level) {
    throw new Error('No pack JSON found under src/packs/data/ — add one first.');
  }
  const strokes = levelToPath(level);
  const lengths = strokes.map((stroke) => cumulativeLengths(stroke));
  const lastStroke = lengths[lengths.length - 1];
  const total = lastStroke?.[lastStroke.length - 1] ?? 0;

  const checkpointPoints: Point[] = [];
  for (let index = 0; index < CHECKPOINT_COUNT; index += 1) {
    const target =
      index === CHECKPOINT_COUNT - 1 ? total : (total * (index + 1)) / CHECKPOINT_COUNT;
    let remaining = target;
    for (let strokeIndex = 0; strokeIndex < strokes.length; strokeIndex += 1) {
      const stroke = strokes[strokeIndex];
      const cumulative = lengths[strokeIndex];
      if (!stroke || !cumulative) {
        continue;
      }
      const strokeTotal = cumulative[cumulative.length - 1] ?? 0;
      if (remaining <= strokeTotal) {
        checkpointPoints.push(pointAtLength(stroke, cumulative, remaining));
        break;
      }
      remaining -= strokeTotal;
    }
  }

  const first = strokes[0]?.[0] ?? { x: 0, y: 0 };
  return {
    pack,
    levelId: level.id,
    strokes,
    start: first,
    goal: level.goal,
    checkpointPoints,
  };
}

const model = buildPreview();
const canvas = requireCanvas(document);
const context = require2dContext(canvas);
const log = document.querySelector('#log') as HTMLElement | null;
let field: Rect = fitRect(window.innerWidth, window.innerHeight, FIELD_WIDTH, FIELD_HEIGHT);

function displaySize(): { width: number; height: number } {
  return {
    width: window.innerWidth || FIELD_WIDTH,
    height: window.innerHeight || FIELD_HEIGHT,
  };
}

function drawStar(x: number, y: number): void {
  context.beginPath();
  for (let index = 0; index < 10; index += 1) {
    const angle = (Math.PI / 5) * index - Math.PI / 2;
    const radius = index % 2 === 0 ? 16 : 7;
    const px = x + radius * Math.cos(angle);
    const py = y + radius * Math.sin(angle);
    if (index === 0) {
      context.moveTo(px, py);
    } else {
      context.lineTo(px, py);
    }
  }
  context.closePath();
  context.fillStyle = '#ffd76a';
  context.fill();
  context.lineWidth = 3;
  context.strokeStyle = INK;
  context.stroke();
}

function drawFlag(x: number, y: number): void {
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x, y - 46);
  context.lineTo(x + 30, y - 34);
  context.lineTo(x, y - 22);
  context.lineWidth = 5;
  context.lineCap = 'round';
  context.strokeStyle = INK;
  context.stroke();
  context.beginPath();
  context.arc(x, y, 8, 0, Math.PI * 2);
  context.fillStyle = '#ffd76a';
  context.fill();
  context.lineWidth = 3;
  context.strokeStyle = INK;
  context.stroke();
}

function render(): void {
  const size = displaySize();
  const dpr = canvas.width > 0 && size.width > 0 ? canvas.width / size.width : 1;
  const scale = (field.width * dpr) / FIELD_WIDTH;

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = CREAM;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.setTransform(scale, 0, 0, scale, field.x * dpr, field.y * dpr);
  context.save();
  context.beginPath();
  context.rect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
  context.clip();

  context.fillStyle = PAPER;
  context.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

  // Field gutters: anything authored here violates the 24pt margin.
  context.fillStyle = 'rgba(46, 116, 181, 0.10)';
  context.fillRect(0, 0, FIELD_WIDTH, MARGIN);
  context.fillRect(0, FIELD_HEIGHT - MARGIN, FIELD_WIDTH, MARGIN);
  context.fillRect(0, 0, MARGIN, FIELD_HEIGHT);
  context.fillRect(FIELD_WIDTH - MARGIN, 0, MARGIN, FIELD_HEIGHT);
  context.setLineDash([8, 8]);
  context.strokeStyle = 'rgba(46, 74, 99, 0.35)';
  context.lineWidth = 1.5;
  context.strokeRect(MARGIN, MARGIN, FIELD_WIDTH - 2 * MARGIN, FIELD_HEIGHT - 2 * MARGIN);
  context.setLineDash([]);

  model.strokes.forEach((stroke, strokeIndex) => {
    const color = STROKE_COLORS[strokeIndex % STROKE_COLORS.length] ?? INK;
    context.beginPath();
    stroke.forEach((point, index) => {
      if (index === 0) {
        context.moveTo(point.x, point.y);
      } else {
        context.lineTo(point.x, point.y);
      }
    });
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = color;
    context.lineWidth = 10;
    context.stroke();
    context.globalAlpha = 0.9;
    context.strokeStyle = color;
    context.lineWidth = 3;
    context.stroke();
    context.globalAlpha = 1;

    for (const point of stroke) {
      context.beginPath();
      context.arc(point.x, point.y, 3, 0, Math.PI * 2);
      context.fillStyle = 'rgba(46, 74, 99, 0.65)';
      context.fill();
    }

    const first = stroke[0];
    if (first) {
      context.font = 'bold 22px system-ui, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = color;
      context.fillText(`${strokeIndex + 1}`, first.x, first.y - 26);
    }
  });

  model.checkpointPoints.forEach((point, index) => {
    context.beginPath();
    context.arc(point.x, point.y, 19, 0, Math.PI * 2);
    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = '#e0783c';
    context.stroke();
    context.font = 'bold 20px system-ui, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = INK;
    context.fillText(`${index + 1}`, point.x, point.y + 1);
  });

  drawStar(model.start.x, model.start.y);
  drawFlag(model.goal.x, model.goal.y);

  context.restore();

  if (log) {
    const bonus = (model.pack.bonuses ?? []).some((candidate) => candidate.id === model.levelId);
    log.textContent = [
      `pack ${model.pack.id}${bonus ? ' (bonus)' : ''} · level ${model.levelId}`,
      `strokes ${model.strokes.length} · checkpoints ${model.checkpointPoints.length} · margin ${MARGIN}`,
      `?pack= · available: ${Object.keys(PACKS).join(', ')}`,
    ].join('\n');
  }

  requestAnimationFrame(render);
}

function resize(): void {
  const size = displaySize();
  const backing = computeBackingSize(size.width, size.height, window.devicePixelRatio || 1);
  canvas.width = backing.width;
  canvas.height = backing.height;
  field = fitRect(size.width, size.height, FIELD_WIDTH, FIELD_HEIGHT);
}

window.addEventListener('resize', resize);
resize();
requestAnimationFrame(render);

canvas.addEventListener('pointerdown', (event) => {
  const scaleX = field.width > 0 ? FIELD_WIDTH / field.width : 1;
  const scaleY = field.height > 0 ? FIELD_HEIGHT / field.height : 1;
  const x = (event.clientX - field.x) * scaleX;
  const y = (event.clientY - field.y) * scaleY;
  if (x >= 0 && x <= FIELD_WIDTH && y >= 0 && y <= FIELD_HEIGHT) {
    console.log(`field point { x: ${Math.round(x)}, y: ${Math.round(y)} }`);
  }
});

declare global {
  interface Window {
    __packPreview?: {
      readonly pack: PackEntry;
      readonly levelId: string;
      readonly strokes: readonly Point[][];
      readonly start: Point;
      readonly goal: Point;
      readonly checkpointPoints: readonly Point[];
      readonly margin: number;
    };
  }
}

window.__packPreview = { ...model, margin: MARGIN };
