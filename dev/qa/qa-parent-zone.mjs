import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// QA probe: parent zone end-to-end (parent-zone Phases 2-7). Harness previews
// (menu ring + static parent zone via ?screen=parent), then the live flow on a
// fresh save: one-time hint -> 3s one-finger hold (ring mid-fill, burst) ->
// sound pips / preview / auto-unmute (asserted from storage) -> section-card
// states (mute, easier, restart confirm, install) -> hint gone after reload.
// Then install variants (android UA, iphone UA, installed standalone).
// Reveals everything run against the dev server on :5199.
// Usage: dev server on :5199, then `node dev/qa/qa-parent-zone.mjs`.
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

// 1) Harness previews (static).
const harness = await browser.newPage({ viewport: { width: 430, height: 900 } });
const harnessErrors = [];
harness.on('pageerror', (e) => harnessErrors.push(String(e)));
const harnessShot = async (query, file) => {
  await harness.goto(`${BASE}/dev/harness/screens.html?${query}`, { waitUntil: 'load' });
  await harness.waitForFunction(
    () => document.getElementById('log')?.textContent.includes('screens ready'),
    null,
    { timeout: 30000 },
  );
  await wait(400);
  await harness.screenshot({ path: path.join(OUT, file) });
};
await harnessShot('screen=menu', 'menu-gate-ring.png');
await harnessShot('screen=parent', 'parent-preview.png');
console.log(
  'harness shots: out/menu-gate-ring.png (static 0.6 ring + burst), out/parent-preview.png (?screen=parent)',
);
console.log(`harness page errors: ${harnessErrors.length === 0 ? '(none)' : harnessErrors.join(' | ')}`);

// 2) Live app: hint -> one-finger hold -> zone tour.
const appPage = await browser.newPage({ viewport: { width: 430, height: 900 } });
const appErrors = [];
appPage.on('pageerror', (e) => appErrors.push(String(e)));
await appPage.goto(`${BASE}/index.html`, { waitUntil: 'load' });
await appPage.evaluate(() => localStorage.removeItem('trace-discover-save-v1'));
await appPage.reload({ waitUntil: 'load' });
await appPage.waitForFunction(() => window.__app && window.__app.screen, null, { timeout: 30000 });
await wait(800);

const tapTarget = async (id) => {
  const pt = await appPage.evaluate((targetId) => {
    const hit = window.__app.targets().find((t) => t.id === targetId);
    if (!hit) return null;
    const f = window.__app.field();
    return { x: f.x + (hit.x / 430) * f.width, y: f.y + (hit.y / 860) * f.height };
  }, id);
  if (!pt) throw new Error(`target missing: ${id}`);
  await appPage.mouse.click(pt.x, pt.y);
  await wait(450);
};

const readSettings = (page) =>
  page.evaluate(() => {
    const raw = localStorage.getItem('trace-discover-save-v1');
    return raw ? JSON.parse(raw).settings : null;
  });

await tapTarget('splash');
await appPage.screenshot({ path: path.join(OUT, 'menu-hint.png') });
await wait(400);
await appPage.screenshot({ path: path.join(OUT, 'menu-hint-pulse.png') });
const gate = await appPage.evaluate(() => {
  const f = window.__app.field();
  const hit = window.__app.targets().find((t) => t.id === 'gate');
  return { x: f.x + (hit.x / 430) * f.width, y: f.y + (hit.y / 860) * f.height };
});

await appPage.mouse.move(gate.x, gate.y);
await appPage.mouse.down();
await wait(1600);
await appPage.screenshot({ path: path.join(OUT, 'live-gate-midhold.png') });
await wait(1400);
const screenName = await appPage.evaluate(() => window.__app.screen().name);
await appPage.screenshot({ path: path.join(OUT, 'live-gate-open.png') });
await appPage.mouse.up();

console.log('live shots: out/live-gate-midhold.png (1.6s ~ ring 64%), out/live-gate-open.png');
console.log(`screen after 3.0s hold: ${screenName}`);
if (screenName !== 'parent') {
  throw new Error(`ASSERT: expected parent screen after the hold, got ${screenName}`);
}

