// Throwaway: screenshot the real menu with the animals pack registered, then
// open the pack screen. Verifies card art/fill wiring + pack entry.
// Usage: dev server on :5199, then node dev/qa/qa-animals-menu.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.QA_BASE ?? 'http://localhost:5199';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out');
fs.mkdirSync(OUT, { recursive: true });

async function launch() {
  try {
    return await chromium.launch({ channel: 'msedge' });
  } catch {
    const exe = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    if (fs.existsSync(exe)) {
      return chromium.launch({ executablePath: exe });
    }
    throw new Error('Edge not found');
  }
}

const browser = await launch();
try {
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(`${BASE}/index.html`);
  await page.evaluate(() => localStorage.removeItem('trace-discover-save-v1'));
  await page.reload();
  await page.waitForFunction(() => window.__app && window.__app.screen, null, { timeout: 30000 });
  const splash = await page.evaluate(() =>
    window.__app.targets().find((target) => target.id === 'splash'),
  );
  await page.mouse.click(splash.x, splash.y);
  await page.waitForFunction(() => window.__app.screen().name === 'menu', null, { timeout: 10000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, 'animals-menu.png') });

  const ids = await page.evaluate(() => window.__app.targets().map((target) => target.id));
  console.log(`menu targets: ${ids.join(', ')}`);

  const card = await page.evaluate(() =>
    window.__app.targets().find((target) => target.id === 'pack:animals'),
  );
  console.log(`animals card: ${card ? `(${card.x}, ${card.y})` : 'MISSING'}`);
  if (!card) {
    process.exitCode = 1;
  } else {
    await page.mouse.click(card.x, card.y);
    await page.waitForFunction(() => window.__app.screen().name === 'pack', null, {
      timeout: 10000,
    });
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, 'animals-pack.png') });
  }

  console.log(`page errors: ${errors.length ? errors.join(' | ') : '(none)'}`);
  if (errors.length) {
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
