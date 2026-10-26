// Tablet mid-trace rotation evidence (track tablet-fit_20261006, Phase 2
// Task 3): opens a level on each tablet family (4:3 iPad, 16:10 Android
// slate), traces partway, rotates the viewport between the portrait and
// landscape space *mid-trace*, and asserts that the space re-selected, the run
// survived with its progress ratio intact, and the level still completes.
// Writes labelled before/after screenshots + a gallery page for owner review.
// Usage: from dev/ — `pnpm exec vite --port 5199 --strictPort`, then
// `node qa/qa-tablet-rotate.mjs` (PORT overrides 5199, a URL argument overrides
// the base).
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const PORT = Number(process.env.PORT) > 0 ? Number(process.env.PORT) : 5199;
const BASE = process.argv[2] ?? `http://localhost:${PORT}`;
const OUT = 'qa/out/tablet-rotate';
const SAVE_KEY = 'trace-discover-save-v1';

/** The two tablet families at their exact anchors, so both orientations are
 *  reached with zero letterbox bars. */
const CASES = [
  {
    id: 'tablet-4x3',
    landscape: { width: 1366, height: 1024 },
    landscapeSpace: 'tablet-landscape',
    portrait: { width: 1024, height: 1366 },
    portraitSpace: 'tablet-portrait',
  },
  {
    id: 'slate-16x10',
    landscape: { width: 1280, height: 800 },
    landscapeSpace: 'slate-landscape',
    portrait: { width: 800, height: 1280 },
    portraitSpace: 'slate-portrait',
  },
];

mkdirSync(OUT, { recursive: true });

const failures = [];
function check(condition, label, detail = '') {
  if (condition) {
    console.log(`ok   ${label}${detail ? ` (${detail})` : ''}`);
  } else {
    failures.push(label);
    console.error(`FAIL ${label}${detail ? ` (${detail})` : ''}`);
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
      // try the next install path
    }
  }
  return await chromium.launch({ channel: 'msedge', headless: true });
}

const browser = await launchEdge();
const page = await browser.newPage({ hasTouch: true, viewport: { width: 1024, height: 1366 } });
const pageErrors = [];
page.on('pageerror', (error) => {
  pageErrors.push(error.message);
  console.error('PAGE ERROR:', error.message);
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** A space-unit point projected into the live field rect. */
async function toClient(point) {
  return page.evaluate(({ x, y }) => {
    const field = window.__app.field();
    const space = window.__app.space();
    return {
      x: field.x + (x / space.width) * field.width,
      y: field.y + (y / space.height) * field.height,
    };
  }, point);
}

async function tap(id) {
  const target = await page.evaluate(
    (wanted) => window.__app.targets().find((entry) => entry.id === wanted) ?? null,
    id,
  );
  if (!target) {
    throw new Error(`target missing: ${id}`);
  }
  const point = await toClient(target);
  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(320);
}

/** Opens pre-1 from a clean save at the given viewport. */
async function openLevel(viewport) {
  await page.setViewportSize(viewport);
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  await page.evaluate((key) => window.localStorage.removeItem(key), SAVE_KEY);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__app !== undefined, null, { timeout: 30000 });
  await page.waitForFunction(() => window.__app.screen().name === 'splash', null, { timeout: 30000 });
  await tap('splash');
  await page.waitForFunction(() => window.__app.screen().name === 'menu', null, { timeout: 30000 });
  await tap('pack:pre');
  await tap('level:pre-1');
  await page.waitForFunction(() => window.__app.strokes().length > 0, null, { timeout: 15000 });
  await page.waitForTimeout(900); // let the level-start entrance hop settle
}

async function progress() {
  return page.evaluate(() => window.__app.progress());
}

async function readStrokes() {
  return page.evaluate(() =>
    window.__app.strokes().map((points) => {
      const sampled = points.filter((_, index) => index % 3 === 0);
      sampled.push(points[points.length - 1]);
      return sampled;
    }),
  );
}

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`shot ${name}`);
}

/** Close-up of the level ink + the painted prefix, for judging the trace itself
 *  (a single authored-size glyph is small inside a tablet field). */
async function shotLevel(name) {
  const clip = await page.evaluate(() => {
    const field = window.__app.field();
    const space = window.__app.space();
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const stroke of window.__app.strokes()) {
      for (const point of stroke) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
    }
    const pad = 90;
    const toX = (x) => field.x + (x / space.width) * field.width;
    const toY = (y) => field.y + (y / space.height) * field.height;
    const left = Math.max(0, toX(minX - pad));
    const top = Math.max(0, toY(minY - pad));
    return {
      height: Math.min(window.innerHeight - top, toY(maxY + pad) - top),
      width: Math.min(window.innerWidth - left, toX(maxX + pad) - left),
      x: left,
      y: top,
    };
  });
  await page.screenshot({ path: `${OUT}/${name}.png`, clip });
  console.log(`shot ${name}`);
}

/** Traces the first half of stroke 0 and holds the finger down. */
async function traceHalf() {
  const strokes = await readStrokes();
  const stroke = strokes[0];
  const half = Math.max(2, Math.floor(stroke.length / 2));
  const first = await toClient(stroke[0]);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  for (const point of stroke.slice(0, half)) {
    const client = await toClient(point);
    await page.mouse.move(client.x, client.y, { steps: 2 });
    await wait(40);
  }
  await wait(120);
}

