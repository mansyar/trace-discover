import './style.css';
import { computeBackingSize } from './shell/layout';

function requireCanvas(): HTMLCanvasElement {
  const canvas = document.querySelector<HTMLCanvasElement>('.game-canvas');

  if (canvas === null) {
    throw new Error('Game canvas element is missing from the document.');
  }

  return canvas;
}

function require2dContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d');

  if (context === null) {
    throw new Error('Canvas 2D context is unavailable.');
  }

  return context;
}

const canvas = requireCanvas();
const context = require2dContext(canvas);

function render(): void {
  const { devicePixelRatio, innerHeight, innerWidth } = window;
  const size = computeBackingSize(innerWidth, innerHeight, devicePixelRatio);

  canvas.width = size.width;
  canvas.height = size.height;
  context.fillStyle = '#f6e3b8';
  context.fillRect(0, 0, size.width, size.height);
}

window.addEventListener('resize', render);

render();
