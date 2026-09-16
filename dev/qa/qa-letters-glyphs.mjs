import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Headless screenshot QA for the 26 letter glyphs and the ABC/MOM/ZOO word
// bonuses (letters-pack Phase 2): opens the play harness for every level and
// captures the view so formation, start star, goal, and legibility can be
// reviewed in one contact sheet. Usage:
//   pnpm exec vite --port 5199 --strictPort   (leave running)
//   node dev/qa/qa-letters-glyphs.mjs
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:5199';
const IDS = [
  ...'abcdefghijklmnopqrstuvwxyz'.split('').map((letter) => `abc-${letter}`),
  'abc-bonus-1',
  'abc-bonus-2',
  'abc-bonus-3',
];

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
page.on('pageerror', (error) => errors.push(String(error)));

for (const id of IDS) {
  await page.goto(`${BASE}/dev/harness/play.html?level=${id}`);
  await page.waitForFunction(
    () => document.querySelector('#log')?.textContent?.includes('play ready'),
    null,
    { timeout: 15000 },
  );
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, `${id}.png`) });
  console.log(`shot ${id}`);
}
console.log(`page errors: ${errors.length > 0 ? errors.join('; ') : '(none)'}`);
await browser.close();