/** Walks every stroke from its start; the engine continues from the frontier. */
async function completeLevel() {
  const strokes = await readStrokes();
  for (const stroke of strokes) {
    const first = await toClient(stroke[0]);
    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    for (const point of stroke) {
      const client = await toClient(point);
      await page.mouse.move(client.x, client.y, { steps: 2 });
      await wait(40);
    }
    const last = await toClient(stroke[stroke.length - 1]);
    for (let i = 0; i < 6; i++) {
      await page.mouse.move(last.x, last.y, { steps: 1 });
      await wait(80);
    }
    await page.mouse.up();
    await wait(200);
  }
  await page.waitForFunction(() => window.__app.success(), null, { timeout: 45000 });
}

const gallery = [];

/** One rotation direction: from viewport → to viewport, mid-trace. */
async function rotateMidTrace(testCase, from, to, fromSpace, toSpace) {
  const label = `${testCase.id} ${fromSpace} → ${toSpace}`;
  await openLevel(from);
  const selected = await page.evaluate(() => window.__app.space().id);
  check(selected === fromSpace, `${label}: opens in ${fromSpace}`, selected);

  await traceHalf();
  const before = await progress();
  check(
    before.strokeIndex === 0 && before.frontier > 0 && before.frontier < before.total,
    `${label}: traced partway before the rotation`,
    `frontier ${before.frontier.toFixed(1)}/${before.total.toFixed(1)}`,
  );
  const beforeRatio = before.frontier / before.total;
  const stem = `${testCase.id}-${fromSpace}-to-${toSpace}`;
  await shot(`${stem}-before`);
  await shotLevel(`${stem}-before-closeup`);

  await page.setViewportSize(to);
  await page.waitForTimeout(900);

  const afterSpace = await page.evaluate(() => window.__app.space());
  const screen = await page.evaluate(() => window.__app.screen());
  check(afterSpace.id === toSpace, `${label}: rotates into ${toSpace}`, afterSpace.id);
  check(
    screen.name === 'level' && screen.levelId === 'pre-1',
    `${label}: stays on the running level`,
    JSON.stringify(screen),
  );
  await shot(`${stem}-after`);
  await shotLevel(`${stem}-after-closeup`);

  const after = await progress();
  const afterRatio = after.frontier / after.total;
  check(
    after.strokeIndex === before.strokeIndex,
    `${label}: stroke index kept`,
    `${before.strokeIndex} → ${after.strokeIndex}`,
  );
  check(
    Number.isFinite(afterRatio) && Math.abs(afterRatio - beforeRatio) <= 0.02,
    `${label}: proportional progress kept`,
    `${beforeRatio.toFixed(3)} → ${afterRatio.toFixed(3)}`,
  );
  await page.mouse.up();
  await wait(250);

  await completeLevel();
  check(await page.evaluate(() => window.__app.success()), `${label}: level still completes`);

  gallery.push({
    before: `${stem}-before`,
    beforeCloseup: `${stem}-before-closeup`,
    detail: `progress ${beforeRatio.toFixed(3)} → ${afterRatio.toFixed(3)}`,
    label,
    shot: `${stem}-after`,
    shotCloseup: `${stem}-after-closeup`,
  });
}

for (const testCase of CASES) {
  await rotateMidTrace(
    testCase,
    testCase.portrait,
    testCase.landscape,
    testCase.portraitSpace,
    testCase.landscapeSpace,
  );
  await rotateMidTrace(
    testCase,
    testCase.landscape,
    testCase.portrait,
    testCase.landscapeSpace,
    testCase.portraitSpace,
  );
}

writeFileSync(
  `${OUT}/gallery.html`,
  `<!doctype html>
<meta charset="utf-8">
<title>Tablet mid-trace rotation evidence — tablet-fit_20261006</title>
<style>
  body { background: #101418; color: #e8eef5; font: 14px/1.5 system-ui, sans-serif; margin: 24px; }
  h1 { font-size: 20px; } h2 { font-size: 15px; margin: 28px 0 8px; color: #9fd0ff; }
  figure { display: inline-block; margin: 0 16px 16px 0; vertical-align: top; }
  img { border: 1px solid #2c3a48; display: block; max-width: 320px; height: auto; }
  figcaption { color: #9fb0c0; margin-top: 4px; max-width: 320px; }
</style>
<h1>Mid-trace rotation across tablet spaces — tablet-fit_20261006 (Phase 2, task 3)</h1>
<p>Each row traces partway into <code>pre-1</code>, rotates the viewport while the
finger is still down, then finishes the level. Progress is read from
<code>window.__app.progress()</code> (consumed distance and stroke index on the
active run) before and after the rotation.</p>
${gallery
  .map(
    (entry) => `<h2>${entry.label}</h2>
<figure><img src="./${entry.before}.png" alt="${entry.before}"><figcaption>before rotation — ${entry.detail}</figcaption></figure>
<figure><img src="./${entry.shot}.png" alt="${entry.shot}"><figcaption>after rotation (same run, ${entry.detail})</figcaption></figure>
<figure><img src="./${entry.beforeCloseup}.png" alt="${entry.beforeCloseup}"><figcaption>before — painted prefix (close-up)</figcaption></figure>
<figure><img src="./${entry.shotCloseup}.png" alt="${entry.shotCloseup}"><figcaption>after — same prefix, re-laid (close-up)</figcaption></figure>`,
  )
  .join('\n')}
`,
);

check(gallery.length === 4, 'both families rotated in both directions', `${gallery.length} rotations`);
check(pageErrors.length === 0, 'no page errors', pageErrors.join(' | '));
console.log(`gallery: ${BASE}/dev/${OUT}/gallery.html`);
await browser.close();

console.log(
  failures.length === 0 ? 'tablet rotation QA passed' : `tablet rotation QA FAILED (${failures.length})`,
);
process.exitCode = failures.length === 0 ? 0 : 1;
