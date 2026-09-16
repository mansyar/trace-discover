import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Letters pack-screen QA: real app boot -> menu (three cards) -> pack:abc
// page one (A–L) -> pager next (M–Z) -> pager prev -> level:abc-a, then the
// dev play harness (dev/harness/play.html?level=abc-a).
// Usage: `pnpm exec vite --port 5199 --strictPort` then `node dev/qa/qa-letters-pack.mjs`.
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

const screenOf = () => page.evaluate(() => ({ ...window.__app.screen() }));
const targetsOf = () => page.evaluate(() => window.__app.targets().map((t) => t.id));
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
await page.waitForFunction(() => window.__app && window.__app.screen, null, { timeout: 30000 });
await wait(800);
await tapTarget('splash');
console.log(`splash -> ${(await screenOf()).name}`);
await page.screenshot({ path: path.join(OUT, 'letters-pack-menu.png') });

await tapTarget('pack:abc');
console.log(`menu -> ${(await screenOf()).name}`);
await wait(500);
let ids = await targetsOf();
console.log(
  `page 1: ${ids.filter((id) => id.startsWith('level:') || id.startsWith('pager:')).join(', ')}`,
);
await page.screenshot({ path: path.join(OUT, 'letters-pack-page1.png') });

await tapTarget('pager:next');
ids = await targetsOf();
console.log(
  `page 2: ${ids.filter((id) => id.startsWith('level:') || id.startsWith('pager:')).join(', ')}`,
);
await page.screenshot({ path: path.join(OUT, 'letters-pack-page2.png') });

await tapTarget('pager:prev');
ids = await targetsOf();
console.log(`back on page 1 (abc-a present: ${ids.includes('level:abc-a')})`);

await tapTarget('level:abc-a');
const level = await screenOf();
console.log(`pack -> ${level.name} ${level.levelId ?? ''}`);
await wait(600);
await page.screenshot({ path: path.join(OUT, 'letters-pack-level-a.png') });
const strokeCount = await page.evaluate(() => window.__app.strokes().length);
console.log(`abc-a strokes: ${strokeCount}`);

// Dev play harness: the abc levels are selectable there too.
await page.goto(`${BASE}/dev/harness/play.html?level=abc-a`, { waitUntil: 'load' });
await page.waitForFunction(
  () => document.getElementById('log')?.textContent.includes('play ready'),
  null,
  { timeout: 30000 },
);
const play = await page.evaluate(() => ({
  id: window.__qa.levelId,
  strokes: window.__qa.path.length,
}));
console.log(`play harness: ${play.id} (${play.strokes} pts)`);

console.log(`page errors: ${pageErrors.length === 0 ? '(none)' : pageErrors.join(' | ')}`);
await browser.close();
