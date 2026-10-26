// Canonical tablet QA matrix (track tablet-fit_20261006, Phase 6).
//
// Turns the per-phase evidence probes into one matrix: the four tablet spaces
// (4:3 and 16:10, portrait and landscape) with a per-screen sweep — splash,
// menu, pack pages, sticker board, level, success, badge, parent zone, install
// card and name overlay — asserting for every screen that
//   - the field fills the viewport (bars <= 1 CSS px at an exact-anchor ratio),
//   - every exposed target keeps half a 90-unit toddler floor from each edge,
//   - neighbouring targets keep a full floor apart,
//   - the menu exposes its six packs + gate + skin switch (8) and the parent
//     zone all nine controls,
// then rotating the viewport mid-menu and mid-trace (4:3 and 16:10, both
// directions) with state + progress assertions and a completed run after the
// rotate. Writes labelled screenshots + a gallery page.
// Usage: from dev/ — `pnpm exec vite --port 5199 --strictPort`, then
// `node qa/qa-tablet.mjs` (PORT overrides 5199, a URL argument overrides the base).
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const PORT = Number(process.env.PORT) > 0 ? Number(process.env.PORT) : 5199;
const BASE = process.argv[2] ?? `http://localhost:${PORT}`;
const OUT = 'qa/out/tablet';
const SAVE_KEY = 'trace-discover-save-v1';

/** Half the 90-unit toddler target floor: no target centre may sit closer. */
const TARGET_FLOOR = 90;
const EDGE_MARGIN = TARGET_FLOOR / 2;
/** Exact-anchor spaces must leave no bar wider than a rounding pixel. */
const BAR_TOLERANCE = 1;
/** A nearest-anchor miss may letterbox, but only on one axis and evenly: an
 *  Android 3:2 viewport lands on the 16:10 anchor and loses 5 % per long side
 *  (10 % of the area), the documented nearest-anchor tolerance. */
const MAX_NEAREST_BAR_SHARE = 0.05;

/** The four tablet spaces: 4:3 (iPad) and 16:10 (Android slate). */
const SPACES = [
  { height: 1280, id: 'tablet-portrait', width: 960 },
  { height: 960, id: 'tablet-landscape', width: 1280 },
  { height: 1280, id: 'slate-portrait', width: 800 },
  { height: 800, id: 'slate-landscape', width: 1280 },
];

/** Physically rotatable pairs, for the mid-gesture reflow cases. */
const ROTATIONS = [
  {
    id: 'tablet-4x3',
    landscape: { height: 960, id: 'tablet-landscape', width: 1280 },
    portrait: { height: 1280, id: 'tablet-portrait', width: 960 },
  },
  {
    id: 'slate-16x10',
    landscape: { height: 800, id: 'slate-landscape', width: 1280 },
    portrait: { height: 1280, id: 'slate-portrait', width: 800 },
  },
];

/** The pre pack is one level short of its badge (`pre-1` stays open), so tracing
 *  it to success and pressing next lands on the badge screen; the cleared ABC
 *  letters open the sequence bonus and give the portrait pack a pager. */
const CLEARED = [
  ...Array.from({ length: 14 }, (_, index) => `pre-${index + 2}`),
  'abc-a',
  'abc-b',
  'abc-c',
  'abc-d',
  'numbers-1',
  'shapes-circle',
  'patterns-1',
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
const page = await browser.newPage({ hasTouch: true, viewport: { width: 960, height: 1280 } });
const pageErrors = [];
page.on('pageerror', (error) => {
  pageErrors.push(error.message);
  console.error('PAGE ERROR:', error.message);
});

await page.addInitScript(
  ({ completed, key }) => {
    window.localStorage.setItem(
      key,
      JSON.stringify({ badges: [], completedLevels: completed, settings: {}, version: 3 }),
    );
  },
  { completed: CLEARED, key: SAVE_KEY },
);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const shots = [];

async function shot(spaceId, name, note = '') {
  const file = `${OUT}/${spaceId}-${name}.png`;
  await page.screenshot({ path: file });
  shots.push({ file: `${spaceId}-${name}.png`, label: `${spaceId} · ${name}` });
  console.log(`shot ${spaceId}/${name}${note ? ` | ${note}` : ''}`);
}

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
    return false;
  }
  const point = await toClient(target);
  await page.mouse.click(point.x, point.y);
  await wait(330);
  return true;
}

