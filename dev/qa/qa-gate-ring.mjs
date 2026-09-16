import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// One-off gate-feedback evidence (parent-zone Phase 2):
// 1) screens harness: static ring (0.6) + burst preview on the menu mock;
// 2) live app: hold the gate 1.6s (ring mid-fill) then complete the 2.5s
//    hold and shoot the opened parent zone with its burst.
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

// 1) Static preview on the screens harness.
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
console.log('harness shot: out/menu-gate-ring.png (static 0.6 ring + burst)');
console.log(`harness page errors: ${errors.length === 0 ? '(none)' : errors.join(' | ')}`);

// 2) Live app hold.
const appPage = await browser.newPage({ viewport: { width: 430, height: 900 } });
const appErrors = [];
appPage.on('pageerror', (e) => appErrors.push(String(e)));
await appPage.goto(`${BASE}/index.html`, { waitUntil: 'load' });
await appPage.evaluate(() => localStorage.removeItem('trace-discover-save-v1'));
await appPage.reload({ waitUntil: 'load' });
await appPage.waitForFunction(() => window.__app && window.__app.screen, null, { timeout: 30000 });
await wait(800);

const tapTarget = async (id) => {
  const pt = await appPage.evaluate((targetId) => {
    const hit = window.__app.targets().find((t) => t.id === targetId);
    if (!hit) return null;
    const f = window.__app.field();
    return { x: f.x + (hit.x / 430) * f.width, y: f.y + (hit.y / 860) * f.height };
  }, id);
  if (!pt) throw new Error(`target missing: ${id}`);
  await appPage.mouse.click(pt.x, pt.y);
  await wait(450);
};

await tapTarget('splash');
const gate = await appPage.evaluate(() => {
  const f = window.__app.field();
  const hit = window.__app.targets().find((t) => t.id === 'gate');
  return { x: f.x + (hit.x / 430) * f.width, y: f.y + (hit.y / 860) * f.height };
});

await appPage.mouse.move(gate.x, gate.y);
await appPage.mouse.down();
await wait(1600);
await appPage.screenshot({ path: path.join(OUT, 'live-gate-midhold.png') });
await wait(1400);
const screenName = await appPage.evaluate(() => window.__app.screen().name);
await appPage.screenshot({ path: path.join(OUT, 'live-gate-open.png') });
await appPage.mouse.up();

console.log(`live shots: out/live-gate-midhold.png (1.6s ~ ring 64%), out/live-gate-open.png`);
console.log(`screen after 3.0s hold: ${screenName}`);
if (screenName !== 'parent') {
  throw new Error(`ASSERT: expected parent screen after the hold, got ${screenName}`);
}
console.log(`live page errors: ${appErrors.length === 0 ? '(none)' : appErrors.join(' | ')}`);

await browser.close();
