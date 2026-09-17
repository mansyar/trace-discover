// QA probe: sticker play end-to-end — first-open shelf pulse, board entry,
// tap moment + pentatonic note (oscillator frequencies captured via an init
// script), home return, intro-flag persistence across reload, inert fresh
// save, and the 29-slot letters fit with the two-octave note wrap.
// Usage: dev server (QA_BASE, default http://localhost:5199) then
// node dev/qa/qa-sticker-play.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.QA_BASE ?? 'http://localhost:5199';
const OUT = path.join(HERE, 'out');
const FIELD_WIDTH = 430;
const FIELD_HEIGHT = 860;
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const midi = (m) => 440 * 2 ** ((m - 69) / 12);

let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
} catch {
  browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
  });
}

const saveFor = (completedLevels) =>
  JSON.stringify({
    badges: [],
    completedLevels,
    settings: { easierTracing: false, muted: false, skin: 'dino', volume: 1 },
    trophies: [],
    version: 3,
  });

const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

// Capture every oscillator frequency the shell requests, before app code runs,
// so the sticker-note assertions read the real audio-graph calls (>100 Hz
// filters out the gain automation on the same AudioParam method).
await page.addInitScript(() => {
  window.__tones = [];
  const proto = window.AudioParam.prototype;
  const original = proto.setValueAtTime;
  proto.setValueAtTime = function (value, time) {
    if (typeof value === 'number' && value > 100) {
      window.__tones.push(value);
    }
    return original.call(this, value, time);
  };
});

const fail = (message) => {
  throw new Error(`ASSERT: ${message}`);
};
const screenOf = () => page.evaluate(() => window.__app.screen());
const momentOf = () => page.evaluate(() => window.__app.moment());
const tones = () => page.evaluate(() => window.__tones ?? []);
const storedSave = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem('trace-discover-save-v1')));
const shot = (name) => page.screenshot({ path: path.join(OUT, name) });

const seed = async (value) => {
  await page.evaluate((save) => {
    localStorage.setItem('trace-discover-save-v1', save);
  }, value);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__app?.screen().name === 'splash', null, {
    timeout: 30000,
  });
};

const clickTarget = async (id) => {
  const spot = await page.evaluate((targetId) => {
    const hit = window.__app?.targets().find((entry) => entry.id === targetId) ?? null;
    const field = window.__app?.field() ?? null;
    return hit && field ? { ...hit, field } : null;
  }, id);
  if (!spot) fail(`missing target ${id}`);
  const scale = spot.field.width / FIELD_WIDTH;
  await page.mouse.click(spot.field.x + spot.x * scale, spot.field.y + spot.y * scale);
};

const enterPack = async (packId) => {
  await clickTarget('splash');
  await page.waitForFunction(() => window.__app?.screen().name === 'menu', null, {
    timeout: 10000,
  });
  await wait(700);
  await clickTarget(`pack:${packId}`);
  await page.waitForFunction(() => window.__app?.screen().name === 'pack', null, {
    timeout: 10000,
  });
  await wait(700);
};

const openBoard = async () => {
  await clickTarget('pack:shelf');
  await page.waitForFunction(() => window.__app?.screen().name === 'sticker-board', null, {
    timeout: 10000,
  });
  await wait(400);
};

const assertTone = async (frequency, label) => {
  await page.waitForFunction(
    ({ f }) => (window.__tones ?? []).some((value) => Math.abs(value - f) < 0.01),
    { f: frequency },
    { timeout: 4000 },
  );
  console.log(`tone: ${label} (${frequency.toFixed(2)} Hz)`);
};

