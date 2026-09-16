import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// One-off: static preview of the one-finger gate ring (0.6 progress) + open
// burst on the screens harness — parent-zone Phase 2 Task 2 evidence.
// Usage: dev server on :5199, then `node dev/qa/qa-gate-ring.mjs`.
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

await page.goto(`${BASE}/dev/harness/screens.html?screen=menu`, { waitUntil: 'load' });
await page.waitForFunction(
  () => document.getElementById('log')?.textContent.includes('screens ready'),
  null,
  { timeout: 30000 },
);
await wait(400);
await page.screenshot({ path: path.join(OUT, 'menu-gate-ring.png') });

console.log('gate ring preview shot: out/menu-gate-ring.png (0.6 progress + burst)');
console.log(`page errors: ${errors.length === 0 ? '(none)' : errors.join(' | ')}`);
await browser.close();