const screenName = () => page.evaluate(() => window.__app.screen().name);

/** Boots a viewport into its space with the seeded save, landing on splash/menu. */
async function boot(space) {
  await page.setViewportSize({ width: space.width, height: space.height });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__app !== undefined, null, { timeout: 30000 });
  await page.waitForFunction(
    () => window.__app.screen().name === 'splash' || window.__app.screen().name === 'menu',
    null,
    { timeout: 30000 },
  );
  await wait(500);
}

async function toMenu() {
  if ((await screenName()) === 'splash') {
    await tap('splash');
    await page.waitForFunction(() => window.__app.screen().name === 'menu', null, {
      timeout: 20000,
    });
  }
  await wait(350);
}

/** Field fill: an exact anchor leaves no bar; a nearest-anchor miss must keep the
 *  field centered inside the viewport instead. */
async function assertFill(label, exact = true) {
  const data = await page.evaluate(() => {
    const field = window.__app.field();
    return {
      bottom: window.innerHeight - (field.y + field.height),
      left: field.x,
      right: window.innerWidth - (field.x + field.width),
      space: window.__app.space(),
      top: field.y,
    };
  });
  const bars = [data.left, data.top, data.right, data.bottom];
  const worst = Math.max(...bars);
  if (exact) {
    check(
      worst <= BAR_TOLERANCE,
      `${label}: the field fills the viewport`,
      `worst bar ${worst.toFixed(2)}px (${data.space.id})`,
    );
  } else {
    check(
      Math.min(...bars) >= 0 &&
        Math.abs(data.left - data.right) <= 1 &&
        Math.abs(data.top - data.bottom) <= 1,
      `${label}: the field is centered inside the viewport`,
      `l/r ${data.left.toFixed(1)}/${data.right.toFixed(1)} t/b ${data.top.toFixed(1)}/${data.bottom.toFixed(1)} (${data.space.id})`,
    );
  }
  return data;
}

/** Target floors: half a floor from each edge, a full floor between neighbours. */
async function assertTargets(label) {
  const data = await page.evaluate(() => ({
    space: window.__app.space(),
    targets: window.__app.targets(),
  }));
  const outside = data.targets.filter(
    (target) =>
      target.x < EDGE_MARGIN ||
      target.y < EDGE_MARGIN ||
      target.x > data.space.width - EDGE_MARGIN ||
      target.y > data.space.height - EDGE_MARGIN,
  );
  check(
    data.targets.length > 0 && outside.length === 0,
    `${label}: every target sits a half-floor inside the field`,
    outside.length === 0
      ? `${data.targets.length} targets`
      : outside.map((entry) => entry.id).join(', '),
  );
  let closest = Number.POSITIVE_INFINITY;
  let closestPair = '';
  for (let first = 0; first < data.targets.length; first += 1) {
    for (let second = first + 1; second < data.targets.length; second += 1) {
      const a = data.targets[first];
      const b = data.targets[second];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance < closest) {
        closest = distance;
        closestPair = `${a.id}↔${b.id}`;
      }
    }
  }
  if (Number.isFinite(closest)) {
    check(
      closest >= TARGET_FLOOR,
      `${label}: neighbouring targets keep a full floor apart`,
      `${closestPair} ${closest.toFixed(1)}`,
    );
  }
  return data.targets;
}

async function expectTargetCount(label, expected) {
  const count = await page.evaluate(() => window.__app.targets().length);
  check(count === expected, `${label}: exposes ${expected} targets`, `${count}`);
}

/** The real gate gesture: one finger held in the corner zone for ~2.5s. */
async function holdGate() {
  const gate = await page.evaluate(() =>
    window.__app.targets().find((entry) => entry.id === 'gate'),
  );
  const point = await toClient({ x: gate.x, y: gate.y });
  await page.evaluate(({ x, y }) => {
    const canvas = document.querySelector('.game-canvas');
    canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: x,
        clientY: y,
        isPrimary: true,
        pointerId: 91,
        pointerType: 'touch',
      }),
    );
  }, point);
  await page.waitForFunction(() => window.__app.screen().name === 'parent', null, {
    timeout: 12000,
  });
  await page.evaluate(({ x, y }) => {
    const canvas = document.querySelector('.game-canvas');
    canvas.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        clientX: x,
        clientY: y,
        isPrimary: true,
        pointerId: 91,
        pointerType: 'touch',
      }),
    );
  }, point);
  await wait(400);
}

