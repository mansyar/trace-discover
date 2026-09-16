// QA probe: My Name end-to-end gate — fresh 3-card menu -> two-finger parent
// gate -> name overlay -> save -> 4-card menu -> mini-pack -> trace -> sticker
// + badge -> reload persistence -> clear -> 3 cards. Screenshots under out/name.
// Usage: `pnpm build && pnpm preview` (4173) then `node dev/qa/qa-name.mjs [url]`.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.argv[2] ?? 'http://localhost:4173';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out', 'name');
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

const page = await browser.newPage({
  hasTouch: true,
  viewport: { width: 430, height: 900 },
});
const pageErrors = [];
page.on('pageerror', (err) => pageErrors.push(String(err)));

const fail = (message) => {
  throw new Error(`ASSERT: ${message}`);
};
const screenOf = () => page.evaluate(() => window.__app.screen());
const targetIds = () => page.evaluate(() => window.__app.targets().map((t) => t.id));
const shot = (name) => page.screenshot({ path: path.join(OUT, name) });

const tapTarget = async (id) => {
  const pt = await page.evaluate((targetId) => {
    const hit = window.__app.targets().find((t) => t.id === targetId);
    if (!hit) return null;
    const f = window.__app.field();
    return { x: f.x + (hit.x / 430) * f.width, y: f.y + (hit.y / 860) * f.height };
  }, id);
  if (!pt) fail(`target missing: ${id}`);
  await page.mouse.click(pt.x, pt.y);
  await wait(450);
};

const holdGate = async () => {
  await page.evaluate(() => {
    const canvas = document.querySelector('.game-canvas');
    const field = window.__app.field();
    const gate = window.__app.targets().find((target) => target.id === 'gate');
    if (!canvas || !gate) {
      throw new Error('missing gate target');
    }
    const clientX = field.x + (gate.x / 430) * field.width;
    const clientY = field.y + (gate.y / 860) * field.height;
    for (const pointerId of [11, 12]) {
      canvas.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          clientX,
          clientY,
          isPrimary: pointerId === 11,
          pointerId,
          pointerType: 'touch',
        }),
      );
    }
  });
  await wait(3600);
};

const trace = async () => {
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
};

await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
await page.evaluate(() => localStorage.removeItem('trace-discover-save-v1'));
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => window.__app && window.__app.screen, null, { timeout: 30000 });
await wait(800);

// 1. Fresh boot: three cards, no name.
await tapTarget('splash');
let ids = await targetIds();
if (ids.includes('pack:name')) fail('name card present on a fresh save');
if (ids.filter((id) => id.startsWith('pack:') && id !== 'pack:home' && id !== 'pack:badge').length !== 3) {
  fail(`expected 3 pack cards, got: ${ids.join(', ')}`);
}
await shot('name-3cards.png');

// 2. Parent gate -> overlay -> save a name.
await holdGate();
let screen = await screenOf();
if (screen.name !== 'parent') fail(`gate hold opened ${screen.name}`);
await tapTarget('parent:name');
ids = await targetIds();
if (!ids.includes('name:save') || !ids.includes('name:cancel')) fail(`overlay targets: ${ids.join(', ')}`);
if (ids.includes('name:clear')) fail('clear button present without a saved name');
await shot('name-overlay-empty.png');
await page.fill('.name-input', 'avi');
await tapTarget('name:save');
await tapTarget('parent:done');
ids = await targetIds();
if (!ids.includes('pack:name')) fail(`name card missing after save: ${ids.join(', ')}`);
await shot('name-4cards.png');
console.log('fresh -> gate -> name saved -> 4 cards');

// 3. Overlay re-entry shows Clear; cancel keeps the name.
await holdGate();
await tapTarget('parent:name');
ids = await targetIds();
if (!ids.includes('name:clear')) fail('clear button missing with a saved name');
await shot('name-overlay-filled.png');
await tapTarget('name:cancel');
await tapTarget('parent:done');
ids = await targetIds();
if (!ids.includes('pack:name')) fail('cancel lost the name');

// 4. Trace the name: mini-pack -> level -> success -> badge.
await tapTarget('pack:name');
screen = await screenOf();
if (screen.name !== 'pack') fail(`pack did not open: ${screen.name}`);
await shot('name-pack.png');
await tapTarget('level:name-1');
screen = await screenOf();
if (screen.name !== 'level' || screen.levelId !== 'name-1') fail(`level did not open: ${JSON.stringify(screen)}`);
const strokeCount = await page.evaluate(() => window.__app.strokes().length);
console.log(`name-1 strokes: ${strokeCount}`);
await wait(600);
await shot('name-level.png');
await trace();
await wait(1800);
await shot('name-success.png');
await tapTarget('success:next');
screen = await screenOf();
if (screen.name !== 'badge') fail(`badge screen missing: ${screen.name}`);
await shot('name-badge.png');
await tapTarget('badge:home');
console.log('trace -> sticker + badge');

// 5. Reload persistence.
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => window.__app && window.__app.screen, null, { timeout: 30000 });
await wait(800);
await tapTarget('splash');
ids = await targetIds();
if (!ids.includes('pack:name')) fail('name card lost after reload');
await shot('name-menu-persisted.png');
const saved = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('trace-discover-save-v1')),
);
if (saved.name !== 'AVI') fail(`stored name: ${saved.name}`);
if (!saved.completedLevels.includes('name-1')) fail('name-1 not completed');
if (!saved.badges.includes('name-badge')) fail('name-badge not awarded');
console.log(`persistence: name=${saved.name} completed=${saved.completedLevels.length} badges=${JSON.stringify(saved.badges)}`);

// 6. Clear: overlay stays open, cancel returns to a 3-card menu.
await holdGate();
await tapTarget('parent:name');
await tapTarget('name:clear');
screen = await screenOf();
if (screen.name !== 'parent') fail('clear dropped the overlay');
ids = await targetIds();
if (ids.includes('name:clear')) fail('clear button still shown after clearing');
await tapTarget('name:cancel');
await tapTarget('parent:done');
ids = await targetIds();
if (ids.includes('pack:name')) fail('name card present after clear');
await shot('name-cleared-3cards.png');
const cleared = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('trace-discover-save-v1')),
);
if (cleared.name !== undefined) fail(`name still stored: ${cleared.name}`);
console.log(`clear -> 3 cards (rewards kept: ${cleared.completedLevels.includes('name-1')})`);

console.log(`page errors: ${pageErrors.length === 0 ? '(none)' : pageErrors.join(' | ')}`);
await browser.close();
if (pageErrors.length > 0) {
  process.exitCode = 1;
}
