import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Production app-loop QA: drives the real index.html from splash to pack badge
// to the bonus circles for the pre-writing pack, tracing each level with a
// simulated fingertip.
// Usage: `pnpm serve` (preview on 4173) then `node dev/qa/qa-app.mjs [url]`.
const BASE = process.argv[2] ?? 'http://localhost:4173';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out', 'qa-app');
fs.mkdirSync(OUT, { recursive: true });
const MAINS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const logs = [];
const log = (line) => {
  logs.push(line);
  console.log(line);
};
const pageErrors = [];
let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
} catch (e) {
  browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
  });
}

const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
page.on('pageerror', (err) => pageErrors.push(String(err)));

const screenOf = () =>
  page.evaluate(() => ({ name: window.__app.screen().name, ...(window.__app.screen() ?? {}) }));
const tapTarget = async (id) => {
  const pt = await page.evaluate((targetId) => {
    const hit = window.__app.targets().find((t) => t.id === targetId);
    if (!hit) return null;
    const f = window.__app.field();
    return {
      x: f.x + (hit.x / 430) * f.width,
      y: f.y + (hit.y / 860) * f.height,
    };
  }, id);
  if (!pt) throw new Error(`target missing: ${id}`);
  await page.mouse.click(pt.x, pt.y);
  await wait(400);
};
const traceLevel = async (id) => {
  await page.waitForFunction(() => window.__app.path().length > 10, null, { timeout: 30000 });
  const trace = await page.evaluate(() => {
    const field = window.__app.field();
    const path = window.__app.path();
    const pts = path.filter((_, i) => i % 4 === 0);
    pts.push(path[path.length - 1]);
    return { field, pts };
  });
  const toClient = (p) => ({
    x: trace.field.x + (p.x / 430) * trace.field.width,
    y: trace.field.y + (p.y / 860) * trace.field.height,
  });
  const first = toClient(trace.pts[0]);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  for (const p of trace.pts.slice(1)) {
    const c = toClient(p);
    await page.mouse.move(c.x, c.y, { steps: 2 });
    await wait(60);
  }
  const goal = toClient(trace.pts[trace.pts.length - 1]);
  for (let i = 0; i < 6; i += 1) {
    await page.mouse.move(goal.x, goal.y);
    await wait(120);
  }
  await page.mouse.up();
  await page.waitForFunction(() => window.__app.success(), null, { timeout: 30000 });
  await wait(1800); // completion choreography + mascot glide to its cheering spot
  await page.screenshot({ path: `${OUT}/${id}-success.png` });
};

await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__app && window.__app.screen, null, { timeout: 30000 });
await wait(800);
await page.screenshot({ path: `${OUT}/splash.png` });
await tapTarget('splash');
log(`splash -> ${(await screenOf()).name}`);
await page.screenshot({ path: `${OUT}/menu.png` });

await tapTarget('pack:pre');
log(`menu -> ${(await screenOf()).name}`);
await page.screenshot({ path: `${OUT}/pack-pre.png` });
for (const n of MAINS) {
  const id = `pre-${n}`;
  const opened = await screenOf();
  if (opened.name !== 'level' || opened.levelId !== id) {
    if (opened.name === 'pack') {
      await tapTarget(`level:${id}`);
    } else {
      log(`${id}: DID NOT OPEN (${opened.name} ${opened.levelId ?? ''})`);
      continue;
    }
  }
  try {
    await traceLevel(id);
    log(`${id}: TRACE SUCCESS`);
  } catch (e) {
    log(`${id}: TRACE FAILED`);
    await page.screenshot({ path: `${OUT}/${id}-stuck.png` });
  }
  await tapTarget('success:next');
  await wait(300);
}
log(`after L12 next -> ${(await screenOf()).name}`);
await page.screenshot({ path: `${OUT}/badge-pre.png` });
await tapTarget('badge:seal');
log(`seal -> ${(await screenOf()).name}`);
for (const n of ['1', '2', '3']) {
  const id = `pre-bonus-${n}`;
  try {
    await traceLevel(id);
    log(`${id}: TRACE SUCCESS`);
  } catch (e) {
    log(`${id}: TRACE FAILED`);
    await page.screenshot({ path: `${OUT}/${id}-stuck.png` });
  }
  await tapTarget(n === '3' ? 'success:home' : 'success:next');
  await wait(300);
}
log(`pack done -> ${(await screenOf()).name}`);
await page.screenshot({ path: `${OUT}/pack-pre-done.png` });
// The pack badge spot re-opens the first unlocked circle (v1 parity).
await tapTarget('pack:badge');
log(`badge re-entry -> ${JSON.stringify(await screenOf())}`);

const saved = await page.evaluate(() => localStorage.getItem('trace-discover-save-v1'));
log(`save: ${saved}`);
log(`page errors: ${pageErrors.length ? pageErrors.join(' ; ') : '(none)'}`);
await browser.close();
