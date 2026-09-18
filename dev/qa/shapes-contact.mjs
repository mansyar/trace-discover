// Throwaway QA: contact sheet of every shipped shapes asset for owner approval.
// Dev-only labels (this sheet never ships). Delete after use.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'dev', 'art-src', 'shapes', 'out');

const TILES = [];
for (let i = 1; i <= 8; i++) {
  TILES.push({ label: `goal shape-${i}`, file: `goal-shape-${i}.png` });
}
for (let i = 1; i <= 8; i++) {
  TILES.push({ label: `sticker shape-${i}`, file: `sticker-shape-${i}.png` });
}
TILES.push({ label: 'shapes-badge', file: 'shapes-badge.png' });
TILES.push({ label: 'card-shapes', file: 'card-shapes.png' });

async function launch() {
  try {
    return await chromium.launch({ channel: 'msedge', headless: true });
  } catch {
    return await chromium.launch({
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      headless: true,
    });
  }
}

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const payload = TILES.map((t) => ({
  ...t,
  b64: 'data:image/png;base64,' + fs.readFileSync(path.join(OUT, t.file)).toString('base64'),
}));
const dataUrl = await page.evaluate(async (tiles) => {
  const load = (u) =>
    new Promise((ok, bad) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => bad(new Error(`img fail ${u}`));
      i.src = u;
    });
  const images = await Promise.all(tiles.map((t) => load(t.b64)));
  const cell = 240;
  const cols = 6;
  const rows = Math.ceil(tiles.length / cols);
  const c = document.createElement('canvas');
  c.width = cols * cell;
  c.height = rows * cell;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, c.width, c.height);
  g.imageSmoothingQuality = 'high';
  images.forEach((img, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * cell;
    const y = row * cell;
    const s = Math.min((cell - 20) / img.width, (cell - 44) / img.height);
    const w = img.width * s;
    const h = img.height * s;
    g.drawImage(img, x + (cell - w) / 2, y + 10, w, h);
    g.fillStyle = '#333333';
    g.font = '13px sans-serif';
    g.textAlign = 'center';
    g.fillText(tiles[i].label, x + cell / 2, y + cell - 10);
  });
  return c.toDataURL('image/png');
}, payload);
fs.writeFileSync(path.join(ROOT, 'dev', 'qa', 'out', 'shapes-contact.png'), Buffer.from(dataUrl.split(',')[1], 'base64'));
console.log('wrote dev/qa/out/shapes-contact.png');
await browser.close();
