// Throwaway: screenshot every shapes-pack level via the pack preview harness
// so the blind-authored geometry can be eyeballed. Delete after use.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

mkdirSync('dev/qa/out/shapes', { recursive: true });

const LEVELS = ['shape-1', 'shape-2', 'shape-3', 'shape-4', 'shape-5', 'shape-6', 'shape-7', 'shape-8'];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
} catch {
  browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
}

const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
for (const level of LEVELS) {
  await page.goto(`http://localhost:5199/dev/harness/pack.html?pack=shapes&level=${level}`, { waitUntil: 'load' });
  await wait(1500);
  const errors = await page.evaluate(() =>
    document.getElementById('log').textContent.split('\n').filter((l) => /error|fail/i.test(l)).join(' ; ') || '(none)',
  );
  await page.screenshot({ path: `dev/qa/out/shapes/${level}.png` });
  console.log(`${level}: errors ${errors}`);
}
await browser.close();
