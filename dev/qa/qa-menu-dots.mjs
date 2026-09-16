import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Menu progress-dot check: seed a save with a few cleared letters, boot to the
// menu, and shoot the ABC card — 26 letters must wrap into two centered dot
// rows that stay inside the card (regression: the strip used to overflow).
// Usage: `pnpm exec vite --port 5199 --strictPort` then `node dev/qa/qa-menu-dots.mjs`.
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
const pageErrors = [];
page.on('pageerror', (err) => pageErrors.push(String(err)));

const tapTarget = async (id) => {
  const pt = await page.evaluate((targetId) => {
    const hit = window.__app.targets().find((t) => t.id === targetId);
    if (!hit) return null;
    const f = window.__app.field();
    return { x: f.x + (hit.x / 430) * f.width, y: f.y + (hit.y / 860) * f.height };
  }, id);
  if (!pt) throw new Error(`target missing: ${id}`);
  await page.mouse.click(pt.x, pt.y);
  await wait(450);
};

await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
await page.evaluate(() => {
  localStorage.setItem(
    'trace-discover-save-v1',
    JSON.stringify({
      badges: [],
      completedLevels: ['abc-a', 'abc-b', 'abc-c', 'abc-d', 'abc-e'],
      settings: { muted: false, skin: 'dino', volume: 1 },
      trophies: [],
      version: 3,
    }),
  );
});
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => window.__app && window.__app.screen, null, { timeout: 30000 });
await wait(800);
await tapTarget('splash');
await page.screenshot({ path: path.join(OUT, 'menu-dots.png') });
console.log('menu shot with seeded save (5/26 letters cleared)');

console.log(`page errors: ${pageErrors.length === 0 ? '(none)' : pageErrors.join(' | ')}`);
await browser.close();
