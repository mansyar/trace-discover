import { computeBackingSize } from './layout';

/** Page background — matches the cream base of the art style. */
export const BACKGROUND_COLOR = '#f6e3b8';

/** The viewport surface boot needs from the window (narrow, testable). */
export type Viewport = Pick<
  Window,
  'devicePixelRatio' | 'innerHeight' | 'innerWidth' | 'addEventListener'
>;

export function requireCanvas(root: Pick<Document, 'querySelector'>): HTMLCanvasElement {
  const canvas = root.querySelector<HTMLCanvasElement>('.game-canvas');

  if (canvas === null) {
    throw new Error('Game canvas element is missing from the document.');
  }

  return canvas;
}

export function require2dContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d');

  if (context === null) {
    throw new Error('Canvas 2D context is unavailable.');
  }

  return context;
}

/**
 * Sizes the canvas backing store to the viewport and paints the background.
 * Runs on boot and on every viewport change (resize, rotation).
 */
export function renderCanvas(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  viewport: Pick<Window, 'devicePixelRatio' | 'innerHeight' | 'innerWidth'>,
): void {
  const size = computeBackingSize(
    viewport.innerWidth,
    viewport.innerHeight,
    viewport.devicePixelRatio,
  );

  canvas.width = size.width;
  canvas.height = size.height;
  context.fillStyle = BACKGROUND_COLOR;
  context.fillRect(0, 0, size.width, size.height);
}

/**
 * Wires the canvas to the viewport: initial paint plus a resize listener so
 * orientation changes and desktop window resizes stay full-bleed.
 */
export function bootGame(root: Pick<Document, 'querySelector'>, viewport: Viewport): void {
  const canvas = requireCanvas(root);
  const context = require2dContext(canvas);
  const render = (): void => {
    renderCanvas(canvas, context, viewport);
  };

  viewport.addEventListener('resize', render);
  render();
}
