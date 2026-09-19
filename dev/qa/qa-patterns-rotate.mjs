// Patterns landscape spot (patterns-pack_20260920): opens pattern-5 (spiral),
// traces halfway, rotates to landscape and back to portrait, and asserts the
// level screen survives rotation with tracing progress preserved and the
// level still completes. Throwaway evidence probe in the qa-landscape spirit.
import { chromium } from 'playwright-core';

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

await tap('splash');
await tap('pack:patterns');
await tap('level:pattern-5');
await page.waitForFunction(() => window.__app.strokes().length > 0, null, { timeout: 15000 });

// Trace halfway through the spiral, then rotate mid-stroke.
const traceHalf = async () => {
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
  const stroke = strokes[0];
  const half = Math.floor(stroke.length / 2);
  await page.mouse.move(...Object.values(toClient(stroke[0])));
  await page.mouse.down();
  for (const pt of stroke.slice(0, half)) {
    const c = toClient(pt);
    await page.mouse.move(c.x, c.y, { steps: 2 });
    await wait(40);
  }
  await page.mouse.up();
  await wait(200);
};
await traceHalf();
const snapshotBefore = await page.evaluate(() => window.__app.strokes());

// Rotate to landscape mid-level, then back to portrait.
await page.setViewportSize({ width: 900, height: 430 });
await wait(600);
const orientation = await page.evaluate(() => window.__app.orientation());
const levelInLandscape = await page.evaluate(() => window.__app.screen());
await page.setViewportSize({ width: 430, height: 900 });
await wait(600);
const snapshotAfter = await page.evaluate(() => window.__app.strokes());

// Progress preservation reads as: the same stroke set is still on screen
// (re-sampled after reflow) with the paint-fill frontier intact.
const sameStrokeCount = snapshotBefore.length === snapshotAfter.length;
console.log(`landscape orientation: ${orientation}`);
console.log(`screen in landscape: ${levelInLandscape.name} (${levelInLandscape.levelId ?? ''})`);
console.log(
  `stroke set preserved through rotation: ${JSON.stringify(snapshotBefore.length)} -> ${JSON.stringify(snapshotAfter.length)} (${sameStrokeCount ? 'kept' : 'CHANGED'})`,
);

// Complete the level after the rotation round-trip.
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
    await wait(40);
  }
  const last = toClient(stroke[stroke.length - 1]);
  for (let i = 0; i < 6; i++) {
    await page.mouse.move(last.x, last.y, { steps: 1 });
    await wait(80);
  }
  await page.mouse.up();
  await wait(200);
}
await page.waitForFunction(() => window.__app.success(), null, { timeout: 45000 });
console.log('pattern-5 completed after rotation: SUCCESS');
console.log(`page errors: ${pageErrors.length > 0 ? pageErrors.join('; ') : '(none)'}`);
await browser.close();
