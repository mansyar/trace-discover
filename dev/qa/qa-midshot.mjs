import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// QA probe: num-4 mid-level after completing the bar — the next stroke must
// already glow as the one to trace (dots + start star) before it is touched.
// Guards the hand-over guidance fix from the device feel check (Phase 2).
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out');
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
await page.goto('http://localhost:5199/dev/harness/play.html?level=num-4', { waitUntil: 'load' });
await page.waitForFunction(() => window.__qa !== undefined && window.__qa.strokes.length === 2, null, {
  timeout: 30000,
});
const data = await page.evaluate(() => {
  const field = window.__qa.field;
  const stroke = window.__qa.strokes[0];
  const pts = stroke.filter((_, i) => i % 4 === 0);
  pts.push(stroke[stroke.length - 1]);
  return { field, pts };
});
const toClient = (p) => ({
  x: data.field.x + (p.x / 430) * data.field.width,
  y: data.field.y + (p.y / 860) * data.field.height,
});
const first = toClient(data.pts[0]);
await page.mouse.move(first.x, first.y);
await page.mouse.down();
for (const p of data.pts.slice(1)) {
  const c = toClient(p);
  await page.mouse.move(c.x, c.y, { steps: 2 });
  await wait(50);
}
await wait(300);
await page.mouse.up();
await wait(600);
await page.screenshot({ path: path.join(OUT, 'num-4-mid-next-stroke.png') });
console.log('num-4 mid shot saved');
console.log(`page errors: ${pageErrors.length ? pageErrors.join(' ; ') : '(none)'}`);
await browser.close();
