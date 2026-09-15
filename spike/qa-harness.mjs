import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Smoke: multi-stroke harness migration — v1 levels still trace to success in
// play.html through the multi pipeline, and tune.html?strokes=2 completes
// across a two-stroke hand-over. Usage: node spike/qa-harness.mjs (dev server on :5199)
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:5199';
const OUT = path.join(HERE, 'qa');
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const logs = [];

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
page.on('pageerror', (error) => pageErrors.push(String(error)));

async function tracePath(points, field, goalDwell = 8) {
  const toClient = (p) => ({
    x: field.x + (p.x / 430) * field.width,
    y: field.y + (p.y / 860) * field.height,
  });
  const first = toClient(points[0]);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  for (const p of points.slice(1)) {
    const c = toClient(p);
    await page.mouse.move(c.x, c.y, { steps: 2 });
    await wait(50);
  }
  const goal = toClient(points[points.length - 1]);
  for (let i = 0; i < goalDwell; i += 1) {
    await page.mouse.move(goal.x, goal.y);
    await wait(120);
  }
  await page.mouse.up();
}

// --- play.html: v1 levels full trace through the migrated pipeline ---
for (const id of ['dino-2', 'dino-bonus']) {
  await page.goto(`${BASE}/play.html?level=${id}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__qa !== undefined, null, { timeout: 30000 });
  await wait(600);
  const trace = await page.evaluate(() => {
    const { field, path } = window.__qa;
    const pts = path.filter((_, i) => i % 4 === 0);
    const last = path[path.length - 1];
    if (last) pts.push(last);
    return { field, pts };
  });
  await tracePath(trace.pts, trace.field);
  try {
    await page.waitForFunction(() => window.__qa.isSuccess(), null, { timeout: 30000 });
    await wait(900);
    await page.screenshot({ path: path.join(OUT, `multi-${id}-success.png`) });
    logs.push(`${id}: TRACE SUCCESS`);
  } catch {
    const state = await page.evaluate(
      () => document.getElementById('log').textContent.replace(/\n/g, ' | '),
    );
    logs.push(`${id}: TRACE FAILED -- ${state}`);
  }
}

// --- tune.html?strokes=2: S-curve then loop hand-over on one finger pass ---
await page.goto(`${BASE}/tune.html?strokes=2`, { waitUntil: 'load' });
await page.waitForFunction(
  () => document.getElementById('log').textContent.includes('harness ready'),
  null,
  { timeout: 30000 },
);
await wait(400);
// tune field for viewport 430x900: fitRect letterboxes 430x860 with 20px top offset.
const FIELD = { x: 0, y: 20, width: 430, height: 860 };
const CP = [
  { x: 90, y: 150 },
  { x: 230, y: 230 },
  { x: 140, y: 420 },
  { x: 300, y: 520 },
  { x: 200, y: 700 },
  { x: 340, y: 780 },
];
const seg = (a, b, n) =>
  Array.from({ length: n }, (_, i) => ({
    x: a.x + ((b.x - a.x) * i) / (n - 1),
    y: a.y + ((b.y - a.y) * i) / (n - 1),
  }));
const curve = [];
for (let i = 0; i < CP.length - 1; i += 1) {
  curve.push(...seg(CP[i], CP[i + 1], 20));
}
const ring = Array.from({ length: 65 }, (_, i) => {
  const angle = (Math.PI * 2 * i) / 64;
  return { x: 300 + Math.cos(angle) * 80, y: 620 + Math.sin(angle) * 80 };
});
await tracePath([...curve, ...ring], FIELD, 8);
try {
  await page.waitForFunction(
    () => document.getElementById('log').textContent.includes('complete!'),
    null,
    { timeout: 20000 },
  );
  await page.screenshot({ path: path.join(OUT, 'multi-tune-2strokes-success.png') });
  logs.push('tune 2 strokes: COMPLETE');
} catch {
  const state = await page.evaluate(
    () => document.getElementById('log').textContent.replace(/\n/g, ' | '),
  );
  logs.push(`tune 2 strokes: FAILED -- ${state}`);
}

logs.push(`page errors: ${pageErrors.length === 0 ? '(none)' : pageErrors.join(' | ')}`);
console.log(logs.join('\n'));
await browser.close();