/** Points along a stroke, densified so pointermove sampling hits every segment. */
function densify(points, step = 9) {
  const out = [];
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    if (!from || !to) {
      continue;
    }
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(distance / step));
    for (let stepIndex = 0; stepIndex <= steps; stepIndex += 1) {
      out.push({
        x: from.x + ((to.x - from.x) * stepIndex) / steps,
        y: from.y + ((to.y - from.y) * stepIndex) / steps,
      });
    }
  }
  return out;
}

/** Traces every stroke of the open level, the way a finger would. */
async function traceLevel() {
  const strokes = await page.evaluate(() => window.__app.strokes());
  for (const stroke of strokes) {
    const dense = densify(stroke);
    const start = dense[0];
    if (!start) {
      continue;
    }
    const first = await toClient(start);
    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    for (let index = 0; index < dense.length; index += 2) {
      const point = await toClient(dense[index]);
      await page.mouse.move(point.x, point.y);
      await wait(30);
    }
    const end = dense[dense.length - 1];
    if (end) {
      const last = await toClient(end);
      for (let hold = 0; hold < 4; hold += 1) {
        await page.mouse.move(last.x, last.y);
        await wait(60);
      }
    }
    await page.mouse.up();
    await wait(70);
  }
  await page.waitForFunction(() => window.__app.success() === true, null, { timeout: 20000 });
  await wait(700);
}

