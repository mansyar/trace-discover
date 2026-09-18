// Canonical smoke: boots the production build on the preview server and
// traces `pre-1` to success, asserting the journey progresses and that zero
// uncaught page errors occur. Runs in CI (.github/workflows/ci.yml) and
// locally. No retries — a flaky run must surface as a red run.
// Usage: `pnpm preview` (or `pnpm serve`), then `node dev/qa/qa-smoke.mjs [url]`.
// Env: QA_BASE (default http://localhost:4173), QA_CHANNEL (default msedge).
// Evidence: screenshots + log written to dev/qa/out/qa-smoke/ (git-ignored).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.argv[2] ?? process.env.QA_BASE ?? 'http://localhost:4173';
const CHANNEL = process.env.QA_CHANNEL ?? 'msedge';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out', 'qa-smoke');
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const findings = [];
const log = (line) => {
  findings.push(line);
  console.log(line);
};

async function launch() {
  try {
    return await chromium.launch({ channel: CHANNEL, headless: true });
  } catch (e) {
    log(`launch: channel '${CHANNEL}' unavailable (${e.message.split('\n')[0]}) - trying Windows Edge path`);
    return chromium.launch({
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      headless: true,
    });
  }
}

const pageErrors = [];
let browser;
let page;
let failed = false;
try {
  browser = await launch();
  page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  const screenOf = () => page.evaluate(() => window.__app.screen());
  const expectScreen = async (name, where, levelId) => {
    const s = await screenOf();
    if (s.name !== name || (levelId && s.levelId !== levelId)) {
      throw new Error(`${where}: expected ${name}${levelId ? `/${levelId}` : ''}, got ${JSON.stringify(s)}`);
    }
    log(`${where}: screen ${name}${levelId ? `/${levelId}` : ''}`);
  };
  const tapTarget = async (id) => {
    const pt = await page.evaluate((targetId) => {
      const hit = window.__app.targets().find((t) => t.id === targetId);
      if (!hit) return null;
      const f = window.__app.field();
      return { x: f.x + (hit.x / 430) * f.width, y: f.y + (hit.y / 860) * f.height };
    }, id);
    if (!pt) throw new Error(`target missing: ${id}`);
    await page.mouse.click(pt.x, pt.y);
    await wait(400);
  };
  const traceLevel = async (id) => {
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
      await wait(60);
    }
    const goal = toClient(trace.pts[trace.pts.length - 1]);
    for (let i = 0; i < 6; i += 1) {
      await page.mouse.move(goal.x, goal.y);
      await wait(120);
    }
    await page.mouse.up();
    await page.waitForFunction(() => window.__app.success(), null, { timeout: 30000 });
    log(`${id}: trace success`);
    await wait(1800); // completion choreography
    await page.screenshot({ path: `${OUT}/${id}-success.png` });
  };

  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__app && window.__app.screen, null, { timeout: 30000 });
  await wait(800);
  await page.screenshot({ path: `${OUT}/splash.png` });
  await tapTarget('splash');
  await expectScreen('menu', 'splash tap');
  await page.screenshot({ path: `${OUT}/menu.png` });
  await tapTarget('pack:pre');
  await expectScreen('pack', 'pack:pre tap');
  await tapTarget('level:pre-1');
  await expectScreen('level', 'level:pre-1 tap', 'pre-1');
  await wait(400);
  await traceLevel('pre-1');
  log('SMOKE OK');
} catch (e) {
  failed = true;
  log(`SMOKE FAILED: ${e.message}`);
  if (page) await page.screenshot({ path: `${OUT}/failure.png` }).catch(() => undefined);
} finally {
  log(`page errors: ${pageErrors.length ? pageErrors.join(' ; ') : '(none)'}`);
  fs.writeFileSync(path.join(OUT, 'smoke-log.txt'), `${findings.join('\n')}\n`);
  if (browser) await browser.close().catch(() => undefined);
}
if (failed || pageErrors.length > 0) process.exitCode = 1;
