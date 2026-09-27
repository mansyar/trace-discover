// Failed-character probe: with the character sprite unreachable the app must
// draw the stand-in mascot wherever the sprite belongs (never a blank canvas),
// report the failure to dev QA alone, and replace the stand-in with the real
// character when connectivity returns - without restarting the level.
// The service worker is blocked on purpose: Playwright cannot intercept
// service-worker fetches, so the sprite route would otherwise be served from the
// content cache instead of failing.
// Usage: (production preview on :4173) cd dev && node qa/qa-character.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const URL = process.argv[2] ?? 'http://localhost:4173/';
const OUT = path.join(HERE, 'out', 'character');
const SPRITE_ROUTE = '**/rive/*.riv';
// #f6e3b8 is both the field's cream base and CREAM in the drawn mascot, so the
// measurement is "how much of the mascot box is painted", not one pixel.
const BACKGROUND = [246, 227, 184];
const MIN_PAINTED_PERCENT = 15;

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
  const context = await browser.newContext({
    serviceWorkers: 'block',
    viewport: { width: 430, height: 860 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));

  const tap = async (id) => {
    const pt = await page.evaluate((targetId) => {
      const hit = window.__app?.targets().find((t) => t.id === targetId);
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
    await page.waitForTimeout(300);
  };

  /** Paints statistics for the mascot canvas's own box on the field canvas. */
  const measureMascot = () =>
    page.evaluate((background) => {
      const field = document.querySelector('.game-canvas');
      const char = document.querySelector('#char');
      const cssSize = Number.parseFloat(char.style.width);
      const moved = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(char.style.transform);
      if (!moved) {
        throw new Error(`no mascot transform: ${char.style.transform}`);
      }
      const dpr = field.width / window.innerWidth;
      const box = Math.round(cssSize * dpr);
      const data = field
        .getContext('2d')
        .getImageData(
          Math.round(Number.parseFloat(moved[1]) * dpr),
          Math.round(Number.parseFloat(moved[2]) * dpr),
          box,
          box,
        ).data;
      const histogram = new Map();
      let painted = 0;
      for (let i = 0; i < data.length; i += 4) {
        const rgb = [data[i], data[i + 1], data[i + 2]];
        if (rgb.some((value, channel) => Math.abs(value - background[channel]) > 10)) {
          painted += 1;
        }
        const key = `#${rgb.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
        histogram.set(key, (histogram.get(key) ?? 0) + 1);
      }
      const total = data.length / 4;
      const top = [...histogram.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
      return {
        box: cssSize,
        paintedPercent: Math.round((painted / total) * 100),
        top: top.map(([color, count]) => `${color} ${Math.round((count / total) * 100)}%`),
      };
    }, BACKGROUND);

  // The failing sprite: every .riv request is aborted, exactly like a dead link.
  await page.route(SPRITE_ROUTE, (route) => route.abort());
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__app !== undefined, null, { timeout: 15000 });
  await tap('splash');
  await page.waitForFunction(() => window.__app.screen().name === 'menu', null, { timeout: 30000 });
  await page.waitForTimeout(1200);

  const standin = await page.evaluate(() => ({
    character: window.__app.character(),
    charCanvas: document.querySelector('#char').style.display,
    error: window.__app.characterError(),
  }));
  const standinBox = await measureMascot();
  console.log('blocked sprite:', JSON.stringify(standin));
  console.log('menu mascot box:', JSON.stringify(standinBox));
  await page.screenshot({ path: path.join(OUT, 'standin-menu.png') });

  // Play a level while the sprite is still dead: the stand-in must follow the run.
  await tap('pack:pre');
  await tap('level:pre-1');
  await page.waitForFunction(() => window.__app.path().length > 10, null, { timeout: 30000 });
  const trace = await page.evaluate(() => {
    const f = window.__app.field();
    return { f, pts: window.__app.path().filter((_, i) => i % 6 === 0) };
  });
  const toClient = (p) => ({
    x: trace.f.x + (p.x / 430) * trace.f.width,
    y: trace.f.y + (p.y / 860) * trace.f.height,
  });
  const first = toClient(trace.pts[0]);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  for (const p of trace.pts.slice(1)) {
    const c = toClient(p);
    await page.mouse.move(c.x, c.y, { steps: 2 });
    await page.waitForTimeout(40);
  }
  await page.mouse.up();
  await page.waitForTimeout(600);

  const inLevel = await page.evaluate(() => ({
    character: window.__app.character(),
    path: window.__app.path().length,
    screen: `${window.__app.screen().name}/${window.__app.screen().levelId}`,
  }));
  const levelBox = await measureMascot();
  console.log('level on stand-ins:', JSON.stringify(inLevel));
  console.log('level mascot box:', JSON.stringify(levelBox));

  // Wait for the level's own warm-up to report what it could and could not cache.
  await page.waitForFunction(() => window.__app.levelContent() !== null, null, { timeout: 30000 });
  const levelContent = await page.evaluate(() => window.__app.levelContent());
  console.log('level content:', JSON.stringify(levelContent));

  // Connectivity returns: the sprite route is restored and `online` fires.
  await page.unroute(SPRITE_ROUTE);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.waitForFunction(() => window.__app.character() === 'real', null, { timeout: 20000 });
  await page.waitForTimeout(600);

  const healed = await page.evaluate(() => ({
    character: window.__app.character(),
    charCanvas: document.querySelector('#char').style.display,
    path: window.__app.path().length,
    screen: `${window.__app.screen().name}/${window.__app.screen().levelId}`,
  }));
  console.log('after online retry:', JSON.stringify(healed));
  await page.screenshot({ path: path.join(OUT, 'standin-healed.png') });
  console.log('page errors:', errors.length === 0 ? '(none)' : errors.join(' | '));

  const failures = [];
  if (standin.character !== 'standin') {
    failures.push(`menu character was '${standin.character}', expected the stand-in`);
  }
  if (standin.charCanvas !== 'none') {
    failures.push(`menu showed the sprite canvas (display: ${standin.charCanvas}) beside the stand-in`);
  }
  if (standinBox.paintedPercent < MIN_PAINTED_PERCENT) {
    failures.push(`menu mascot box only ${standinBox.paintedPercent}% painted (blank hole)`);
  }
  if (inLevel.character !== 'standin') {
    failures.push(`level character was '${inLevel.character}', expected the stand-in`);
  }
  if (levelBox.paintedPercent < MIN_PAINTED_PERCENT) {
    failures.push(`level mascot box only ${levelBox.paintedPercent}% painted (blank hole)`);
  }
  if (levelContent === null || levelContent.failed < 1) {
    failures.push(`level warm-up did not report the failed sprite: ${JSON.stringify(levelContent)}`);
  }
  if (healed.character !== 'real') {
    failures.push('the online retry never replaced the stand-in with the real character');
  }
  if (healed.charCanvas !== 'block') {
    failures.push(`healed sprite canvas display was ${healed.charCanvas}, expected block`);
  }
  if (healed.screen !== inLevel.screen) {
    failures.push(`the retry left the level (${inLevel.screen} -> ${healed.screen})`);
  }
  if (healed.path < inLevel.path) {
    failures.push(`the retry reset progress (path ${inLevel.path} -> ${healed.path})`);
  }
  if (errors.length > 0) {
    failures.push(`page errors: ${errors.join(' | ')}`);
  }

  await browser.close();
  if (failures.length > 0) {
    console.log('CHARACTER FAILED:', failures.join(' | '));
    process.exitCode = 1;
  } else {
    console.log('CHARACTER OK');
  }
})().catch((error) => {
  console.error('probe failed:', error);
  process.exitCode = 1;
});
