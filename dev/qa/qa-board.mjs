import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Sticker-board preview QA: seeds a mixed save, opens ?screen=board, and
// captures the earned/ghost board plus a tap-to-earn pass.
// Usage: node dev/qa/qa-board.mjs (dev server; override with QA_BASE)
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.QA_BASE ?? 'http://localhost:5199';
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
const ready = () =>
  page.waitForFunction(
    () => document.getElementById('log')?.textContent.includes('screens ready'),
    null,
    { timeout: 30000 },
  );

await page.goto(`${BASE}/dev/harness/screens.html?screen=board`, { waitUntil: 'load' });
await page.evaluate(() => {
  localStorage.setItem(
    'trace-discover-save-v1',
    JSON.stringify({
      badges: [],
      completedLevels: ['num-0', 'num-1', 'num-3'],
      settings: { easierTracing: false, muted: false, skin: 'dino', volume: 1 },
      trophies: [],
      version: 3,
    }),
  );
});
await page.reload();
await ready();
await wait(500);
await page.screenshot({ path: path.join(OUT, 'board-mixed.png') });

// Field is letterboxed at (0, 20) in a 430x900 viewport; num-5 cell (270, 420).
await page.mouse.click(270, 440);
await wait(300);
await page.screenshot({ path: path.join(OUT, 'board-tap.png') });

// Pop pass: tapping an earned sticker (num-0 at cell 160, 200) springs it up.
await page.mouse.click(160, 220);
await wait(280);
await page.screenshot({ path: path.join(OUT, 'board-pop.png') });
await wait(320);
await page.screenshot({ path: path.join(OUT, 'board-pop-tail.png') });

const logText = await page.evaluate(() => document.getElementById('log')?.textContent ?? '');
const lastLine = logText.trim().split('\n').pop() ?? '(none)';
console.log(`log: ${lastLine}`);
console.log(`page errors: ${errors.length === 0 ? '(none)' : errors.join(' | ')}`);
await browser.close();
