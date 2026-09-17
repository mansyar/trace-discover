// Painter coverage for the sticker board + pop overlay (Phase 3 track work).
// Mirrors src/render/renderPath.test.ts: a recording stub context asserts the
// primitives each painter emits — there is no real canvas in the node test env.
import { describe, expect, it } from 'vitest';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import { stickerBoardLayout } from '../ui/stickerBoard';
import { drawStickerBoard, drawStickerPop } from './render';
import { stickerPopFrame } from './stickerPop';

const IDS = ['num-0', 'num-1', 'num-2'];
const image = { naturalWidth: 96, naturalHeight: 96 } as unknown as HTMLImageElement;

function boardLayout() {
  return stickerBoardLayout(FIELD_WIDTH, FIELD_HEIGHT, IDS);
}

/** Records every 2D-context call the board/pop painters make. */
function fakeContext(ops: string[]): CanvasRenderingContext2D {
  const ctx = {
    beginPath: () => ops.push('beginPath'),
    moveTo: () => ops.push('moveTo'),
    lineTo: () => ops.push('lineTo'),
    closePath: () => ops.push('closePath'),
    arc: () => ops.push('arc'),
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
    strokeStyle: '',
    fillStyle: '',
  };
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
