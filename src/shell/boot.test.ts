import { describe, expect, it, vi } from 'vitest';
import {
  BACKGROUND_COLOR,
  bootGame,
  renderCanvas,
  require2dContext,
  requireCanvas,
  type Viewport,
} from './boot';

/*
 * The stubs below mirror only the small slice of the DOM that boot touches.
 * Casts go through `unknown` because the real DOM interfaces are far heavier
 * than the stubs — justified: boot logic is being tested, not the DOM.
 */
function fakeContext(): { context: CanvasRenderingContext2D; fillRect: ReturnType<typeof vi.fn> } {
  const fillRect = vi.fn();
  const context = { fillStyle: '', fillRect } as unknown as CanvasRenderingContext2D;

  return { context, fillRect };
}

function fakeCanvas(context: CanvasRenderingContext2D | null): HTMLCanvasElement {
  return { width: 0, height: 0, getContext: () => context } as unknown as HTMLCanvasElement;
}

function fakeRoot(canvas: HTMLCanvasElement | null): Pick<Document, 'querySelector'> {
  return { querySelector: () => canvas } as unknown as Pick<Document, 'querySelector'>;
}

function fakeViewport(): {
  viewport: Viewport;
  listeners: Array<() => void>;
  metrics: { devicePixelRatio: number; innerHeight: number; innerWidth: number };
} {
  const listeners: Array<() => void> = [];
  const metrics = { devicePixelRatio: 2, innerHeight: 860, innerWidth: 430 };
  const viewport = Object.assign(metrics, {
    addEventListener: (type: string, listener: () => void) => {
      if (type === 'resize') {
        listeners.push(listener);
      }
    },
  }) as unknown as Viewport;

  return { viewport, listeners, metrics };
}

describe('requireCanvas', () => {
  it('returns the canvas found in the root', () => {
    const canvas = fakeCanvas(null);

    expect(requireCanvas(fakeRoot(canvas))).toBe(canvas);
  });

  it('throws when the canvas is missing', () => {
    expect(() => requireCanvas(fakeRoot(null))).toThrow('Game canvas element is missing');
  });
});

describe('require2dContext', () => {
  it('returns the 2D context of the canvas', () => {
    const { context } = fakeContext();

    expect(require2dContext(fakeCanvas(context))).toBe(context);
  });

  it('throws when the 2D context is unavailable', () => {
    expect(() => require2dContext(fakeCanvas(null))).toThrow('Canvas 2D context is unavailable');
  });
});

describe('renderCanvas', () => {
  it('sizes the backing store by device pixel ratio and paints the background', () => {
    const { context, fillRect } = fakeContext();
    const canvas = fakeCanvas(context);

    renderCanvas(canvas, context, { devicePixelRatio: 2, innerHeight: 860, innerWidth: 430 });

    expect(canvas.width).toBe(860);
    expect(canvas.height).toBe(1720);
    expect(context.fillStyle).toBe(BACKGROUND_COLOR);
    expect(fillRect).toHaveBeenCalledWith(0, 0, 860, 1720);
  });
});

describe('bootGame', () => {
  it('renders immediately and registers a single resize listener', () => {
    const { context } = fakeContext();
    const canvas = fakeCanvas(context);
    const { viewport, listeners } = fakeViewport();

    bootGame(fakeRoot(canvas), viewport);

    expect(canvas.width).toBe(860);
    expect(listeners).toHaveLength(1);
  });

  it('re-renders with the new size when the viewport changes', () => {
    const { context } = fakeContext();
    const canvas = fakeCanvas(context);
    const { viewport, listeners, metrics } = fakeViewport();

    bootGame(fakeRoot(canvas), viewport);
    metrics.innerWidth = 800;
    listeners[0]?.();

    expect(canvas.width).toBe(1600);
  });

  it('throws when the canvas is missing', () => {
    const { viewport } = fakeViewport();

    expect(() => bootGame(fakeRoot(null), viewport)).toThrow('Game canvas element is missing');
  });
});
