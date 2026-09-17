// QA probe: real-app journey on the pre-writing pack — splash -> menu
// (two pack cards) -> pre pack screen (3x4 grid) -> level screen on the
// fixed dino skin. Taps go through window.__app.targets() so field layout
// math stays in one place. Usage: dev server on :5199, then
// node dev/qa/qa-pre-pack.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.QA_BASE ?? 'http://localhost:5199';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out');
const FIELD_WIDTH = 430;
const FIELD_HEIGHT = 860;
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch() {
  try {
    return await chromium.launch({ channel: 'msedge' });
  } catch {
    const exe = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    return chromium.launch({ executablePath: exe });
  }
}

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${BASE}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__app !== undefined, null, { timeout: 30000 });
await wait(600);

const findings = [];

async function tapTarget(id) {
  const target = await page.evaluate((wanted) => {
    const found = window.__app.targets().find((t) => t.id === wanted);
    return found ?? null;
  }, id);
  if (!target) throw new Error(`target ${id} not found`);
  const field = await page.evaluate(() => window.__app.field());
  const clientX = field.x + (target.x / FIELD_WIDTH) * field.width;
  const clientY = field.y + (target.y / FIELD_HEIGHT) * field.height;
  await page.mouse.click(clientX, clientY);
  await wait(300);
  const screen = await page.evaluate(() => window.__app.screen());
  findings.push(`${id} -> screen ${screen.name}`);
  return screen;
}

async function shot(file) {
  await page.screenshot({ path: path.join(OUT, file) });
  findings.push(`shot ${file}`);
}

const screen0 = await page.evaluate(() => window.__app.screen());
findings.push(`boot screen ${screen0.name}`);
await tapTarget('splash');
await shot('pre-journey-menu.png');
await tapTarget('pack:pre');
await shot('pre-journey-pack-fresh.png');
const screen2 = await tapTarget('level:pre-1');
findings.push(`level screen payload ${JSON.stringify(screen2)}`);
await wait(900);
await shot('pre-journey-level.png');

// Scenario 2: an unlocked circle is reachable from the pack badge spot.
await page.evaluate(() => {
  localStorage.setItem(
    'trace-discover-save-v1',
    JSON.stringify({
      badges: [],
      completedLevels: ['pre-1', 'pre-2', 'pre-3', 'pre-4'],
      settings: { easierTracing: false, muted: false, skin: 'dino', volume: 1 },
      trophies: [],
      version: 3,
    }),
  );
});
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => window.__app !== undefined, null, { timeout: 30000 });
await wait(600);
await tapTarget('splash');
await tapTarget('pack:pre');
await tapTarget('pack:badge');
const reentry = await page.evaluate(() => window.__app.screen());
findings.push(`badge re-entry -> ${JSON.stringify(reentry)}`);
await shot('pre-journey-badge-reentry.png');

// Scenario 3: the skin switch cycles from menu, pack, and level screens.
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => window.__app !== undefined, null, { timeout: 30000 });
await wait(600);
await tapTarget('splash');
await tapTarget('skin:cycle');
await tapTarget('pack:pre');
await tapTarget('skin:cycle');
await tapTarget('level:pre-1');
await tapTarget('skin:cycle');
const skinState = await page.evaluate(() => ({
  screen: window.__app.screen(),
  skin: JSON.parse(localStorage.getItem('trace-discover-save-v1')).settings.skin,
}));
findings.push(`skin cycles -> ${JSON.stringify(skinState)}`);
await shot('pre-journey-skin-cycle.png');

// Scenario 4: star skin - dusk placeholder backdrop + idle mascot on menu/pack.
await page.evaluate(() => {
  localStorage.setItem(
    'trace-discover-save-v1',
    JSON.stringify({
      badges: [],
      completedLevels: [],
      settings: { easierTracing: false, muted: false, skin: 'star', volume: 1 },
      trophies: [],
      version: 3,
    }),
  );
});
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => window.__app !== undefined, null, { timeout: 30000 });
await wait(600);
await tapTarget('splash');
await wait(700);
await shot('pre-journey-menu-mascot.png');
await tapTarget('pack:pre');
await wait(700);
await shot('pre-journey-pack-mascot.png');
await tapTarget('level:pre-1');
await wait(900);
await shot('pre-journey-star-level.png');

// Scenario 5: parent zone - skin setter + legacy trophy row on a seeded save.
await page.evaluate(() => {
  localStorage.setItem(
    'trace-discover-save-v1',
    JSON.stringify({
      badges: ['pre-badge'],
      completedLevels: ['pre-1'],
      settings: { easierTracing: false, muted: false, skin: 'dino', volume: 1 },
      trophies: ['dino', 'animals'],
      version: 3,
    }),
  );
});
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => window.__app !== undefined, null, { timeout: 30000 });
await wait(600);
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
  canvas.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      clientX,
      clientY,
      isPrimary: true,
      pointerId: 11,
      pointerType: 'touch',
    }),
  );
});
await wait(3000);
const parentScreen = await page.evaluate(() => window.__app.screen());
findings.push(`parent gate hold -> ${JSON.stringify(parentScreen)}`);
await shot('pre-journey-parent.png');

findings.push(`page errors: ${errors.length === 0 ? 'none' : errors.join(' | ')}`);
console.log(findings.join('\n'));
await browser.close();
if (errors.length > 0) {
  process.exitCode = 1;
}