try {
  // Pass 1 — first open: pulse while the intro flag is unseen, board entry
  // records the flag, taps pop + play their ladder notes, home returns.
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  await seed(saveFor(['num-0', 'num-1']));
  await enterPack('numbers');
  let saved = await storedSave();
  if (saved.stickerIntroSeen === true) fail('intro flag set before any board open');
  await shot('sp-pulse.png');

  await openBoard();
  saved = await storedSave();
  if (saved.stickerIntroSeen !== true) fail('intro flag not recorded on first board open');
  await shot('sp-board.png');
  const ids = await page.evaluate(() => window.__app.targets().map((t) => t.id));
  for (const wanted of ['sticker:num-0', 'sticker:num-1', 'board:home']) {
    if (!ids.includes(wanted)) fail(`board target missing: ${wanted}`);
  }
  console.log('board: shelf -> sticker-board, intro flag recorded');

  await clickTarget('sticker:num-0');
  await wait(120);
  const moment = await momentOf();
  if (moment?.levelId !== 'num-0') fail(`moment not set: ${JSON.stringify(moment)}`);
  await assertTone(midi(72), 'num-0 C5');
  await wait(220);
  await shot('sp-pop.png');

  const ghostTones = (await tones()).length;
  const ghostMoments = await momentOf();
  await clickTarget('sticker:num-5');
  await wait(250);
  if ((await momentOf())?.levelId !== ghostMoments?.levelId) fail('ghost sticker changed the moment');
  if ((await tones()).length !== ghostTones) fail('ghost sticker played a note');
  console.log('ghost slot: inert (no moment, no note)');

  await clickTarget('sticker:num-1');
  await wait(120);
  if ((await momentOf())?.levelId !== 'num-1') fail('re-tap did not restart the moment');
  await assertTone(midi(74), 'num-1 D5');
  await wait(1500);

  await clickTarget('board:home');
  await page.waitForFunction(() => window.__app?.screen().name === 'pack', null, {
    timeout: 10000,
  });
  await wait(600);
  if (await momentOf()) fail('moment not cleared on close');
  await shot('sp-home.png');

  // Pass 2 — reload: the intro flag persists, so no pulse on the same pack.
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__app?.screen().name === 'splash', null, {
    timeout: 30000,
  });
  await enterPack('numbers');
  saved = await storedSave();
  if (saved.stickerIntroSeen !== true) fail('intro flag lost after reload');
  await shot('sp-reload-no-pulse.png');
  console.log('reload: intro flag persists, pulse gone');

  // Pass 3 — fresh save: no stickers, no pulse, shelf tap stays inert.
  await seed(saveFor([]));
  await enterPack('numbers');
  await clickTarget('pack:shelf');
  await wait(500);
  const inert = await screenOf();
  if (inert.name !== 'pack') fail(`fresh shelf tap opened ${inert.name}`);
  saved = await storedSave();
  if (saved.stickerIntroSeen === true) fail('fresh save should not have the flag');
  await shot('sp-fresh-inert.png');
  console.log('fresh save: shelf inert, no flag written');

  // Pass 4 — letters board: 29 slots fit one screen; a late sticker's note
  // wraps at two octaves (index 10 -> C5, not the naive C7).
  await seed(saveFor(['abc-a', 'abc-k']));
  await enterPack('abc');
  await openBoard();
  const letters = await page.evaluate(() =>
    window.__app.targets().filter((t) => t.id.startsWith('sticker:')),
  );
  if (letters.length !== 29) fail(`letters board slots: ${letters.length}`);
  for (const spot of letters) {
    if (spot.x < 0 || spot.x > FIELD_WIDTH || spot.y < 0 || spot.y > FIELD_HEIGHT) {
      fail(`letters slot off-field: ${spot.id} at ${spot.x},${spot.y}`);
    }
  }
  await shot('sp-letters-board.png');
  await clickTarget('sticker:abc-k');
  await wait(150);
  await assertTone(midi(72), 'abc-k wraps to C5');
  await wait(250);
  await shot('sp-letters-pop.png');
  console.log('letters: 29 slots on-field, wrap note asserted');

  console.log(`page errors: ${errors.length === 0 ? '(none)' : errors.join(' | ')}`);
} finally {
  await browser.close();
}

if (errors.length > 0) {
  process.exitCode = 1;
}
