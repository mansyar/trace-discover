// Painter coverage for the sticker board + pop overlay (Phase 3 track work).
// Mirrors src/render/renderPath.test.ts: a recording stub context asserts the
// primitives each painter emits — there is no real canvas in the node test env.
import { describe, expect, it } from 'vitest';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import type { SplashLayout } from '../ui/menu';
import { stickerBoardLayout } from '../ui/stickerBoard';
import {
  drawDrawnMascot,
  drawGate,
  drawSplash,
  drawStickerBoard,
  drawStickerPop,
  GOLD,
} from './render';
import { stickerPopFrame } from './stickerPop';

const IDS = ['num-0', 'num-1', 'num-2'];
const image = { naturalWidth: 96, naturalHeight: 96 } as unknown as HTMLImageElement;

function boardLayout() {
  return stickerBoardLayout(FIELD_WIDTH, FIELD_HEIGHT, IDS);
}

/** Records every 2D-context call the painters make; `arcs` keeps the arc geometry. */
function fakeContext(ops: string[], arcs: string[] = []): CanvasRenderingContext2D {
  const ctx = {
    beginPath: () => ops.push('beginPath'),
    moveTo: () => ops.push('moveTo'),
    lineTo: () => ops.push('lineTo'),
    closePath: () => ops.push('closePath'),
    arc: (x: number, y: number, radius: number, start: number, end: number) => {
      ops.push('arc');
      arcs.push(
        [x, y, radius, start, end].map((value) => String(Number(value.toFixed(3)))).join(','),
      );
    },
    fillText: () => ops.push('fillText'),
    fill: () => ops.push('fill'),
    stroke: () => ops.push('stroke'),
    fillRect: (x: number, y: number, width: number, height: number) =>
      ops.push(`fillRect:${x},${y},${width},${height}`),
    drawImage: (...args: unknown[]) =>
      ops.push(
        `drawImage:${Number(args[1])},${Number(args[2])},${Number(args[3])},${Number(args[4])}`,
      ),
    setLineDash: (segments: number[]) => ops.push(`setLineDash:${segments.join(',')}`),
    save: () => ops.push('save'),
    restore: () => ops.push('restore'),
    translate: () => ops.push('translate'),
    scale: () => ops.push('scale'),
    globalAlpha: 1,
    lineWidth: 0,
  };
  let stroke = '';
  let fill = '';
  Object.defineProperties(ctx, {
    strokeStyle: {
      get: () => stroke,
      set: (value: string) => {
        stroke = value;
        ops.push(`strokeStyle:${value}`);
      },
    },
    fillStyle: {
      get: () => fill,
      set: (value: string) => {
        fill = value;
        ops.push(`fillStyle:${value}`);
      },
    },
  });
  return ctx as unknown as CanvasRenderingContext2D;
}

describe('drawStickerBoard', () => {
  it('tints the whole field with the skin accent when no backdrop art is loaded', () => {
    const ops: string[] = [];
    drawStickerBoard(
      fakeContext(ops),
      boardLayout(),
      [false, false, false],
      new Map(),
      null,
      '#5ea7d8',
    );
    expect(ops).toContain(`fillRect:0,0,${FIELD_WIDTH},${FIELD_HEIGHT}`);
  });

  it('paints loaded art on earned cells and keeps unearned slots ghosted', () => {
    const ops: string[] = [];
    drawStickerBoard(
      fakeContext(ops),
      boardLayout(),
      [true, true, false],
      new Map([['num-0', image]]),
      null,
      '#5ea7d8',
    );
    // Only the earned cell that has art is painted as an image; the earned cell
    // without art falls back to a solid seal, the unearned slot stays dashed.
    expect(ops.filter((op) => op.startsWith('drawImage'))).toHaveLength(1);
    expect(ops).toContain('stroke');
    expect(ops).toContain('setLineDash:10,8');
  });

  it('paints the backdrop instead of the tint when backdrop art is loaded', () => {
    const ops: string[] = [];
    const backdrop = { naturalWidth: 200, naturalHeight: 100 } as unknown as HTMLImageElement;
    drawStickerBoard(fakeContext(ops), boardLayout(), [false, false, false], new Map(), backdrop);
    expect(ops.filter((op) => op.startsWith('drawImage'))).toHaveLength(1);
    expect(ops).not.toContain(`fillRect:0,0,${FIELD_WIDTH},${FIELD_HEIGHT}`);
  });
});

