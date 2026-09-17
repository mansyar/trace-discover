// Canonical landscape matrix probe (track landscape-layout_20260917).
// Portrait baseline + landscape per-screen checks, rotation reflow with
// progress preservation, target/field assertions, and screenshots.
// Run from dev/: node qa/qa-landscape.mjs  (needs the dev server on :5176)
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const PORT = Number(process.env.PORT ?? 5176);
const OUT = 'qa/out/landscape';
const SAVE_KEY = 'trace-discover-save-v1';

mkdirSync(OUT, { recursive: true });

const failures = [];
function check(condition, label) {
  if (condition) {
    console.log(`ok   ${label}`);
  } else {
    failures.push(label);
    console.error(`FAIL ${label}`);
  }
}

async function launchEdge() {
  for (const executablePath of EDGE_PATHS) {
    try {
      return await chromium.launch({
        executablePath,
        headless: true,
        args: [
          '--disable-background-timer-throttling',
          '--disable-renderer-backgrounding',
          '--disable-backgrounding-occluded-windows',
        ],
      });
    } catch {
      // try next path
    }
  }
  return await chromium.launch({ channel: 'msedge', headless: true });
}

const browser = await launchEdge();
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const pageErrors = [];
page.on('pageerror', (error) => {
  pageErrors.push(error.message);
  console.error('PAGE ERROR:', error.message);
});

// Seed: pre-writing levels 1-11 done so the splash (not onboarding) shows and
// the pre pack has a mixed completed state without needing a long play run.
await page.addInitScript(
  ({ key }) => {
    const completed = [];
    for (let index = 1; index <= 11; index += 1) {
      completed.push(`pre-${index}`);
    }
    window.localStorage.setItem(
      key,
      JSON.stringify({ version: 3, completedLevels: completed, badges: [], settings: {} }),
    );
  },
  { key: SAVE_KEY },
);

async function boot() {
  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.waitForFunction(() => window.__app !== undefined);
  await page.waitForTimeout(400);
}

async function designSize() {
  return page.evaluate(() =>
    window.__app.orientation() === 'landscape'
      ? { width: 860, height: 430 }
      : { width: 430, height: 860 },
  );
}

async function screenName() {
  return page.evaluate(() => window.__app.screen().name);
}

async function shot(name, note = '') {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`shot ${name} | screen=${await screenName()} ${note}`);
}

async function mapPoint(p) {
  const field = await page.evaluate(() => window.__app.field());
  const design = await designSize();
  return {
    x: field.x + (p.x / design.width) * field.width,
    y: field.y + (p.y / design.height) * field.height,
  };
}

async function tap(id) {
  const target = await page.evaluate(
    (wanted) => window.__app.targets().find((entry) => entry.id === wanted) ?? null,
    id,
  );
  if (!target) {
    throw new Error(`target missing: ${id}`);
  }
  const m = await mapPoint(target);
  await page.mouse.click(m.x, m.y);
  await page.waitForTimeout(350);
}

function densify(points, step = 8) {
  const out = [];
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) {
      continue;
    }
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.ceil(dist / step));
    for (let k = 0; k <= n; k += 1) {
      out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
    }
  }
  return out;
}

async function walkPoints(points, stride) {
  for (let i = 0; i < points.length; i += stride) {
    const m = await mapPoint(points[i]);
    await page.mouse.move(m.x, m.y);
    await page.waitForTimeout(45);
  }
}

async function strokes() {
  return page.evaluate(() => window.__app.strokes());
}

async function traceStrokeFrom(strokePoints, fromIndex = 0) {
  const dense = densify(strokePoints);
  const start = dense[Math.min(fromIndex, dense.length - 1)];
  if (!start) {
    return;
  }
  const m = await mapPoint(start);
  await page.mouse.move(m.x, m.y);
  await page.mouse.down();
  await walkPoints(dense, 2);
  const end = dense[dense.length - 1];
  if (end) {
    const e = await mapPoint(end);
    for (let k = 0; k < 5; k += 1) {
      await page.mouse.move(e.x, e.y);
      await page.waitForTimeout(60);
    }
  }
  await page.mouse.up();
  await page.waitForTimeout(80);
}

async function traceLevel() {
  const all = await strokes();
  for (const strokePoints of all) {
    await traceStrokeFrom(strokePoints);
  }
}

async function waitSuccess(timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await page.evaluate(() => window.__app.success())) {
      return true;
    }
    await page.waitForTimeout(200);
  }
  return false;
}

async function assertFieldAndTargets(label) {
  const data = await page.evaluate(() => {
    const field = window.__app.field();
    const orientation = window.__app.orientation();
    return {
      design: orientation === 'landscape' ? { height: 430, width: 860 } : { height: 860, width: 430 },
      field,
      orientation,
      targets: window.__app.targets(),
    };
  });
  const aspect = data.field.width / data.field.height;
  const designAspect = data.design.width / data.design.height;
  check(Math.abs(aspect - designAspect) < 0.01, `${label}: field keeps the ${data.orientation} aspect`);
  check(
    data.orientation === (page.viewportSize().width > page.viewportSize().height ? 'landscape' : 'portrait'),
    `${label}: orientation matches the viewport`,
  );
  let inside = true;
  for (const target of data.targets) {
    if (
      target.x < 0 ||
      target.x > data.design.width ||
      target.y < 0 ||
      target.y > data.design.height
    ) {
      inside = false;
    }
  }
  check(inside, `${label}: every target sits inside the design space`);
}

