import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Teddy art-batch screenshots on the real app: menu / pack / level / success
// with the teddy skin seeded (backdrop + character; face falls back until the
// Phase 4 icon lands). Usage: dev server running, then
// `node dev/qa/qa-teddy-screens.mjs [url]`.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] ?? 'http://127.0.0.1:5200';
const OUT = path.join(HERE, 'out', 'teddy-art');
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

const screenOf = () => page.evaluate(() => ({ ...window.__app.screen() }));
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

await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
await page.evaluate(() => {
  localStorage.removeItem('trace-discover-save-v1');
});
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => window.__app && window.__app.screen, null, { timeout: 30000 });
await wait(800);
await tapTarget('splash');
console.log(`splash -> ${JSON.stringify(await screenOf())}`);

// Spot-sweep: the skin cycle must reach teddy (4 taps from the dino default).
for (let i = 0; i < 4; i += 1) {
  await tapTarget('skin:cycle');
}
const cycled = await page.evaluate(() => {
  const raw = localStorage.getItem('trace-discover-save-v1');
  return raw ? JSON.parse(raw).settings.skin : null;
});
console.log(`skin cycle -> ${cycled}`);
if (cycled !== 'teddy') {
  throw new Error(`skin cycle did not reach teddy (got ${cycled})`);
}
await page.screenshot({ path: path.join(OUT, 'menu.png') });

await tapTarget('pack:pre');
await wait(400);
console.log(`menu -> ${JSON.stringify(await screenOf())}`);
await page.screenshot({ path: path.join(OUT, 'pack.png') });

await tapTarget('level:pre-2');
await page.waitForFunction(() => window.__app.path().length > 10, null, { timeout: 30000 });
await wait(500);
console.log(`pack -> ${JSON.stringify(await screenOf())}`);
await page.screenshot({ path: path.join(OUT, 'level.png') });

// Trace pre-2 with a simulated fingertip (same pattern as qa-app.mjs).
const trace = await page.evaluate(() => {
  const field = window.__app.field();
  const pts = window.__app.path().filter((_, i) => i % 4 === 0);
  pts.push(window.__app.path()[window.__app.path().length - 1]);
  return { field, pts };
});
const toClient = (p) => ({
  x: trace.field.x + (p.x / 430) * trace.field.width,
  y: trace.field.y + (p.y / 860) * trace.field.height,
});
const first = toClient(trace.pts[0]);
await page.mouse.move(first.x, first.y);
await page.mouse.down();
for (const p of trace.pts.slice(1)) {
  const c = toClient(p);
  await page.mouse.move(c.x, c.y, { steps: 2 });
  await wait(60);
}
const goal = toClient(trace.pts[trace.pts.length - 1]);
for (let i = 0; i < 6; i += 1) {
  await page.mouse.move(goal.x, goal.y);
  await wait(120);
}
await page.mouse.up();
await wait(350);
await page.screenshot({ path: path.join(OUT, 'hop.png') });
await page.waitForFunction(() => window.__app.success(), null, { timeout: 30000 });
await wait(1800);
await page.screenshot({ path: path.join(OUT, 'success.png') });
console.log(`success -> ${JSON.stringify(await screenOf())}`);

// Parent zone with teddy selected: the face icon on the small skin setter.
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => window.__app && window.__app.screen, null, { timeout: 30000 });
await wait(800);
await tapTarget('splash');
await page.evaluate(() => {
  const canvas = document.querySelector('.game-canvas');
  const field = window.__app.field();
  const gate = window.__app.targets().find((target) => target.id === 'gate');
  if (!canvas || !gate) {
    throw new Error('missing gate target');
  }
  const clientX = field.x + (gate.x / 430) * field.width;
  const clientY = field.y + (gate.y / 860) * field.height;
  for (const pointerId of [11, 12]) {
    canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        clientX,
        clientY,
        isPrimary: pointerId === 11,
        pointerId,
        pointerType: 'touch',
      }),
    );
  }
});
await wait(3600);
console.log(`parent -> ${JSON.stringify(await screenOf())}`);
await page.screenshot({ path: path.join(OUT, 'parent.png') });

console.log(`page errors: ${errors.length === 0 ? '(none)' : errors.join(' | ')}`);
await browser.close();