describe('drawStickerPop', () => {
  const cell = { x: 100, y: 200, radius: 48 };

  it('bursts ten sparkles and springs the art past the cell size', () => {
    const ops: string[] = [];
    drawStickerPop(fakeContext(ops), cell, image, stickerPopFrame(300));
    expect(ops.filter((op) => op === 'arc')).toHaveLength(10);
    const drawn = ops.find((op) => op.startsWith('drawImage')) ?? '';
    const [, , width] = drawn.split(':')[1]?.split(',').map(Number) ?? [];
    expect(width ?? 0).toBeGreaterThan(cell.radius * 2.1);
  });

  it('keeps an edge-cell pop fully on-field', () => {
    const ops: string[] = [];
    const edge = { radius: 48, x: 50, y: 255 };
    drawStickerPop(fakeContext(ops), edge, image, stickerPopFrame(320));
    const drawn = ops.find((op) => op.startsWith('drawImage')) ?? '';
    const [x, y, width, height] = drawn.split(':')[1]?.split(',').map(Number) ?? [];
    expect(x ?? -1).toBeGreaterThanOrEqual(0);
    expect(y ?? -1).toBeGreaterThanOrEqual(0);
    expect((x ?? 0) + (width ?? 0)).toBeLessThanOrEqual(FIELD_WIDTH);
    expect((y ?? 0) + (height ?? 0)).toBeLessThanOrEqual(FIELD_HEIGHT);
  });

  it('falls back to the gold star when the sticker art is missing', () => {
    const ops: string[] = [];
    drawStickerPop(fakeContext(ops), cell, null, stickerPopFrame(300));
    expect(ops.filter((op) => op.startsWith('drawImage'))).toHaveLength(0);
    expect(ops).toContain('translate');
    expect(ops).toContain('scale');
    expect(ops).toContain('closePath');
  });

  it('skips the sparkle burst once the frame has settled', () => {
    const ops: string[] = [];
    drawStickerPop(fakeContext(ops), cell, null, stickerPopFrame(900));
    expect(ops).not.toContain('arc');
  });
});

// Gate fixture: the shape and scale splashLayout produces for the reference
// field (the exact geometry is pinned in src/ui/menu.test.ts), so the painter
// tests assert behaviour rather than re-deriving layout maths.
const GATE_EMBLEM = 94.6;
const GATE_LAYOUT: SplashLayout = {
  arcStartAngle: -Math.PI / 2,
  arcWidth: 14,
  centerX: FIELD_WIDTH / 2,
  centerY: FIELD_HEIGHT / 2,
  emblemRadius: GATE_EMBLEM,
  mascotRadius: GATE_EMBLEM * 0.86,
  ringRadius: GATE_EMBLEM * 1.35,
  ringWidth: 10,
  tracerRadius: GATE_EMBLEM * 0.3,
};
const ACCENT = '#8ecae6';

function fmt(value: number): string {
  return String(Number(value.toFixed(3)));
}

/** Arc calls made at the trace-ring radius, in draw order. */
function ringArcs(
  arcs: readonly string[],
  layout: SplashLayout,
): { readonly start: number; readonly end: number }[] {
  return arcs
    .map((entry) => entry.split(',').map(Number))
    .filter((entry) => fmt(entry[2] ?? Number.NaN) === fmt(layout.ringRadius))
    .map((entry) => ({ start: entry[3] ?? 0, end: entry[4] ?? 0 }));
}

function sweepOf(entry: { readonly start: number; readonly end: number } | undefined): number {
  return (entry?.end ?? 0) - (entry?.start ?? 0);
}

/** Arc calls that used `radius`, so a painter's own circles can be counted. */
function arcsAt(arcs: readonly string[], radius: number): readonly string[] {
  return arcs.filter((entry) => fmt(Number(entry.split(',')[2])) === fmt(radius));
}

