// QA probe: My Name art approval set — seeds a save with name AVA, boots to the
// menu, and captures menu / pack (fresh + earned) / level / success / badge
// screens so the owner can approve the sticker + badge art in context.
// Usage: `pnpm exec vite --port 5199 --strictPort` then `node dev/qa/qa-name-art.mjs`.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:5199';
const OUT = path.join(HERE, 'out', 'name-art');
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
} catch {
  browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
  });
}

const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const pageErrors = [];
page.on('pageerror', (err) => pageErrors.push(String(err)));

const screenOf = () => page.evaluate(() => window.__app.screen());

const tapTarget = async (id) => {
  const pt = await page.evaluate((targetId) => {
    const hit = window.__app.targets().find((t) => t.id === targetId);
    if (!hit) return null;
    const f = window.__app.field();
    return { x: f.x + (hit.x / 430) * f.width, y: f.y + (hit.y / 860) * f.height };
  }, id);
  if (!pt) throw new Error(`target missing: ${id}`);
  await page.mouse.click(pt.x, pt.y);
  await wait(450);
};

const traceLevel = async () => {
  await page.waitForFunction(() => window.__app.strokes().length > 0, null, { timeout: 15000 });
  const { field, strokes } = await page.evaluate(() => ({
    field: window.__app.field(),
    strokes: window.__app.strokes().map((points) => {
      const pts = points.filter((_, i) => i % 4 === 0);
      pts.push(points[points.length - 1]);
      return pts;
    }),
  }));
  const toClient = (p) => ({
    x: field.x + (p.x / 430) * field.width,
    y: field.y + (p.y / 860) * field.height,
  });
  for (const stroke of strokes) {
    const first = toClient(stroke[0]);
    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    for (const pt of stroke) {
      const c = toClient(pt);
      await page.mouse.move(c.x, c.y, { steps: 2 });
      await wait(50);
    }
    const last = toClient(stroke[stroke.length - 1]);
    for (let i = 0; i < 6; i++) {
      await page.mouse.move(last.x, last.y, { steps: 1 });
      await wait(100);
    }
    await page.mouse.up();
    await wait(220);
  }
  await page.waitForFunction(() => window.__app.success(), null, { timeout: 45000 });
  await wait(1800);
};

await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
await page.evaluate(() => {
  localStorage.setItem(
    'trace-discover-save-v1',
    JSON.stringify({
      badges: [],
      completedLevels: [],
      name: 'AVA',
      settings: { easierTracing: false, muted: false, skin: 'dino', volume: 1 },
      trophies: [],
      version: 3,
    }),
  );
});
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => window.__app && window.__app.screen, null, { timeout: 30000 });
await wait(800);

await tapTarget('splash');
await page.screenshot({ path: path.join(OUT, 'name-menu.png') });
console.log(`splash -> ${(await screenOf()).name}`);

await tapTarget('pack:name');
await page.screenshot({ path: path.join(OUT, 'name-pack-fresh.png') });
console.log(`menu -> ${(await screenOf()).name}`);

await tapTarget('level:name-1');
await wait(600);
await page.screenshot({ path: path.join(OUT, 'name-level.png') });
console.log(`pack -> ${(await screenOf()).name}`);

await traceLevel();
await page.screenshot({ path: path.join(OUT, 'name-success.png') });
console.log('name-1: TRACE SUCCESS');

await tapTarget('success:next');
await page.screenshot({ path: path.join(OUT, 'name-badge.png') });
console.log(`success -> ${(await screenOf()).name}`);

await tapTarget('badge:home');
await tapTarget('pack:name');
await page.screenshot({ path: path.join(OUT, 'name-pack-earned.png') });
console.log(`badge -> pack -> ${(await screenOf()).name}`);

const saved = await page.evaluate(() => localStorage.getItem('trace-discover-save-v1'));
console.log(`save: ${saved}`);
console.log(`page errors: ${pageErrors.length === 0 ? '(none)' : pageErrors.join(' | ')}`);
await browser.close();
