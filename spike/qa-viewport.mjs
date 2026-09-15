import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Orientation + safe-area audit: phone portrait, iPad landscape, and a
// mid-trace rotation. Fails on any target mapping outside the viewport,
// any page error, or any incomplete trace.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'qa-viewport');
const PORT = 5176;
const FIELD_W = 430;
const FIELD_H = 860;

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

let page;
const failures = [];

async function checkTargetsInside(label) {
  const bad = await page.evaluate(() => {
    const f = window.__app.field();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const outside = [];
    for (const t of window.__app.targets()) {
      const x = f.x + (t.x / 430) * f.width;
      const y = f.y + (t.y / 860) * f.height;
      if (x < 0 || y < 0 || x > vw || y > vh) {
        outside.push(t.id);
      }
    }
    return {
      outside,
      field: { x: f.x, y: f.y, w: f.width, h: f.height, vw, vh },
    };
  });
  if (bad.field.x < -0.5 || bad.field.y < -0.5) {
    failures.push(`${label}: field escapes viewport`);
  }
  if (bad.outside.length > 0) {
    failures.push(`${label}: targets outside viewport: ${bad.outside.join(',')}`);
  }
  console.log(
    `${label}: field ${bad.field.w.toFixed(0)}x${bad.field.h.toFixed(0)} @(${bad.field.x.toFixed(0)},${bad.field.y.toFixed(0)}) viewport ${bad.field.vw}x${bad.field.vh}`,
  );
}

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

async function traceCurrentLevel(id) {
  await page.waitForFunction(() => window.__app.path().length > 10, null, { timeout: 30000 });
  const trace = await page.evaluate(() => {
    const field = window.__app.field();
    const path = window.__app.path();
    const pts = path.filter((_, i) => i % 4 === 0);
    pts.push(path[path.length - 1]);
    return { field, pts };
  });
  const toClient = (p) => ({
    x: trace.field.x + (p.x / FIELD_W) * trace.field.width,
    y: trace.field.y + (p.y / FIELD_H) * trace.field.height,
  });
  const first = toClient(trace.pts[0]);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  return { trace, toClient };
}

async function finishTrace(trace, toClient, fromIndex) {
  for (const p of trace.pts.slice(fromIndex)) {
    const c = await page.evaluate(
      ({ p: point, f }) => ({
        x: f.x + (point.x / 430) * f.width,
        y: f.y + (point.y / 860) * f.height,
      }),
      { p, f: await page.evaluate(() => window.__app.field()) },
    );
    void toClient;
    await page.mouse.move(c.x, c.y, { steps: 2 });
    await wait(60);
  }
  const goal = await page.evaluate(() => {
    const app = window.__app;
    const f = app.field();
    const path = app.path();
    const last = path[path.length - 1];
    return {
      x: f.x + (last.x / 430) * f.width,
      y: f.y + (last.y / 860) * f.height,
    };
  });
  for (let i = 0; i < 6; i += 1) {
    await page.mouse.move(goal.x, goal.y);
    await wait(120);
  }
  await page.mouse.up();
  await page.waitForFunction(() => window.__app.success(), null, { timeout: 30000 });
  await wait(1800);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch();
  const pageErrors = [];
  page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  page.on('pageerror', (error) => pageErrors.push(String(error)));

  // 1. Phone portrait: menu targets + full dino-1 loop.
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__app && window.__app.screen, null, {
    timeout: 30000,
  });
  await wait(800);
  await checkTargetsInside('portrait menu');
  await tapTarget('splash');
  await tapTarget('theme:dino');
  await checkTargetsInside('portrait theme');
  await tapTarget('level:dino-1');
  const t1 = await traceCurrentLevel('dino-1');
  await finishTrace(t1.trace, t1.toClient, 1);
  console.log('portrait dino-1: TRACE SUCCESS');
  await page.screenshot({ path: path.join(OUT, 'portrait-success.png') });

  // 2. iPad landscape: full construction-1 loop.
  await page.setViewportSize({ width: 1180, height: 820 });
  await wait(600);
  await tapTarget('success:home');
  await checkTargetsInside('landscape menu');
  await page.screenshot({ path: path.join(OUT, 'landscape-menu.png') });
  await tapTarget('theme:construction');
  await checkTargetsInside('landscape theme');
  await tapTarget('level:construction-1');
  await checkTargetsInside('landscape level');
  const t2 = await traceCurrentLevel('construction-1');
  await finishTrace(t2.trace, t2.toClient, 1);
  console.log('landscape construction-1: TRACE SUCCESS');
  await checkTargetsInside('landscape success');
  await page.screenshot({ path: path.join(OUT, 'landscape-success.png') });

  // 3. Rotation mid-trace: start dino-2 in portrait, rotate, finish.
  await tapTarget('success:home');
  await page.setViewportSize({ width: 430, height: 900 });
  await wait(600);
  await tapTarget('theme:dino');
  await tapTarget('level:dino-2');
  const t3 = await traceCurrentLevel('dino-2');
  const half = Math.floor(t3.trace.pts.length / 2);
  const partial = t3.trace.pts.slice(1, half);
  for (const p of partial) {
    const c = t3.toClient(p);
    await page.mouse.move(c.x, c.y, { steps: 2 });
    await wait(60);
  }
  await page.setViewportSize({ width: 1180, height: 820 });
  await wait(600);
  await checkTargetsInside('rotated mid-trace');
  await finishTrace(t3.trace, t3.toClient, half);
  console.log('rotation dino-2: TRACE SUCCESS');
  await page.screenshot({ path: path.join(OUT, 'rotation-success.png') });

  if (pageErrors.length > 0) {
    failures.push(`page errors: ${pageErrors.join(' | ')}`);
  }
  await browser.close();
  if (failures.length > 0) {
    console.error('FAILURES:');
    for (const failure of failures) {
      console.error(' -', failure);
    }
    process.exitCode = 1;
  } else {
    console.log('viewport audit: all checks passed, no page errors');
  }
})().catch((error) => {
  console.error('audit failed:', error);
  process.exitCode = 1;
});
