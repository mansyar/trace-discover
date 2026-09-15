// Production persistence QA: a real v1 save migrates losslessly on launch,
// pack progress survives a relaunch, and the menu card + pack screen reflect
// the stored state. Usage: pnpm exec vite --port 5199 --strictPort then
// node spike/qa-persistence.mjs
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const BASE = 'http://localhost:5199';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'qa');
mkdirSync(OUT, { recursive: true });

const KEY = 'trace-discover-save-v1';
// A save as the shipped v1 app wrote it: dino cleared end to end (badge plus
// bonus), one construction level, two animals levels, tuned settings.
const V1_FIXTURE = {
  assistWidened: true,
  badges: ['dino'],
  completedLevels: [
    'dino-1',
    'dino-2',
    'dino-3',
    'dino-4',
    'dino-bonus',
    'construction-1',
    'animals-1',
    'animals-2',
  ],
  settings: { easierTracing: true, muted: false, volume: 0.7 },
  version: 1,
};

const failures = [];
function check(name, ok) {
  console.log(`${ok ? 'ok' : 'FAIL'} - ${name}`);
  if (!ok) failures.push(name);
}

async function launch() {
  try {
    return await chromium.launch({ channel: 'msedge' });
  } catch {
    return await chromium.launch({
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    });
  }
}

function clientOf(field, x, y) {
  return { x: field.x + (x / 430) * field.width, y: field.y + (y / 860) * field.height };
}

async function tapSplash(page) {
  const p = await page.evaluate(() => {
    const f = window.__app.field();
    return { x: f.x + (215 / 430) * f.width, y: f.y + (430 / 860) * f.height };
  });
  await page.mouse.click(p.x, p.y);
  await page.waitForFunction(() => window.__app.screen().name === 'menu', null, { timeout: 10000 });
}

async function tapTarget(page, id) {
  const hit = await page.evaluate((targetId) => {
    const target = window.__app.targets().find((t) => t.id === targetId);
    if (!target) throw new Error(`target missing: ${targetId}`);
    const f = window.__app.field();
    return { x: f.x + (target.x / 430) * f.width, y: f.y + (target.y / 860) * f.height };
  }, id);
  await page.mouse.click(hit.x, hit.y);
  await page.waitForTimeout(400);
}

async function traceNumeral(page) {
  await page.waitForFunction(
    () => window.__app.strokes && window.__app.strokes().length > 0,
    null,
    { timeout: 30000 },
  );
  const { field, strokes } = await page.evaluate(() => ({
    field: window.__app.field(),
    strokes: window.__app.strokes().map((points) => {
      const pts = points.filter((_, i) => i % 4 === 0);
      pts.push(points[points.length - 1]);
      return pts;
    }),
  }));
  for (const stroke of strokes) {
    const first = clientOf(field, stroke[0].x, stroke[0].y);
    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    for (const point of stroke) {
      const c = clientOf(field, point.x, point.y);
      await page.mouse.move(c.x, c.y, { steps: 2 });
      await page.waitForTimeout(60);
    }
    const last = clientOf(field, stroke[stroke.length - 1].x, stroke[stroke.length - 1].y);
    for (let d = 0; d < 6; d += 1) {
      await page.mouse.move(last.x, last.y);
      await page.waitForTimeout(120);
    }
    await page.mouse.up();
    await page.waitForTimeout(250);
  }
}

async function readSave(page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, KEY);
}

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));

try {
  // Part A: real v1 save migrates losslessly on launch.
  await page.goto(`${BASE}/index.html`);
  await page.evaluate(
    ([key, fixture]) => localStorage.setItem(key, JSON.stringify(fixture)),
    [KEY, V1_FIXTURE],
  );
  await page.reload();
  await page.waitForFunction(() => window.__app && window.__app.screen, null, { timeout: 30000 });
  await tapSplash(page);
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, 'persist-menu-migrated.png') });

  const migrated = await readSave(page);
  check('version upgraded to 2', migrated?.version === 2);
  check('badges kept', JSON.stringify(migrated?.badges) === '["dino"]');
  check('world levels kept', migrated?.completedLevels?.length === 8);
  check(
    'pack section starts fresh',
    migrated?.pack?.badge === false && migrated?.pack?.cleared?.length === 0,
  );
  check(
    'settings kept',
    migrated?.settings?.volume === 0.7 && migrated?.settings?.easierTracing === true,
  );

  await tapTarget(page, 'theme:dino');
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, 'persist-theme-migrated.png') });
  await tapTarget(page, 'theme:home');
  await tapTarget(page, 'pack');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'persist-pack-empty.png') });
  await tapTarget(page, 'pack:home');

  // Part B: pack progress survives a relaunch.
  await tapTarget(page, 'pack');
  await tapTarget(page, 'numeral:num-2');
  await traceNumeral(page);
  await page.waitForFunction(() => window.__app.success(), null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, 'persist-num2-success.png') });
  await tapTarget(page, 'success:home');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'persist-pack-num2.png') });

  const afterRun = await readSave(page);
  check('num-2 cleared on save', JSON.stringify(afterRun?.pack?.cleared) === '["num-2"]');

  await page.reload();
  await page.waitForFunction(() => window.__app && window.__app.screen, null, { timeout: 30000 });
  await tapSplash(page);
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, 'persist-menu-after-relaunch.png') });
  await tapTarget(page, 'pack');
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, 'persist-pack-after-relaunch.png') });

  const relaunched = await readSave(page);
  check('progress survived the relaunch', JSON.stringify(relaunched?.pack?.cleared) === '["num-2"]');
  check('version still 2 after relaunch', relaunched?.version === 2);
} catch (error) {
  console.error('FAILED:', String(error));
  process.exitCode = 1;
}

console.log(`page errors: ${pageErrors.length ? pageErrors.join(' | ') : '(none)'}`);
if (pageErrors.length) process.exitCode = 1;
if (failures.length) process.exitCode = 1;
await browser.close();
