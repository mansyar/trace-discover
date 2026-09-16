// tools/pre-sheet.mjs — review contact sheet: the 15 pre-writing rewards +
// badge + card in one image. usage: node dev/tools/pre-sheet.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const GEN = resolve(fileURLToPath(new URL('../gen', import.meta.url)));

const files = [
  'goal/pre-1.png',
  'goal/pre-2.png',
  'goal/pre-3.png',
  'goal/pre-4.png',
  'goal/pre-5.png',
  'goal/pre-6.png',
  'goal/pre-7.png',
  'goal/pre-8.png',
  'goal/pre-9.png',
  'goal/pre-10.png',
  'goal/pre-11.png',
  'goal/pre-12.png',
  'goal/pre-bonus-1.png',
  'goal/pre-bonus-2.png',
  'goal/pre-bonus-3.png',
  'pack/pre-badge.png',
];

const payload = files.map((f) => ({
  name: f,
  b64: 'data:image/png;base64,' + readFileSync(resolve(ROOT, 'public', 'art', f)).toString('base64'),
}));

let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
} catch {
  browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
  });
}
const page = await browser.newPage();
await page.setContent('<!doctype html><html><body></body></html>');
const sheet = await page.evaluate(async (items) => {
  const load = (u) =>
    new Promise((ok, bad) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = bad;
      i.src = u;
    });
  const cell = 256;
  const cols = 4;
  const rows = 4;
  const canvas = document.createElement('canvas');
  canvas.width = cell * cols;
  canvas.height = cell * rows;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f6e3b8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < items.length; index++) {
    const img = await load(items[index].b64);
    const x = (index % cols) * cell;
    const y = Math.floor(index / cols) * cell;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 6, y + 6, cell - 12, cell - 12);
    const scale = (cell - 24) / Math.max(img.width, img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, x + (cell - w) / 2, y + (cell - h) / 2, w, h);
  }
  return canvas.toDataURL('image/png').split(',')[1];
}, payload);
mkdirSync(GEN, { recursive: true });
writeFileSync(resolve(GEN, 'pre-sheet.png'), Buffer.from(sheet, 'base64'));
console.log('sheet -> dev/gen/pre-sheet.png');
await browser.close();
