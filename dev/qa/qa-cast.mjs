// QA probe (cast-delight): character presence pass — tap → giggle on menu and
// pack (throttled), entrance hop + settle on level open, no giggle during a
// level, per-skin giggle reactions, star blink series, dino/star/teddy flourish
// mid-celebrate frames, no-interference with cards / skin button / gate.
// Screenshots under out/cast.
// Usage: `pnpm build && pnpm preview --port 4399` then `node dev/qa/qa-cast.mjs [url]`.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.argv[2] ?? 'http://localhost:4399';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out', 'cast');
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

const page = await browser.newPage({
  hasTouch: true,
  viewport: { width: 430, height: 900 },
});
const pageErrors = [];
page.on('pageerror', (err) => pageErrors.push(String(err)));

const fail = (message) => {
  throw new Error(`ASSERT: ${message}`);
};
const screenOf = () => page.evaluate(() => window.__app.screen());
const targetIds = () => page.evaluate(() => window.__app.targets().map((t) => t.id));
const shot = (name) => page.screenshot({ path: path.join(OUT, name) });

const tapTarget = async (id) => {
  const pt = await page.evaluate((targetId) => {
    const hit = window.__app.targets().find((t) => t.id === targetId);
    if (!hit) return null;
    const f = window.__app.field();
    return { x: f.x + (hit.x / 430) * f.width, y: f.y + (hit.y / 860) * f.height };
  }, id);
  if (!pt) fail(`target missing: ${id}`);
  await page.mouse.click(pt.x, pt.y);
  await wait(450);
};

const fieldTap = async (x, y) => {
  const pt = await page.evaluate(
    ({ px, py }) => {
      const f = window.__app.field();
      return { x: f.x + (px / 430) * f.width, y: f.y + (py / 860) * f.height };
    },
    { px: x, py: y },
  );
  await page.mouse.click(pt.x, pt.y);
};

const seedSave = async (completedLevels, skin) => {
  await page.evaluate(
    ({ levels, skinId }) => {
      localStorage.setItem(
        'trace-discover-save-v1',
        JSON.stringify({
          badges: [],
          completedLevels: levels,
          settings: { easierTracing: false, muted: false, skin: skinId, volume: 1 },
          trophies: [],
          version: 3,
        }),
      );
    },
    { levels: completedLevels, skinId: skin },
  );
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__app && window.__app.screen, null, { timeout: 30000 });
  await wait(800);
  await tapTarget('splash');
  const screen = await screenOf();
  if (screen.name !== 'menu') fail(`splash tap did not reach menu: ${screen.name}`);
};

const traceLevel = async () => {
  await page.waitForFunction(() => window.__app.strokes().length > 0, null, { timeout: 15000 });
  const { field, strokes } = await page.evaluate(() => ({
    field: window.__app.field(),
    strokes: window.__app.strokes().map((points) => {
      const pts = points.filter((_, i) => i % 4 === 0);
      pts.push(points[points.length - 1]);
      return pts;
    }),
  }));
  const toClient = (p) => ({
    x: field.x + (p.x / 430) * field.width,
    y: field.y + (p.y / 860) * field.height,
  });
  for (const stroke of strokes) {
    const first = toClient(stroke[0]);
    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    for (const pt of stroke) {
      const c = toClient(pt);
      await page.mouse.move(c.x, c.y, { steps: 2 });
      await wait(50);
    }
    const last = toClient(stroke[stroke.length - 1]);
    for (let i = 0; i < 6; i++) {
      await page.mouse.move(last.x, last.y, { steps: 1 });
      await wait(100);
    }
    await page.mouse.up();
    await wait(220);
  }
};