async function gateHold() {
  const design = await designSize();
  const m = await mapPoint({ x: design.width - 50, y: 50 });
  await page.evaluate(({ x, y }) => {
    const canvas = document.querySelector('.game-canvas');
    if (!canvas) {
      throw new Error('canvas missing');
    }
    for (const id of [91, 92]) {
      canvas.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          clientX: x + (id - 91) * 24,
          clientY: y,
          isPrimary: id === 91,
          pointerId: id,
          pointerType: 'touch',
        }),
      );
    }
  }, m);
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    const canvas = document.querySelector('.game-canvas');
    if (!canvas) {
      throw new Error('canvas missing');
    }
    for (const id of [91, 92]) {
      canvas.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, pointerId: id, pointerType: 'touch' }),
      );
    }
  });
  await page.waitForTimeout(400);
}

// A. Portrait baseline.
await boot();
check(await screenName() === 'splash', 'portrait: boots on splash');
await assertFieldAndTargets('portrait splash');
await shot('a1-splash-portrait');
await tap('splash');
await assertFieldAndTargets('portrait menu');
await shot('a2-menu-portrait');
await tap('pack:pre');
await shot('a3-pack-portrait');
await tap('level:pre-12');
await traceLevel();
check(await waitSuccess(), 'portrait: pre-12 completes');
await shot('a4-success-portrait');

// B. Phone landscape, fresh boot.
await page.setViewportSize({ width: 900, height: 430 });
await page.waitForTimeout(600);
await boot();
await assertFieldAndTargets('landscape splash');
await shot('b1-splash-landscape');
await tap('splash');
await assertFieldAndTargets('landscape menu');
await shot('b2-menu-landscape');
await tap('pack:numbers');
await assertFieldAndTargets('landscape numbers pack');
await shot('b3-numbers-landscape');
await tap('pack:home');
await tap('pack:abc');
await shot('b4-abc-page1-landscape');
await tap('pager:next');
await shot('b5-abc-page2-landscape');
await tap('pack:home');
await tap('pack:pre');
await tap('level:pre-12');
await assertFieldAndTargets('landscape level');
await traceLevel();
check(await waitSuccess(), 'landscape: pre-12 completes');
await assertFieldAndTargets('landscape success');
await shot('b6-success-landscape');
await tap('success:home');
await tap('pack:home');
await gateHold();
check(await screenName() === 'parent', 'landscape: parent gate opens');
await assertFieldAndTargets('landscape parent');
await shot('b7-parent-landscape');
await tap('parent:install');
await shot('b8-install-landscape');
await tap('parent:install');
await tap('parent:name');
await tap('name:cancel');
await tap('parent:done');

// C. Rotation reflow with progress preserved.
await tap('pack:pre');
await tap('level:pre-12');
const strokesBefore = await strokes();
const firstDense = densify(strokesBefore[0] ?? []);
const cut = Math.max(1, Math.floor(firstDense.length * 0.45));
const startM = await mapPoint(firstDense[0]);
await page.mouse.move(startM.x, startM.y);
await page.mouse.down();
await walkPoints(firstDense.slice(0, cut), 2);
await page.mouse.up();
await page.waitForTimeout(150);
await page.setViewportSize({ width: 430, height: 900 });
await page.waitForTimeout(600);
check(await screenName() === 'level', 'rotation: mid-trace rotate keeps the level screen');
await assertFieldAndTargets('rotated portrait level');
const centerAfter = await page.evaluate(() => {
  const path = window.__app.path();
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of path) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
});
check(
  Math.abs(centerAfter.x - 215) < 8 && Math.abs(centerAfter.y - 430) < 120,
  'rotation: the reflowed path re-centres in portrait',
);
await shot('c1-rotated-portrait-midtrace');
const resume = await strokes();
const resumeDense = densify(resume[0] ?? []);
const resumeIndex = Math.min(Math.max(1, cut - 4), resumeDense.length - 1);
const resumeM = await mapPoint(resumeDense[resumeIndex]);
await page.mouse.move(resumeM.x, resumeM.y);
await page.mouse.down();
await walkPoints(resumeDense.slice(resumeIndex), 2);
const endM = await mapPoint(resumeDense[resumeDense.length - 1]);
for (let k = 0; k < 5; k += 1) {
  await page.mouse.move(endM.x, endM.y);
  await page.waitForTimeout(60);
}
await page.mouse.up();
check(await waitSuccess(), 'rotation: the level still completes after rotate-back');

// D. Tablet landscape sweep.
await page.setViewportSize({ width: 1180, height: 820 });
await page.waitForTimeout(600);
await boot();
await tap('splash');
await assertFieldAndTargets('tablet landscape menu');
await shot('d1-menu-tablet');
await tap('pack:pre');
await tap('level:pre-12');
await traceLevel();
check(await waitSuccess(), 'tablet landscape: pre-12 completes');
await shot('d2-success-tablet');

check(pageErrors.length === 0, `no page errors (${pageErrors.length})`);
await browser.close();

console.log(failures.length === 0 ? 'landscape QA passed' : `landscape QA FAILED (${failures.length})`);
process.exitCode = failures.length === 0 ? 0 : 1;
