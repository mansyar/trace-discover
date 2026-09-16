import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Smoke: teddy.riv loads in the real app runtime (canvas-lite) and its celebrate
// trigger fires through a fully traced level. Usage: node dev/qa/qa-teddy.mjs
// (dev server on :5199; teddy.riv shipped at public/rive/teddy.riv).
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:5199';
const OUT = path.join(HERE, 'out', 'teddy');
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

await page.goto(`${BASE}/dev/harness/play.html?level=pre-2&char=teddy`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__qa !== undefined, null, { timeout: 60000 });
await wait(1500);
await page.screenshot({ path: path.join(OUT, 'idle.png') });
logs.push('idle: captured');

const trace = await page.evaluate(() => {
  const { field, path } = window.__qa;
  const pts = path.filter((_, i) => i % 4 === 0);
  const last = path[path.length - 1];
  if (last) pts.push(last);
  return { field, pts };
});
await tracePath(trace.pts, trace.field);

try {
  await page.waitForFunction(() => window.__qa.stage() === 'hop', null, { timeout: 15000 });
  await wait(250);
  await page.screenshot({ path: path.join(OUT, 'hop.png') });
  logs.push('hop: captured');
} catch {
  logs.push('hop: capture skipped');
}

try {
  await page.waitForFunction(() => window.__qa.isSuccess(), null, { timeout: 30000 });
  await wait(900);
  await page.screenshot({ path: path.join(OUT, 'success.png') });
  logs.push('teddy pre-2: TRACE SUCCESS');
} catch {
  const state = await page.evaluate(
    () => document.getElementById('log').textContent.replace(/\n/g, ' | '),
  );
  logs.push(`teddy pre-2: TRACE FAILED -- ${state}`);
}

const logText = await page.evaluate(
  () => document.getElementById('log').textContent.replace(/\n/g, ' | '),
);
logs.push(`log: ${logText}`);
logs.push(`page errors: ${pageErrors.length === 0 ? '(none)' : pageErrors.join(' | ')}`);
console.log(logs.join('\n'));
await browser.close();