// Zone finish + sound evidence: default (full pips), half volume, zero
// volume, muted with half volume, unmuted by a step, easier on, restart
// confirm, install (generic panel on this desktop UA).
await appPage.screenshot({ path: path.join(OUT, 'zone-default.png') });
for (let tap = 0; tap < 5; tap += 1) {
  await tapTarget('parent:volume-down');
}
await appPage.screenshot({ path: path.join(OUT, 'zone-sound-mid.png') });
for (let tap = 0; tap < 5; tap += 1) {
  await tapTarget('parent:volume-down');
}
await appPage.screenshot({ path: path.join(OUT, 'zone-sound-min.png') });
for (let tap = 0; tap < 5; tap += 1) {
  await tapTarget('parent:volume-up');
}
await tapTarget('parent:mute');
await appPage.screenshot({ path: path.join(OUT, 'zone-muted.png') });
await tapTarget('parent:volume-up');
await appPage.screenshot({ path: path.join(OUT, 'zone-unmuted.png') });

const settingsAfterSteps = await readSettings(appPage);
if (settingsAfterSteps?.muted !== false) {
  throw new Error(
    `ASSERT: volume stepping should unmute, got ${JSON.stringify(settingsAfterSteps)}`,
  );
}
if (Math.abs((settingsAfterSteps?.volume ?? 0) - 0.6) > 0.001) {
  throw new Error(`ASSERT: expected volume 0.6 after steps, got ${settingsAfterSteps?.volume}`);
}

await tapTarget('parent:easier');
await appPage.screenshot({ path: path.join(OUT, 'zone-easier.png') });
await tapTarget('parent:reset');
await appPage.screenshot({ path: path.join(OUT, 'zone-confirm.png') });
await tapTarget('parent:install');
await appPage.screenshot({ path: path.join(OUT, 'zone-install.png') });
console.log(
  'zone shots: out/zone-default.png, zone-sound-mid.png, zone-sound-min.png, zone-muted.png, zone-unmuted.png, zone-easier.png, zone-confirm.png, zone-install.png',
);

// Hint lifecycle: the flag persisted on open, so a reloaded menu hides it.
const persisted = await appPage.evaluate(() => {
  const raw = localStorage.getItem('trace-discover-save-v1');
  return raw ? JSON.parse(raw).settings.parentHintSeen : null;
});
console.log(`parentHintSeen persisted after open: ${persisted}`);
if (persisted !== true) {
  throw new Error(`ASSERT: expected parentHintSeen true after open, got ${persisted}`);
}
await appPage.reload({ waitUntil: 'load' });
await appPage.waitForFunction(() => window.__app && window.__app.screen, null, { timeout: 30000 });
await wait(600);
await tapTarget('splash');
await appPage.screenshot({ path: path.join(OUT, 'menu-hint-gone.png') });
console.log(
  'hint shots: out/menu-hint.png + out/menu-hint-pulse.png (dot pulse) -> out/menu-hint-gone.png (after open + reload)',
);

// 3) Install variants: android UA + iphone UA + simulated installed
// (the generic panel is covered by zone-install.png above).
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

const VARIANTS = [
  { file: 'install-android.png', label: 'android', userAgent: ANDROID_UA },
  { file: 'install-ios.png', label: 'ios', userAgent: IPHONE_UA },
  { file: 'install-installed.png', label: 'installed', standalone: true, userAgent: undefined },
];

