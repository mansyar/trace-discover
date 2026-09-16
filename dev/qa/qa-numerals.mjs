import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Screenshot QA for numerals 0-9: a rest shot per numeral (shape, start star,
// goal placement) plus traced success shots for the multi-stroke hand-over
// cases (4, 8) and the closed-loop case (0).
// Usage: node spike/qa-numerals.mjs (dev server on :5199)
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:5199';
const OUT = path.join(HERE, 'qa', 'numerals');
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const TRACE = new Set(['num-0', 'num-4', 'num-8']);

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
page.on('pageerror', (e) => pageErrors.push(String(e)));
const logs = [];

for (let digit = 0; digit < 10; digit += 1) {
  const id = `num-${digit}`;
  await page.goto(`${BASE}/play.html?level=${id}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__qa !== undefined, null, { timeout: 30000 });
  await wait(700);
  const qa = await page.evaluate(() => ({
    levelId: window.__qa.levelId,
    strokes: window.__qa.strokes.length,
  }));
  await page.screenshot({ path: path.join(OUT, `${id}-rest.png`) });
  logs.push(`${id}: ${qa.levelId === id ? 'rest ok' : 'WRONG LEVEL'} (${qa.strokes} stroke(s))`);

  if (TRACE.has(id)) {
    const trace = await page.evaluate(() => {
      const { field, strokes } = window.__qa;
      const pts = [];
      for (const stroke of strokes) {
        for (let i = 0; i < stroke.length; i += 4) {
          const point = stroke[i];
          if (point) pts.push(point);
        }
        const last = stroke[stroke.length - 1];
        if (last) pts.push(last);
      }
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
    try {
      await page.waitForFunction(() => window.__qa.isSuccess(), null, { timeout: 30000 });
      await wait(900);
      await page.screenshot({ path: path.join(OUT, `${id}-success.png`) });
      logs.push(`${id}: TRACE SUCCESS`);
    } catch {
      const state = await page.evaluate(
        () =>
          `${document.getElementById('log')?.textContent?.replace(/\n/g, ' | ')} stage=${window.__qa.stage()}`,
      );
      logs.push(`${id}: TRACE FAILED -- ${state}`);
      await page.screenshot({ path: path.join(OUT, `${id}-stuck.png`) });
    }
  }
}

logs.push(`page errors: ${pageErrors.length === 0 ? '(none)' : pageErrors.join(' | ')}`);
console.log(logs.join('\n'));
await browser.close();
