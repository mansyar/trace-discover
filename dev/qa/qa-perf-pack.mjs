import { chromium } from 'playwright-core';

// Frame-interval sampling on the letters pack screen (page 2 state with the
// most cards/stickers painted). Headless Edge smoke bound; hardware in Phase 6.
const BASE = process.argv[2] ?? 'http://localhost:4173';
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

const cleared = 'abcdefghijklmnopqrstuvwxy'.split('').map((l) => `abc-${l}`);
await page.goto(BASE + '/index.html');
await page.evaluate((levels) => {
  localStorage.setItem(
    'trace-discover-save-v1',
    JSON.stringify({
      badges: [],
      completedLevels: levels,
      settings: { easierTracing: false, muted: false, skin: 'dino', volume: 1 },
      trophies: [],
      version: 3,
    }),
  );
}, cleared);
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
  await wait(400);
};

await tap('splash');
await tap('pack:abc'); // lands on the z page (first unfinished)
await tap('pager:prev'); // page 1 with 12 cleared letters — full grid + shelf

await page.evaluate(() => {
  window.__frames = [];
  let last = 0;
  const tick = (now) => {
    if (last > 0) {
      window.__frames.push(now - last);
    }
    last = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
await wait(3000);
const frames = await page.evaluate(() => window.__frames);
const sorted = [...frames].sort((a, b) => a - b);
const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
console.log(
  `pack-screen frames: n=${frames.length} mean=${(frames.reduce((a, b) => a + b, 0) / frames.length).toFixed(2)}ms p50=${at(0.5).toFixed(2)}ms p95=${at(0.95).toFixed(2)}ms max=${sorted[sorted.length - 1].toFixed(2)}ms`,
);
console.log(`page errors: ${pageErrors.length === 0 ? '(none)' : pageErrors.join('; ')}`);
await browser.close();