for (const variant of VARIANTS) {
  const context = await browser.newContext({
    userAgent: variant.userAgent,
    viewport: { width: 430, height: 900 },
  });
  if (variant.standalone) {
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'standalone', { get: () => true });
    });
  }
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.removeItem('trace-discover-save-v1'));
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__app && window.__app.screen, null, { timeout: 30000 });
  await wait(700);

  const tap = async (targetId) => {
    const pt = await page.evaluate((id) => {
      const hit = window.__app.targets().find((t) => t.id === id);
      if (!hit) return null;
      const f = window.__app.field();
      return { x: f.x + (hit.x / 430) * f.width, y: f.y + (hit.y / 860) * f.height };
    }, targetId);
    if (!pt) throw new Error(`target missing: ${targetId}`);
    await page.mouse.click(pt.x, pt.y);
    await wait(450);
  };

  await tap('splash');
  const g = await page.evaluate(() => {
    const f = window.__app.field();
    const hit = window.__app.targets().find((t) => t.id === 'gate');
    return { x: f.x + (hit.x / 430) * f.width, y: f.y + (hit.y / 860) * f.height };
  });
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  await wait(3000);
  await page.mouse.up();
  await wait(300);

  const name = await page.evaluate(() => window.__app.screen().name);
  if (name !== 'parent') {
    throw new Error(`ASSERT(${variant.label}): expected parent screen, got ${name}`);
  }
  await tap('parent:install');
  await page.screenshot({ path: path.join(OUT, variant.file) });
  console.log(
    `${variant.label}: out/${variant.file} (errors: ${errors.length === 0 ? 'none' : errors.join(' | ')})`,
  );
  await context.close();
}

// 4) Hostile settings boot: mistyped fields sanitize to defaults and the
//    one-time hint still appears (parentHintSeen:"yes" is not a boolean).
const hostileContext = await browser.newContext({ viewport: { width: 430, height: 900 } });
await hostileContext.addInitScript(() => {
  localStorage.setItem(
    'trace-discover-save-v1',
    JSON.stringify({
      badges: [],
      completedLevels: [],
      settings: {
        easierTracing: 1,
        muted: 'no',
        parentHintSeen: 'yes',
        skin: 'unknown',
        volume: 99,
      },
      trophies: [],
      version: 3,
    }),
  );
});
const hostile = await hostileContext.newPage();
const hostileErrors = [];
hostile.on('pageerror', (e) => hostileErrors.push(String(e)));
await hostile.goto(`${BASE}/index.html`, { waitUntil: 'load' });
await hostile.waitForFunction(() => window.__app && window.__app.screen, null, { timeout: 30000 });
await wait(700);

const hostileTap = async (id) => {
  const pt = await hostile.evaluate((targetId) => {
    const hit = window.__app.targets().find((t) => t.id === targetId);
    if (!hit) return null;
    const f = window.__app.field();
    return { x: f.x + (hit.x / 430) * f.width, y: f.y + (hit.y / 860) * f.height };
  }, id);
  if (!pt) throw new Error(`target missing: ${id}`);
  await hostile.mouse.click(pt.x, pt.y);
  await wait(450);
};
await hostileTap('splash');
await hostile.screenshot({ path: path.join(OUT, 'hostile-menu.png') });
const hostileGate = await hostile.evaluate(() => {
  const f = window.__app.field();
  const hit = window.__app.targets().find((t) => t.id === 'gate');
  return { x: f.x + (hit.x / 430) * f.width, y: f.y + (hit.y / 860) * f.height };
});
await hostile.mouse.move(hostileGate.x, hostileGate.y);
await hostile.mouse.down();
await wait(3000);
await hostile.mouse.up();
await wait(300);
const hostileScreen = await hostile.evaluate(() => window.__app.screen().name);
if (hostileScreen !== 'parent') {
  throw new Error(`ASSERT(hostile): expected parent screen, got ${hostileScreen}`);
}
const hostileSettings = await readSettings(hostile);
if (
  hostileSettings?.parentHintSeen !== true ||
  hostileSettings?.volume !== 1 ||
  hostileSettings?.muted !== false ||
  hostileSettings?.skin !== 'dino'
) {
  throw new Error(`ASSERT(hostile): unsanitized settings ${JSON.stringify(hostileSettings)}`);
}
console.log(
  `hostile boot: sanitized (hint true after open, volume 1, muted false, skin dino); out/hostile-menu.png; errors: ${hostileErrors.length === 0 ? 'none' : hostileErrors.join(' | ')}`,
);
await hostileContext.close();

console.log(`live page errors: ${appErrors.length === 0 ? '(none)' : appErrors.join(' | ')}`);
await browser.close();
