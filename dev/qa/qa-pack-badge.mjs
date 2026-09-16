// Production pack badge QA: completes all ten numerals in order (chain via success
// "next"), expects the badge celebration after the tenth, then opens the collection
// from the seal. Also captures first/last numeral success frames (sticker fly-in).
// Usage: pnpm exec vite --port 5199 --strictPort  then  node dev/qa/qa-pack-badge.mjs
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, 'out');
mkdirSync(OUT, { recursive: true });

const EDGE = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const exe = EDGE.find((p) => existsSync(p));
const browser = await chromium.launch({ channel: 'msedge', executablePath: exe, headless: true });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const errors = [];
page.on('pageerror', (error) => errors.push(String(error)));
const log = (line) => console.log(line);
const NUMERALS = Array.from({ length: 10 }, (_, d) => `num-${d}`);

const screenOf = () => page.evaluate(() => ({ ...window.__app.screen() }));

async function tapTarget(targetId) {
  const hit = await page.evaluate((id) => {
    const target = window.__app.targets().find((t) => t.id === id);
    if (!target) {
      return null;
    }
    const f = window.__app.field();
    return { x: f.x + (target.x / 430) * f.width, y: f.y + (target.y / 860) * f.height };
  }, targetId);
  if (!hit) {
    throw new Error(`target missing: ${targetId}`);
  }
  await page.mouse.click(hit.x, hit.y);
  await page.waitForTimeout(400);
}

async function traceStrokes() {
  await page.waitForFunction(() => window.__app && window.__app.strokes().length > 0, null, {
    timeout: 30000,
  });
  const { field, strokes } = await page.evaluate(() => ({
    field: window.__app.field(),
    strokes: window.__app.strokes().map((stroke) => {
      const pts = stroke.filter((_, i) => i % 4 === 0);
      pts.push(stroke[stroke.length - 1]);
      return pts;
    }),
  }));
  const toClient = (p) => ({
    x: field.x + (p.x / 430) * field.width,
    y: field.y + (p.y / 860) * field.height,
  });
  for (const stroke of strokes) {
    const start = toClient(stroke[0]);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (const point of stroke.slice(1)) {
      const c = toClient(point);
      await page.mouse.move(c.x, c.y, { steps: 2 });
      await page.waitForTimeout(60);
    }
    const goal = toClient(stroke[stroke.length - 1]);
    for (let dwell = 0; dwell < 6; dwell += 1) {
      await page.mouse.move(goal.x, goal.y);
      await page.waitForTimeout(120);
    }
    await page.mouse.up();
    await page.waitForTimeout(250);
  }
}

try {
  await page.goto('http://localhost:5199/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__app && window.__app.screen, null, { timeout: 30000 });
  await tapTarget('splash');
  log(`splash -> ${(await screenOf()).name}`);
  await tapTarget('pack:numbers');
  log(`menu -> ${(await screenOf()).name}`);
  await tapTarget('level:num-0');
  for (const id of NUMERALS) {
    try {
      await traceStrokes();
      await page.waitForFunction(() => window.__app.success(), null, { timeout: 30000 });
      await page.waitForTimeout(1800);
      if (id === 'num-0' || id === 'num-9') {
        await page.screenshot({ path: resolve(OUT, `pack-badge-${id}-success.png`) });
      }
      log(`${id}: TRACE SUCCESS`);
    } catch {
      await page.screenshot({ path: resolve(OUT, `pack-badge-${id}-stuck.png`) });
      log(`${id}: TRACE FAILED`);
      break;
    }
    await tapTarget('success:next');
    log(`next -> ${JSON.stringify(await screenOf())}`);
  }
  const finalScreen = await screenOf();
  if (finalScreen.name === 'badge') {
    await page.screenshot({ path: resolve(OUT, 'pack-badge-celebration.png') });
    log('badge celebration shown');
    await tapTarget('badge:seal');
    log(`seal -> ${JSON.stringify(await screenOf())}`);
    await page.screenshot({ path: resolve(OUT, 'pack-after-badge.png') });
  }
  const save = await page.evaluate(() => localStorage.getItem('trace-discover-save-v1'));
  log(`save: ${save}`);
  log(`page errors: ${errors.length ? errors.join(' | ') : '(none)'}`);
} catch (error) {
  log(`ERROR: ${error}`);
  log(`page errors: ${errors.length ? errors.join(' | ') : '(none)'}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
