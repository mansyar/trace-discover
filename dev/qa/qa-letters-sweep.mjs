import { chromium } from 'playwright-core';

// Full sweep: traces every letters level in one chain — the 26 letters in
// order, then the badge seal opens ABC / MOM / ZOO. Evidence for acceptance
// criteria 2 and 3 (all levels completable; bonuses gated and traceable).
const BASE = process.argv[2] ?? 'http://localhost:5199';
const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch() {
  const fs = await import('node:fs');
  for (const exe of EDGE_PATHS) {
    if (fs.existsSync(exe)) {
      return chromium.launch({ executablePath: exe });
    }
  }
  return chromium.launch({ channel: 'msedge' });
}

const pageErrors = [];
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
page.on('pageerror', (error) => pageErrors.push(String(error)));
await page.goto(BASE + '/index.html');
await page.evaluate(() => localStorage.removeItem('trace-discover-save-v1'));
await page.reload();
await page.waitForFunction(() => window.__app !== undefined, null, { timeout: 15000 });

const tap = async (id) => {
  const pt = await page.evaluate((targetId) => {
    const hit = window.__app.targets().find((t) => t.id === targetId);
    if (!hit) {
      return null;
    }
    const f = window.__app.field();
    return { x: f.x + (hit.x / 430) * f.width, y: f.y + (hit.y / 860) * f.height };
  }, id);
  if (!pt) {
    throw new Error(`target missing: ${id}`);
  }
  await page.mouse.click(pt.x, pt.y);
  await wait(350);
};

const trace = async () => {
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
  await page.waitForFunction(() => window.__app.success(), null, { timeout: 45000 });
};

await tap('splash');
await tap('pack:abc');
await tap('level:abc-a');
const done = [];
for (let step = 0; step < 40; step++) {
  const screen = await page.evaluate(() => window.__app.screen());
  if (screen.name === 'badge') {
    await tap('badge:seal');
    continue;
  }
  if (screen.name !== 'level') {
    done.push(`stopped at ${screen.name}`);
    break;
  }
  const id = screen.levelId;
  const t0 = Date.now();
  await trace();
  done.push(`${id} SUCCESS (${Date.now() - t0}ms)`);
  console.log(done[done.length - 1]);
  if (id === 'abc-bonus-3') {
    break;
  }
  await tap('success:next');
  await wait(600);
}
const save = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('trace-discover-save-v1')),
);
console.log(`cleared: ${save.completedLevels.length}, badges: ${JSON.stringify(save.badges)}`);
console.log(`page errors: ${pageErrors.length > 0 ? pageErrors.join('; ') : '(none)'}`);
await browser.close();