async function openLevel(space) {
  await boot(space);
  await toMenu();
  await tap('pack:pre');
  await tap('level:pre-1');
  await page.waitForFunction(() => window.__app.strokes().length > 0, null, { timeout: 15000 });
  await wait(900); // let the level-start entrance hop settle
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

/** Traces the first half of stroke 0 and holds the finger down. */
async function traceHalf() {
  const stroke = (await readStrokes())[0];
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
  for (const stroke of await readStrokes()) {
    const first = await toClient(stroke[0]);
    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    for (const point of stroke) {
      const client = await toClient(point);
      await page.mouse.move(client.x, client.y, { steps: 2 });
      await wait(40);
    }
    const last = await toClient(stroke[stroke.length - 1]);
    for (let hold = 0; hold < 6; hold += 1) {
      await page.mouse.move(last.x, last.y, { steps: 1 });
      await wait(80);
    }
    await page.mouse.up();
    await wait(200);
  }
  await page.waitForFunction(() => window.__app.success(), null, { timeout: 45000 });
}

// ---------------------------------------------------------------------------
// 1. Per-space screen matrix.
// ---------------------------------------------------------------------------
for (const space of SPACES) {
  console.log(`\n== ${space.id} (${space.width}x${space.height})`);

  await boot(space);
  check(
    (await page.evaluate(() => window.__app.space().id)) === space.id,
    `${space.id}: the viewport selects its own space`,
  );
  await assertFill(`${space.id} splash`);
  await expectTargetCount(`${space.id} splash`, 1);
  await shot(space.id, 'splash');

  await toMenu();
  await assertFill(`${space.id} menu`);
  await expectTargetCount(`${space.id} menu`, 8);
  await assertTargets(`${space.id} menu`);
  await shot(space.id, 'menu');

  // Pack grid + pager page two (the portrait ABC grid paginates).
  await tap('pack:abc');
  await assertFill(`${space.id} pack`);
  await assertTargets(`${space.id} pack`);
  await shot(space.id, 'pack-abc');
  if (await tap('pager:next')) {
    await assertTargets(`${space.id} pack page two`);
    await shot(space.id, 'pack-abc-page2');
  }

  // Sticker board from the pack's shelf band.
  if (await tap('pack:shelf')) {
    if ((await screenName()) === 'sticker-board') {
      await assertFill(`${space.id} board`);
      await assertTargets(`${space.id} board`);
      await shot(space.id, 'sticker-board');
      await tap('board:home');
    }
  }
  await tap('pack:home');
  await wait(200);

  // Level → success → badge.
  await openLevel(space);
  await assertFill(`${space.id} level`);
  await expectTargetCount(`${space.id} level`, 1);
  await shot(space.id, 'level');
  await traceLevel();
  await assertFill(`${space.id} success`);
  await assertTargets(`${space.id} success`);
  await shot(space.id, 'success');
  if (await tap('success:next')) {
    if ((await screenName()) === 'badge') {
      await wait(400);
      await assertFill(`${space.id} badge`);
      await assertTargets(`${space.id} badge`);
      await shot(space.id, 'badge');
    }
  }

  // Parent zone, install card and name overlay.
  await boot(space);
  await toMenu();
  await holdGate();
  await assertFill(`${space.id} parent`);
  await expectTargetCount(`${space.id} parent`, 9);
  await assertTargets(`${space.id} parent`);
  await shot(space.id, 'parent');
  await tap('parent:install');
  await wait(300);
  await shot(space.id, 'install');
  await tap('parent:install');
  await tap('parent:name');
  await assertFill(`${space.id} name overlay`);
  const overlayIds = await page.evaluate(() => window.__app.targets().map((entry) => entry.id));
  check(
    overlayIds.includes('name:save') && overlayIds.includes('name:cancel'),
    `${space.id}: the name overlay exposes save and cancel`,
    overlayIds.join(','),
  );
  await assertTargets(`${space.id} name overlay`);
  const fontPx = await page.evaluate(() =>
    Number.parseFloat(getComputedStyle(document.querySelector('.name-input')).fontSize),
  );
  check(fontPx >= 16, `${space.id}: the name input font clears the no-zoom floor`, `${fontPx}px`);
  await shot(space.id, 'name-overlay');
  await tap('name:cancel');
  await tap('parent:done');
}

// ---------------------------------------------------------------------------
// 2. A nearest-anchor viewport (Android 3:2) is allowed a letterbox bar, but
//    only on one axis, evenly, and every target must still be in bounds.
// ---------------------------------------------------------------------------
console.log('\n== nearest anchor (3:2 portrait, 1080x1920)');
await boot({ height: 1920, width: 1080 });
const nearest = await assertFill('3:2 splash', false);
check(
  nearest.space.id === 'slate-portrait',
  '3:2 portrait: the nearest anchor is the 16:10 slate',
  nearest.space.id,
);
const bars = [nearest.left, nearest.top, nearest.right, nearest.bottom];
const barLimit = MAX_NEAREST_BAR_SHARE * 1920 + BAR_TOLERANCE;
check(
  Math.max(...bars) <= barLimit,
  `3:2 portrait: each letterbox bar stays under ${(MAX_NEAREST_BAR_SHARE * 100).toFixed(0)}% of its axis`,
  `${bars.map((bar) => bar.toFixed(1)).join('/')} (limit ${barLimit.toFixed(1)})`,
);
check(
  Math.abs(nearest.left - nearest.right) <= 1 || Math.abs(nearest.top - nearest.bottom) <= 1,
  '3:2 portrait: the bar is symmetric on its axis',
  `l/r ${nearest.left.toFixed(1)}/${nearest.right.toFixed(1)} t/b ${nearest.top.toFixed(1)}/${nearest.bottom.toFixed(1)}`,
);
await toMenu();
await assertTargets('3:2 portrait menu');
await shot('nearest-3x2', 'menu');

// ---------------------------------------------------------------------------
// 3. Rotation reflow: mid-menu (state kept) and mid-trace (progress kept),
//    both families, both directions.
// ---------------------------------------------------------------------------
for (const rotation of ROTATIONS) {
  const label = rotation.id;

  // Mid-menu: the menu survives a rotation and re-lays in the new space.
  await boot(rotation.portrait);
  await toMenu();
  const beforeMenuSpace = await page.evaluate(() => window.__app.space().id);
  await page.setViewportSize({ width: rotation.landscape.width, height: rotation.landscape.height });
  await wait(700);
  check(
    (await page.evaluate(() => window.__app.space().id)) === rotation.landscape.id,
    `${label} mid-menu: portrait → landscape re-selects the space`,
    `${beforeMenuSpace} → ${rotation.landscape.id}`,
  );
  check((await screenName()) === 'menu', `${label} mid-menu: the menu survives the rotate`);
  await assertFill(`${label} mid-menu landscape`);
  await assertTargets(`${label} mid-menu landscape`);
  await shot(`${label}-menu`, 'landscape');
  await page.setViewportSize({ width: rotation.portrait.width, height: rotation.portrait.height });
  await wait(700);
  check(
    (await page.evaluate(() => window.__app.space().id)) === rotation.portrait.id,
    `${label} mid-menu: landscape → portrait returns to the authored space`,
    rotation.portrait.id,
  );
  await assertTargets(`${label} mid-menu portrait`);

  // Mid-trace: partway through stroke 0, rotate with the finger still down.
  await openLevel(rotation.portrait);
  await traceHalf();
  const before = await page.evaluate(() => window.__app.progress());
  const beforeRatio = before.frontier / before.total;
  check(
    before.strokeIndex === 0 && before.frontier > 0 && before.frontier < before.total,
    `${label} mid-trace: traced partway before the rotate`,
    `frontier ${before.frontier.toFixed(1)}/${before.total.toFixed(1)}`,
  );
  await page.setViewportSize({ width: rotation.landscape.width, height: rotation.landscape.height });
  await wait(900);
  const after = await page.evaluate(() => window.__app.progress());
  const afterRatio = after.frontier / after.total;
  const afterScreen = await page.evaluate(() => window.__app.screen());
  check(
    afterScreen.name === 'level' && afterScreen.levelId === 'pre-1',
    `${label} mid-trace: stays on the running level`,
    JSON.stringify(afterScreen),
  );
  check(
    after.strokeIndex === before.strokeIndex,
    `${label} mid-trace: stroke index kept`,
    `${before.strokeIndex} → ${after.strokeIndex}`,
  );
  check(
    Number.isFinite(afterRatio) && Math.abs(afterRatio - beforeRatio) <= 0.02,
    `${label} mid-trace: proportional progress kept`,
    `${beforeRatio.toFixed(3)} → ${afterRatio.toFixed(3)}`,
  );
  await assertFill(`${label} mid-trace landscape`);
  await shot(`${label}-trace`, 'landscape-after-rotate');
  await page.mouse.up();
  await wait(250);

  await completeLevel();
  check(
    await page.evaluate(() => window.__app.success()),
    `${label} mid-trace: the rotated run still completes`,
  );
  // And the success screen survives a rotate back to portrait.
  await page.setViewportSize({ width: rotation.portrait.width, height: rotation.portrait.height });
  await wait(700);
  check(
    (await page.evaluate(() => window.__app.space().id)) === rotation.portrait.id &&
      (await screenName()) === 'success',
    `${label} mid-trace: success survives the rotate back to portrait`,
  );
  await assertTargets(`${label} success portrait`);
  await shot(`${label}-success`, 'portrait');
}

check(pageErrors.length === 0, 'no uncaught page errors', pageErrors.join(' | '));
check(failures.length === 0, 'every check passed', failures.join(' | '));

writeFileSync(
  `${OUT}/gallery.html`,
  `<!doctype html><meta charset="utf-8"><title>Tablet QA matrix</title>
<style>
body{font:14px/1.5 system-ui,sans-serif;background:#f7f4e8;color:#2e4a63;margin:24px}
h1{font-size:18px}h2{font-size:15px;margin-top:28px}
figure{margin:0;display:inline-block;vertical-align:top;width:300px}
img{width:100%;border:1px solid #2e4a63;border-radius:8px;background:#fff}
figcaption{font-size:12px;padding:4px 0}
</style>
<h1>Tablet QA matrix — every tablet space, every screen</h1>
${[...new Set(shots.map((entry) => entry.file.split('-')[0]))]
  .map(
    (prefix) => `<h2>${prefix}</h2>
${shots
  .filter((entry) => entry.file.startsWith(`${prefix}-`))
  .map(
    (entry) =>
      `<figure><img src="${entry.file}" alt="${entry.label}"><figcaption>${entry.label}</figcaption></figure>`,
  )
  .join('\n')}`,
  )
  .join('\n')}
`,
);

console.log(`\n${shots.length} shots · ${failures.length} failures`);
await browser.close();
process.exit(failures.length === 0 ? 0 : 1);
