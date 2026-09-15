// Offline cold-start probe: installs the SW from the production preview
// server, then goes fully offline and plays pre-1 end to end.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const URL = process.argv[2] ?? 'http://localhost:4173/';
const LEVEL = process.argv[3] ?? 'pre-1';
const OUT = path.join(HERE, 'qa-offline');

const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

async function launch() {
  for (const exe of EDGE_PATHS) {
    if (fs.existsSync(exe)) {
      return chromium.launch({ executablePath: exe });
    }
  }
  return chromium.launch({ channel: 'msedge' });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));

  // Online first visit: let the service worker install + precache.
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__app !== undefined, null, { timeout: 15000 });
  await page.waitForFunction(
    () => navigator.serviceWorker?.controller !== null,
    null,
    { timeout: 20000 },
  );
  console.log('online: app ready, SW controlling');

  // Fully offline, cold reload.
  await page.context().setOffline(true);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__app !== undefined, null, { timeout: 15000 });
  console.log('offline: app booted from precache');

  const tap = async (id) => {
    const pt = await page.evaluate((targetId) => {
      const hit = window.__app.targets().find((t) => t.id === targetId);
      if (!hit) {
        return null;
      }
      const f = window.__app.field();
      return {
        x: f.x + (hit.x / 430) * f.width,
        y: f.y + (hit.y / 860) * f.height,
      };
    }, id);
    if (!pt) {
      throw new Error('target missing: ' + id);
    }
    await page.mouse.click(pt.x, pt.y);
    await page.waitForTimeout(400);
  };

  await tap('splash');
  const packId = LEVEL.startsWith('num-') ? 'numbers' : 'pre';
  await tap(`pack:${packId}`);
  await page.screenshot({ path: path.join(OUT, 'offline-pack.png') });

  // Trace the chosen level with the real pointer path.
  await tap(`level:${LEVEL}`);
  await page.waitForFunction(() => window.__app.path().length > 10, null, { timeout: 30000 });
  const trace = await page.evaluate(() => {
    const field = window.__app.field();
    const path = window.__app.path();
    const pts = path.filter((_, i) => i % 4 === 0);
    pts.push(path[path.length - 1]);
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
    await page.waitForTimeout(60);
  }
  const goal = toClient(trace.pts[trace.pts.length - 1]);
  for (let i = 0; i < 6; i += 1) {
    await page.mouse.move(goal.x, goal.y);
    await page.waitForTimeout(120);
  }
  await page.mouse.up();
  const success = await page
    .waitForFunction(() => window.__app.success(), null, { timeout: 30000 })
    .then(() => true)
    .catch(() => false);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: path.join(OUT, `offline-${LEVEL}-success.png`) });
  console.log(`offline ${LEVEL} trace:`, success ? 'SUCCESS' : 'INCOMPLETE');
  console.log('page errors:', errors.length === 0 ? '(none)' : errors.join(' | '));
  await browser.close();
  if (!success || errors.length > 0) {
    process.exitCode = 1;
  }
})().catch((error) => {
  console.error('probe failed:', error);
  process.exitCode = 1;
});
