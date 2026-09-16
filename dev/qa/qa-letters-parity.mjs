import { chromium } from 'playwright-core';

// Four-skin parity smoke: seed each skin, boot the app, open abc-a, and
// verify the level loads with its strokes — letters must work under every skin.
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

const browser = await launch();
for (const skin of ['dino', 'star', 'construction', 'animal']) {
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  const errs = [];
  page.on('pageerror', (error) => errs.push(String(error)));
  await page.goto(BASE + '/index.html');
  await page.evaluate((s) => {
    localStorage.setItem(
      'trace-discover-save-v1',
      JSON.stringify({
        badges: [],
        completedLevels: [],
        settings: { easierTracing: false, muted: false, skin: s, volume: 1 },
        trophies: [],
        version: 3,
      }),
    );
  }, skin);
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
  await tap('pack:abc');
  await tap('level:abc-a');
  const screen = await page.evaluate(() => window.__app.screen());
  const strokes = await page.evaluate(() => window.__app.strokes().length);
  console.log(
    `${skin}: ${screen.name} ${screen.levelId ?? ''} strokes=${strokes} errors=${errs.length > 0 ? errs.join('; ') : '(none)'}`,
  );
  await page.close();
}
await browser.close();