describe('drawGate', () => {
  it('fills the traced path strictly proportionally to progress', () => {
    const quarterArcs: string[] = [];
    drawGate(fakeContext([], quarterArcs), 0, GATE_LAYOUT, 0.25, ACCENT);
    const quarter = ringArcs(quarterArcs, GATE_LAYOUT);
    expect(quarter).toHaveLength(2);
    expect(sweepOf(quarter[0])).toBeCloseTo(Math.PI * 2, 3);
    expect(sweepOf(quarter[1])).toBeCloseTo(Math.PI / 2, 3);

    const halfArcs: string[] = [];
    drawGate(fakeContext([], halfArcs), 0, GATE_LAYOUT, 0.5, ACCENT);
    const half = ringArcs(halfArcs, GATE_LAYOUT);
    expect(sweepOf(half[1])).toBeCloseTo(2 * sweepOf(quarter[1]), 3);
  });

  it('draws an empty path at zero and a complete circle at full', () => {
    const emptyArcs: string[] = [];
    drawGate(fakeContext([], emptyArcs), 0, GATE_LAYOUT, 0, ACCENT);
    expect(ringArcs(emptyArcs, GATE_LAYOUT)).toHaveLength(1);

    const fullArcs: string[] = [];
    drawGate(fakeContext([], fullArcs), 0, GATE_LAYOUT, 1, ACCENT);
    const full = ringArcs(fullArcs, GATE_LAYOUT);
    expect(full).toHaveLength(2);
    expect(sweepOf(full[1])).toBeCloseTo(Math.PI * 2, 3);
  });

  it('paints the waiting mascot in the skin accent with no image or text', () => {
    const ops: string[] = [];
    const arcs: string[] = [];
    drawGate(fakeContext(ops, arcs), 0, GATE_LAYOUT, 0.42, ACCENT);

    expect(ops).toContain(`fillStyle:${ACCENT}`);
    expect(ops.filter((op) => op.startsWith('drawImage'))).toHaveLength(0);
    expect(ops).not.toContain('fillText');
    expect(arcsAt(arcs, GATE_LAYOUT.mascotRadius)).toHaveLength(1);
  });

  it('breathes the mascot while the ring geometry stays put', () => {
    const stillArcs: string[] = [];
    drawGate(fakeContext([], stillArcs), 0, GATE_LAYOUT, 0.42, ACCENT);
    const awakeArcs: string[] = [];
    drawGate(fakeContext([], awakeArcs), (350 * Math.PI) / 2, GATE_LAYOUT, 0.42, ACCENT);

    expect(arcsAt(stillArcs, GATE_LAYOUT.mascotRadius)).toHaveLength(1);
    expect(arcsAt(awakeArcs, GATE_LAYOUT.mascotRadius)).toHaveLength(0);
    expect(ringArcs(awakeArcs, GATE_LAYOUT)).toEqual(ringArcs(stillArcs, GATE_LAYOUT));
  });

  it('draws the mascot standalone when no character art is available', () => {
    const ops: string[] = [];
    const arcs: string[] = [];
    drawDrawnMascot(fakeContext(ops, arcs), { x: 120, y: 240 }, 60, ACCENT);

    expect(arcsAt(arcs, 60)).toHaveLength(1);
    expect(ops).toContain(`fillStyle:${ACCENT}`);
    expect(ops.filter((op) => op.startsWith('drawImage'))).toHaveLength(0);
    expect(ops).not.toContain('fillText');
  });

  it('keeps the splash identity: dashed trace ring plus the centred star', () => {
    const ops: string[] = [];
    const arcs: string[] = [];
    drawSplash(fakeContext(ops, arcs), 0, GATE_LAYOUT);

    expect(ops).toContain('setLineDash:4,18');
    expect(ringArcs(arcs, GATE_LAYOUT)).toHaveLength(1);
    expect(ops).toContain('closePath');
    expect(ops).toContain(`fillStyle:${GOLD}`);
  });
});
