import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Production pack-flow QA: splash -> menu -> pack -> numeral -> success ->
// next chain -> home, tracing numerals 3 (single), 4 (two strokes) and
// 8 (crossing loops) with a simulated fingertip.
// Usage: `pnpm exec vite --port 5199 --strictPort` then `node dev/qa/qa-pack-app.mjs`.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:5199';
const OUT = path.join(HERE, 'out');
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (line) => console.log(line);
const pageErrors = [];

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
page.on('pageerror', (err) => pageErrors.push(String(err)));

const screenOf = () => page.evaluate(() => ({ ...window.__app.screen() }));
const tapTarget = async (id) => {
  const pt = await page.evaluate((targetId) => {
    const hit = window.__app.targets().find((t) => t.id === targetId);
    if (!hit) return null;
    const f = window.__app.field();
    return { x: f.x + (hit.x / 430) * f.width, y: f.y + (hit.y / 860) * f.height };
  }, id);
  if (!pt) throw new Error(`target missing: ${id}`);
  await page.mouse.click(pt.x, pt.y);
  await wait(400);
};

const traceStrokes = async (id) => {
  await page.waitForFunction(() => window.__app.strokes().length > 0, null, { timeout: 30000 });
  const data = await page.evaluate(() => {
    const field = window.__app.field();
    const strokes = window.__app.strokes().map((stroke) => {
      const pts = stroke.filter((_, i) => i % 4 === 0);
      pts.push(stroke[stroke.length - 1]);
      return pts;
    });
    return { field, strokes };
  });
  const toClient = (p) => ({
    x: data.field.x + (p.x / 430) * data.field.width,
    y: data.field.y + (p.y / 860) * data.field.height,
  });
  for (const pts of data.strokes) {
    const first = toClient(pts[0]);
    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    for (const p of pts.slice(1)) {
      const c = toClient(p);
      await page.mouse.move(c.x, c.y, { steps: 2 });
      await wait(60);
    }
    const goal = toClient(pts[pts.length - 1]);
    for (let i = 0; i < 6; i += 1) {
      await page.mouse.move(goal.x, goal.y);
      await wait(120);
    }
    await page.mouse.up();
    await wait(250);
  }
  await page.waitForFunction(() => window.__app.success(), null, { timeout: 30000 });
  await wait(1800);
  await page.screenshot({ path: path.join(OUT, `pack-app-${id}-success.png`) });
};

await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__app && window.__app.screen, null, { timeout: 30000 });
await wait(800);
await tapTarget('splash');
log(`splash -> ${(await screenOf()).name}`);
await page.screenshot({ path: path.join(OUT, 'pack-app-menu.png') });

await tapTarget('pack:numbers');
log(`menu -> ${(await screenOf()).name}`);
await wait(400);
await page.screenshot({ path: path.join(OUT, 'pack-app-pack.png') });

// num-3: single stroke; Next should open num-4.
await tapTarget('level:num-3');
try {
  await traceStrokes('num-3');
  log('num-3: TRACE SUCCESS');
} catch {
  log('num-3: TRACE FAILED');
  await page.screenshot({ path: path.join(OUT, 'pack-app-num-3-stuck.png') });
}
await tapTarget('success:next');
let screen = await screenOf();
log(`num-3 next -> ${JSON.stringify(screen)}`);

// num-4 already open: two-stroke hand-over; Next advances to num-5.
try {
  await traceStrokes('num-4');
  log('num-4: TRACE SUCCESS');
} catch {
  log('num-4: TRACE FAILED');
  await page.screenshot({ path: path.join(OUT, 'pack-app-num-4-stuck.png') });
}
await tapTarget('success:home');
log(`num-4 home -> ${(await screenOf()).name}`);

// Back on the pack screen: open the crossing num-8; Next advances to num-9.
await tapTarget('level:num-8');
try {
  await traceStrokes('num-8');
  log('num-8: TRACE SUCCESS');
} catch {
  log('num-8: TRACE FAILED');
  await page.screenshot({ path: path.join(OUT, 'pack-app-num-8-stuck.png') });
}
await tapTarget('success:next');
screen = await screenOf();
log(`num-8 next -> ${JSON.stringify(screen)}`);

// num-9 is open via Next: finish it to exit through home.
try {
  await traceStrokes('num-9');
  log('num-9: TRACE SUCCESS');
} catch {
  log('num-9: TRACE FAILED');
  await page.screenshot({ path: path.join(OUT, 'pack-app-num-9-stuck.png') });
}
await tapTarget('success:home');
log(`home -> ${(await screenOf()).name}`);
await page.screenshot({ path: path.join(OUT, 'pack-app-pack-after.png') });

const save = await page.evaluate(() => localStorage.getItem('trace-discover-save-v1'));
log(`save: ${save}`);
log(`page errors: ${pageErrors.length ? pageErrors.join(' ; ') : '(none)'}`);
await browser.close();
