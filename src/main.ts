import './style.css';

/**
 * Boot entry point. Deliberately minimal for now — proper canvas sizing and
 * the letterboxed play-field arrive with the shell utilities task.
 */
const canvas = document.querySelector<HTMLCanvasElement>('.game-canvas');

if (canvas === null) {
  throw new Error('Game canvas element is missing from the document.');
}

const context = canvas.getContext('2d');

if (context !== null) {
  context.fillStyle = '#f6e3b8';
  context.fillRect(0, 0, canvas.width, canvas.height);
}
