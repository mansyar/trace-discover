import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// NFR measurement pass: cold-load timing, frame-interval sampling during a
// real trace, and on-disk size. Headless Edge on desktop is a smoke bound,
// not a mid-range Android verdict (Phase 7 measures on hardware).
const HERE = path.dirname(fileURLToPath(import.meta.url));
const URL = process.argv[2] ?? 'http://localhost:4173/';
const LEVEL = process.argv[3] ?? 'pre-1';
const DIST = path.join(HERE, '..', 'dist');

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

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function summarize(name, samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  console.log(
    `${name}: n=${samples.length} mean=${(samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(2)}ms p50=${at(0.5).toFixed(2)}ms p95=${at(0.95).toFixed(2)}ms max=${sorted[sorted.length - 1].toFixed(2)}ms`,
  );
}

(async () => {
  // On-disk size budget: whole app <= ~10-15MB.
  let total = 0;
  const biggest = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        const size = fs.statSync(full).size;
        total += size;
        biggest.push({ file: path.relative(DIST, full), size });
      }
    }
  };
  walk(DIST);
  biggest.sort((a, b) => b.size - a.size);
  console.log(`dist total: ${(total / 1048576).toFixed(2)}MB`);
  for (const { file, size } of biggest.slice(0, 6)) {
    console.log(`  ${(size / 1024).toFixed(0)}KB ${file}`);
  }

  const browser = await launch();
  const pageErrors = [];
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  page.on('pageerror', (error) => pageErrors.push(String(error)));

  // Cold load timing.
  const t0 = Date.now();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__app !== undefined, null, { timeout: 15000 });
  const bootMs = Date.now() - t0;
  const timing = await page.evaluate(() => {
    const t = performance.getEntriesByType('navigation')[0];
    return t
      ? {
          domContentLoaded: Math.round(t.domContentLoadedEventEnd),
          load: Math.round(t.loadEventEnd),
          responseEnd: Math.round(t.responseEnd),
        }
      : null;
  });
  console.log(`cold boot to interactive app: ${bootMs}ms`, JSON.stringify(timing));

  // Start frame-interval sampling, then trace pre-1 end to end.
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
  const tapTarget = async (id) => {
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
      throw new Error(`target missing: ${id}`);
    }
    await page.mouse.click(pt.x, pt.y);
    await wait(400);
  };
  const downAt = Date.now();
  await tapTarget('splash');
  const packId = LEVEL.startsWith('num-')
    ? 'numbers'
    : LEVEL.startsWith('abc-')
      ? 'abc'
      : 'pre';
  await tapTarget(`pack:${packId}`);
  await tapTarget(`level:${LEVEL}`);
  await page.waitForFunction(() => window.__app.path().length > 10, null, { timeout: 30000 });
  const trace = await page.evaluate(() => {
    const field = window.__app.field();
    const strokes = window.__app.strokes().map((points) => {
      const pts = points.filter((_, i) => i % 4 === 0);
      pts.push(points[points.length - 1]);
      return pts;
    });
    return { field, strokes };
  });
  const toClient = (p) => ({
    x: trace.field.x + (p.x / 430) * trace.field.width,
    y: trace.field.y + (p.y / 860) * trace.field.height,
  });
  // Touch-to-feedback upper bound: page timestamp just before pointerdown
  // vs. the first rAF timestamp after it. Includes automation round-trip,
  // so the true input-to-paint cost is lower; the budget is <100ms.
  const first = toClient(trace.strokes[0][0]);
  await page.mouse.move(first.x, first.y);
  await page.evaluate(() => {
    window.__downAt = performance.now();
    window.__paintAt = 0;
    requestAnimationFrame((now) => {
      window.__paintAt = now;
    });
  });
  await page.mouse.down();
  await page.waitForFunction(() => window.__paintAt > 0, null, { timeout: 5000 });
  const feedback = await page.evaluate(() => window.__paintAt - window.__downAt);
  console.log(`input-to-next-frame: ${feedback.toFixed(1)}ms (upper bound, incl. automation)`);
  // Trace every stroke with the fingertip, lifting between strokes.
  for (let s = 0; s < trace.strokes.length; s += 1) {
    const stroke = trace.strokes[s];
    if (s > 0) {
      const start = toClient(stroke[0]);
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
    }
    for (const p of stroke) {
      const c = toClient(p);
      await page.mouse.move(c.x, c.y, { steps: 2 });
      await wait(60);
    }
    const goal = toClient(stroke[stroke.length - 1]);
    for (let i = 0; i < 6; i += 1) {
      await page.mouse.move(goal.x, goal.y);
      await wait(120);
    }
    await page.mouse.up();
    await wait(250);
  }
  await page.waitForFunction(() => window.__app.success(), null, { timeout: 30000 });
  const frames = await page.evaluate(() => window.__frames);
  summarize('frame interval during trace', frames);
  console.log(`page errors: ${pageErrors.length === 0 ? '(none)' : pageErrors.join(' | ')}`);
  await browser.close();
})().catch((error) => {
  console.error('perf run failed:', error);
  process.exitCode = 1;
});