try {
  // --- Case A: fresh menu (dino) — giggle, throttle, re-trigger, interference.
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.removeItem('trace-discover-save-v1'));
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__app && window.__app.screen, null, { timeout: 30000 });
  await wait(800);
  await tapTarget('splash');
  await wait(600);

  await fieldTap(215, 787); // menu mascot
  await wait(130);
  await shot('cast-menu-giggle-1.png');
  await wait(320);
  await shot('cast-menu-giggle-2.png');
  await fieldTap(215, 787); // inside the 600 ms cooldown — must be ignored
  await wait(130);
  await shot('cast-menu-throttle.png');
  let screen = await screenOf();
  if (screen.name !== 'menu') fail(`mascot tap left the menu: ${screen.name}`);
  await wait(900);
  await fieldTap(215, 787); // cooldown elapsed — fires again
  await wait(150);
  await shot('cast-menu-giggle-3.png');

  // Interference: cards still open; skin button still cycles next to the mascot.
  await fieldTap(215, 250);
  screen = await screenOf();
  if (screen.name !== 'pack') fail(`card tap did not open the pack: ${screen.name}`);
  await wait(300);
  await fieldTap(215, 614); // pack mascot
  await wait(150);
  await shot('cast-pack-giggle.png');
  await tapTarget('pack:home');
  screen = await screenOf();
  if (screen.name !== 'menu') fail(`pack home did not return to menu: ${screen.name}`);

  // --- Case B: entrance hop + settle, no giggle during a level, dino flourish.
  await tapTarget('pack:pre');
  screen = await screenOf();
  if (screen.name !== 'pack') fail(`pre pack did not open: ${screen.name}`);
  await tapTarget('level:pre-1');
  screen = await screenOf();
  if (screen.name !== 'level') fail(`pre-1 did not open: ${screen.name}`);
  await shot('cast-entrance-1.png');
  await wait(220);
  await shot('cast-entrance-2.png');
  await wait(440);
  await shot('cast-entrance-3.png');

  await fieldTap(215, 650); // waiting mascot during a level — no giggle, no crash
  await wait(150);
  await shot('cast-level-nogiggle.png');
  screen = await screenOf();
  if (screen.name !== 'level') fail(`level tap escaped the level: ${screen.name}`);

  await traceLevel();
  await wait(1900);
  await shot('cast-flourish-dino-1.png');
  await wait(450);
  await shot('cast-flourish-dino-2.png');
  await page.waitForFunction(() => window.__app.success(), null, { timeout: 15000 });
  await wait(400);
  await shot('cast-success.png');
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('trace-discover-save-v1')),
  );
  if (!saved.completedLevels.includes('pre-1')) fail('pre-1 not recorded after trace');
  console.log('menu/pack giggle + throttle + entrance + dino flourish OK');

  // --- Case C: per-skin giggle reactions (all five skins, menu tap).
  for (const skin of ['star', 'excavator', 'lion', 'teddy']) {
    await seedSave([], skin);
    await fieldTap(215, 787);
    await wait(160);
    await shot(`cast-giggle-${skin}.png`);
    await wait(800);
  }

  // --- Star blink series (idle loop is 3 s; blink holds frames ~110-117).
  await seedSave([], 'star');
  await page.waitForTimeout(0);
  for (let i = 0; i < 12; i++) {
    await wait(120);
    await shot(`cast-star-idle-${String(i).padStart(2, '0')}.png`);
  }

  // --- Star flourish (spin): trace pre-1 again as star.
  await tapTarget('pack:pre');
  await tapTarget('level:pre-1');
  await wait(900);
  await traceLevel();
  await wait(1900);
  await shot('cast-flourish-star-1.png');
  await wait(450);
  await shot('cast-flourish-star-2.png');
  await page.waitForFunction(() => window.__app.success(), null, { timeout: 15000 });
  console.log('per-skin giggles + star blink series + star flourish OK');

  // --- Teddy flourish (squish): seeded teddy, trace pre-1 once more.
  await seedSave([], 'teddy');
  await tapTarget('pack:pre');
  await tapTarget('level:pre-1');
  await wait(900);
  await traceLevel();
  await wait(1900);
  await shot('cast-flourish-teddy-1.png');
  await wait(450);
  await shot('cast-flourish-teddy-2.png');
  await page.waitForFunction(() => window.__app.success(), null, { timeout: 15000 });
  console.log('teddy flourish OK');

  console.log(`page errors: ${pageErrors.length === 0 ? '(none)' : pageErrors.join(' | ')}`);
} finally {
  await browser.close();
}

if (pageErrors.length > 0) {
  process.exitCode = 1;
}
