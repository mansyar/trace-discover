import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Screens-harness QA for the pack screen: opens ?screen=pack, taps all ten
// numeral cards, and captures fresh / half / full (badge earned) states.
// Usage: node dev/qa/qa-screens.mjs (dev server on :5199)
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:5199';
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
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(`${BASE}/dev/harness/screens.html?screen=pack`, { waitUntil: 'load' });
await page.waitForFunction(
  () => document.getElementById('log')?.textContent.includes('screens ready'),
  null,
  { timeout: 30000 },
);
await wait(500);
await page.screenshot({ path: path.join(OUT, 'pack-empty.png') });

// Field is letterboxed at (0, 20) in a 430x900 viewport.
const toClient = ({ x, y }) => ({ x, y: y + 20 });
const centers = [
  { x: 160, y: 176 },
  { x: 270, y: 176 },
  { x: 160, y: 286 },
  { x: 270, y: 286 },
  { x: 160, y: 396 },
  { x: 270, y: 396 },
  { x: 160, y: 506 },
  { x: 270, y: 506 },
  { x: 160, y: 616 },
  { x: 270, y: 616 },
];
for (let i = 0; i < 5; i += 1) {
  const c = toClient(centers[i]);
  await page.mouse.click(c.x, c.y);
  await wait(150);
}
await page.screenshot({ path: path.join(OUT, 'pack-half.png') });
for (let i = 5; i < 10; i += 1) {
  const c = toClient(centers[i]);
  await page.mouse.click(c.x, c.y);
  await wait(150);
}
await wait(300);
await page.screenshot({ path: path.join(OUT, 'pack-full.png') });

const logText = await page.evaluate(() => document.getElementById('log')?.textContent ?? '');
const badgeLine = logText.split('\n').find((line) => line.includes('badge earned')) ?? '(none)';
console.log(`badge line: ${badgeLine}`);
console.log(`page errors: ${errors.length === 0 ? '(none)' : errors.join(' | ')}`);
await browser.close();
