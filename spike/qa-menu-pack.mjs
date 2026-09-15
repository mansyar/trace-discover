// QA probe: menu pack-card states — fresh, in-progress (4 cleared), badge.
// Seeds the save in localStorage, reloads, screenshots each state.
// Usage: dev server on :5199 (pnpm exec vite --port 5199 --strictPort), then
// node spike/qa-menu-pack.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:5199';
const OUT = 'spike/qa';
fs.mkdirSync(OUT, { recursive: true });

async function launch() {
  try {
    return await chromium.launch({ channel: 'msedge' });
  } catch {
    const exe = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    if (fs.existsSync(exe)) {
      return chromium.launch({ executablePath: exe });
    }
    throw new Error('Edge not found');
  }
}

const saveFor = (cleared, badge) =>
  JSON.stringify({
    assistWidened: false,
    badges: [],
    completedLevels: [],
    pack: { badge, cleared },
    settings: { easierTracing: false, muted: false, volume: 1 },
    version: 2,
  });

const states = [
  ['pack-menu-fresh.png', null],
  ['pack-menu-progress.png', saveFor(['num-0', 'num-1', 'num-2', 'num-3'], false)],
  [
    'pack-menu-badge.png',
    saveFor(
      ['num-0', 'num-1', 'num-2', 'num-3', 'num-4', 'num-5', 'num-6', 'num-7', 'num-8', 'num-9'],
      true,
    ),
  ],
];

const browser = await launch();
try {
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  for (const [file, seed] of states) {
    await page.goto(`${BASE}/index.html`);
    await page.evaluate((value) => {
      if (value) {
        localStorage.setItem('trace-discover-save-v1', value);
      } else {
        localStorage.removeItem('trace-discover-save-v1');
      }
    }, seed);
    await page.reload();
    await page.waitForFunction(() => window.__app && window.__app.screen, null, { timeout: 30000 });
    const splash = await page.evaluate(() => {
      const f = window.__app.field();
      return { x: f.x + (215 / 430) * f.width, y: f.y + (430 / 860) * f.height };
    });
    await page.mouse.click(splash.x, splash.y);
    await page.waitForFunction(() => window.__app.screen().name === 'menu', null, { timeout: 10000 });
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(OUT, file) });
    console.log(`${file} saved`);
  }
  console.log(`page errors: ${errors.length ? errors.join(' | ') : '(none)'}`);
  if (errors.length) {
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
