import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Letters reward-loop QA: seed 25 cleared letters, land on the first
// unfinished page, trace abc-z to earn the pack badge, walk the badge tableau,
// open the unlocked ABC bonus, trace it, and end at home. Shoots the pack
// sticker states, the badge screen, and the bonus word.
// Usage: `pnpm exec vite --port 5199 --strictPort` then `node spike/qa-letters-rewards.mjs`.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:5199';
const OUT = path.join(HERE, 'qa');
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (line) => console.log(line);
const pageErrors = [];

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
  await wait(400);
};

const traceStrokes = async (id) => {
  await page.waitForFunction(() => window.__app.strokes().length > 0, null, { timeout: 30000 });
  const data = await page.evaluate(() => {
    const field = window.__app.field();
    const strokes = window.__app.strokes().map((stroke) => {
      const pts = stroke.filter((_, i) => i % 4 === 0);
      pts.push(stroke[stroke.length - 1]);
      return pts;
    });
    return { field, strokes };
  });
  const toClient = (p) => ({
    x: data.field.x + (p.x / 430) * data.field.width,
    y: data.field.y + (p.y / 860) * data.field.height,
  });
  for (const pts of data.strokes) {
    const first = toClient(pts[0]);
    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    for (const p of pts.slice(1)) {
      const c = toClient(p);
      await page.mouse.move(c.x, c.y, { steps: 2 });
      await wait(60);
    }
    const goal = toClient(pts[pts.length - 1]);
    for (let i = 0; i < 6; i += 1) {
      await page.mouse.move(goal.x, goal.y);
      await wait(120);
    }
    await page.mouse.up();
    await wait(250);
  }
  await page.waitForFunction(() => window.__app.success(), null, { timeout: 60000 });
  await wait(1800);
  await page.screenshot({ path: path.join(OUT, `rewards-${id}-success.png`) });
};

await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
await page.evaluate(() => {
  const cleared = [];
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  for (let i = 0; i < 25; i += 1) cleared.push(`abc-${alphabet[i]}`);
  localStorage.setItem(
    'trace-discover-save-v1',
    JSON.stringify({
      badges: [],
      completedLevels: cleared,
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
log(`splash -> ${(await screenOf()).name}`);

await tapTarget('pack:abc');
let ids = await targetsOf();
log(`menu -> pack; lands on z page (abc-z present: ${ids.includes('level:abc-z')})`);
await wait(500);
await page.screenshot({ path: path.join(OUT, 'rewards-pack-25.png') });

await tapTarget('level:abc-z');
log(`pack -> ${(await screenOf()).name} abc-z`);
await traceStrokes('abc-z');
log('abc-z: TRACE SUCCESS (badge earned on 26th)');

await tapTarget('success:next');
let screen = await screenOf();
log(`z next -> ${JSON.stringify(screen)}`);
await wait(600);
await page.screenshot({ path: path.join(OUT, 'rewards-badge.png') });

await tapTarget('badge:seal');
screen = await screenOf();
const bonusStrokes = await page.evaluate(() => window.__app.strokes().length);
log(`badge seal -> ${screen.name} ${screen.levelId ?? ''} (${bonusStrokes} strokes)`);
await wait(500);
await page.screenshot({ path: path.join(OUT, 'rewards-bonus-abc.png') });

await traceStrokes('abc-bonus-1');
log('abc-bonus-1: TRACE SUCCESS');
await tapTarget('success:home');
log(`bonus home -> ${(await screenOf()).name}`);
await wait(500);
await page.screenshot({ path: path.join(OUT, 'rewards-pack-26.png') });

const save = await page.evaluate(() => JSON.parse(localStorage.getItem('trace-discover-save-v1')));
log(
  `save: ${save.completedLevels.length} cleared (z: ${save.completedLevels.includes('abc-z')}, bonus-1: ${save.completedLevels.includes('abc-bonus-1')}), badges: ${JSON.stringify(save.badges)}`,
);
log(`page errors: ${pageErrors.length ? pageErrors.join(' ; ') : '(none)'}`);
await browser.close();
