import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Menu capacity matrix: renders the screens harness at 3-6 cards in both
// orientations, plus the My Name card case, and writes the screenshots to
// dev/qa/out/menu-capacity/ for review. Each shot shows the dashed art
// reserve + real dot strip per card, so art/dot behaviour is visible.
// Usage: `pnpm exec vite --port 5199 --strictPort` then `node dev/qa/qa-menu-capacity.mjs`.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:5199';
const OUT = path.join(HERE, 'out', 'menu-capacity');
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

const CASES = [];
for (const orientation of ['portrait', 'landscape']) {
  const viewport =
    orientation === 'portrait' ? { width: 430, height: 900 } : { width: 900, height: 430 };
  for (const count of [3, 4, 5, 6]) {
    CASES.push({
      name: `menu-${count}-${orientation}`,
      query: `screen=menu&menuCards=${count}`,
      viewport,
    });
  }
  CASES.push({
    name: `menu-6-name-${orientation}`,
    query: 'screen=menu&menuCards=6&menuName=AIRA',
    viewport,
  });
}

const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const pageErrors = [];
page.on('pageerror', (err) => pageErrors.push(String(err)));

for (const testCase of CASES) {
  await page.setViewportSize(testCase.viewport);
  await page.goto(`${BASE}/dev/harness/screens.html?${testCase.query}`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.getElementById('log')?.textContent.includes('screens ready'),
    null,
    { timeout: 30000 },
  );
  await wait(400);
  await page.screenshot({ path: path.join(OUT, `${testCase.name}.png`) });
  console.log(`shot ${testCase.name}`);
}

console.log(`page errors: ${pageErrors.length === 0 ? '(none)' : pageErrors.join(' | ')}`);
await browser.close();
if (pageErrors.length > 0) {
  process.exitCode = 1;
}
