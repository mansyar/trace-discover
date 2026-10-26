// Parent-surface tablet matrix (track tablet-fit_20261006, Phase 5): opens the
// parent zone through the real 2.5s corner hold at the four tablet spaces plus
// both phone references, then drives the install panel and the name overlay.
// Asserts every parent target keeps half a toddler floor from the field edge and
// a full floor from its neighbours, that the zone uses the field's height, that
// the DOM name input lands inside the drawn overlay with a no-zoom font, and
// that no page errors appear. Writes labelled screenshots + a gallery.
// Usage: from dev/ — `pnpm exec vite --port 5199 --strictPort`, then
// `node qa/qa-tablet-parent.mjs` (PORT overrides 5199, a URL argument overrides
// the base).
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const PORT = Number(process.env.PORT) > 0 ? Number(process.env.PORT) : 5199;
const BASE = process.argv[2] ?? `http://localhost:${PORT}`;
const OUT = 'qa/out/tablet-parent';
const SAVE_KEY = 'trace-discover-save-v1';

/** The 90-unit toddler target floor, and half of it for edge clearance. */
const TARGET_FLOOR = 90;
const EDGE_MARGIN = TARGET_FLOOR / 2;
const SPACES = [
  { height: 1280, id: 'tablet-portrait', width: 960 },
  { height: 960, id: 'tablet-landscape', width: 1280 },
  { height: 1280, id: 'slate-portrait', width: 800 },
  { height: 800, id: 'slate-landscape', width: 1280 },
  { height: 860, id: 'phone-portrait', width: 430 },
  { height: 430, id: 'phone-landscape', width: 860 },
];
const TABLET_IDS = new Set(['tablet-portrait', 'tablet-landscape', 'slate-portrait', 'slate-landscape']);

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
const page = await browser.newPage({ hasTouch: true, viewport: { width: 430, height: 860 } });
const pageErrors = [];
page.on('pageerror', (error) => {
  pageErrors.push(error.message);
  console.error('PAGE ERROR:', error.message);
});

// A saved name means the overlay shows Clear and the menu carries the runtime
// name card - the state a parent actually meets after the first visit.
await page.addInitScript(
  ({ key }) => {
    window.localStorage.setItem(
      key,
      JSON.stringify({ badges: [], completedLevels: [], name: 'AIRA', settings: {}, version: 3 }),
    );
  },
  { key: SAVE_KEY },
);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const shots = [];

async function shot(spaceId, name, note = '') {
  const file = `${OUT}/${spaceId}-${name}.png`;
  await page.screenshot({ path: file });
  shots.push({ file: `${spaceId}-${name}.png`, label: `${spaceId} · ${name}${note ? ` · ${note}` : ''}` });
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

async function openSpace(space) {
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
  if ((await page.evaluate(() => window.__app.screen().name)) === 'splash') {
    await tap('splash');
    await page.waitForFunction(() => window.__app.screen().name === 'menu', null, { timeout: 20000 });
  }
  await wait(350);
}

/** The real gate gesture: one finger held in the corner zone for ~2.5s. */
async function holdGate() {
  const gate = await page.evaluate(() => window.__app.targets().find((entry) => entry.id === 'gate'));
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

/** Every exposed target with half a floor of edge clearance and a full floor
 *  between neighbours (centres closer than 90 units would overlap targets). */
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
    outside.length === 0,
    `${label}: every target keeps a half-floor inside the field`,
    outside.map((entry) => `${entry.id}@${Math.round(entry.x)},${Math.round(entry.y)}`).join(', '),
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
  check(
    closest >= TARGET_FLOOR,
    `${label}: neighbouring targets keep a full floor apart`,
    `${closestPair} ${closest.toFixed(1)}`,
  );
  return { closest, data };
}

/** The parent zone has to use the field, not huddle against the title: portrait
 *  anchors Done near the bottom edge, wide spreads and centers its two rows. */
async function assertZoneShape(label) {
  const data = await page.evaluate(() => ({
    space: window.__app.space(),
    targets: window.__app.targets(),
  }));
  const rows = [...new Set(data.targets.map((target) => Math.round(target.y)))].sort(
    (first, second) => first - second,
  );
  const highest = rows[0];
  const lowest = rows[rows.length - 1];
  if (data.space.width <= data.space.height) {
    check(
      highest <= data.space.height * 0.3,
      `${label}: the card stack starts in the top third`,
      `${highest} of ${data.space.height}`,
    );
    check(
      lowest >= data.space.height - 150,
      `${label}: Done sits at the bottom of the field`,
      `${lowest} of ${data.space.height}`,
    );
  } else {
    check(rows.length === 2, `${label}: the wide zone is two control rows`, rows.join(','));
    check(
      lowest - highest >= data.space.height / 3,
      `${label}: the two rows spread across the field`,
      `${lowest - highest} of ${data.space.height}`,
    );
    check(
      Math.abs((highest + lowest) / 2 - data.space.height / 2) <= 60,
      `${label}: the row block sits centered`,
      `centre ${Math.round((highest + lowest) / 2)} of ${data.space.height / 2}`,
    );
  }
}

/** The DOM name input must land inside the drawn panel with a no-zoom font. */
async function assertNameInput(label) {
  const data = await page.evaluate(() => {
    const input = document.querySelector('.name-input');
    if (!input || !input.classList.contains('is-open')) {
      return null;
    }
    const field = window.__app.field();
    const space = window.__app.space();
    const rect = input.getBoundingClientRect();
    const scale = space.width / field.width;
    return {
      fontSize: Number.parseFloat(getComputedStyle(input).fontSize),
      space,
      units: {
        bottom: (rect.bottom - field.y) * scale,
        left: (rect.left - field.x) * scale,
        right: (rect.right - field.x) * scale,
        top: (rect.top - field.y) * scale,
      },
    };
  });
  if (!data) {
    check(false, `${label}: the name input is mounted while the overlay is open`);
    return;
  }
  const { units } = data;
  check(
    units.left >= 0 &&
      units.top >= 0 &&
      units.right <= data.space.width &&
      units.bottom <= data.space.height,
    `${label}: the name input sits inside the field`,
    `${Math.round(units.left)},${Math.round(units.top)} → ${Math.round(units.right)},${Math.round(units.bottom)}`,
  );
  check(
    data.fontSize >= 16,
    `${label}: the name input font clears iOS's no-zoom floor`,
    `${data.fontSize}px`,
  );
  check(
    units.bottom <= data.space.height * 0.75,
    `${label}: the input stays above the soft keyboard's band`,
    `bottom ${Math.round(units.bottom)} of ${data.space.height}`,
  );
}

for (const space of SPACES) {
  const tablet = TABLET_IDS.has(space.id);
  console.log(`\n== ${space.id} (${space.width}x${space.height})${tablet ? '' : ' — phone reference'}`);

  await openSpace(space);
  await toMenu();
  await holdGate();
  check(
    (await page.evaluate(() => window.__app.screen().name)) === 'parent',
    `${space.id}: the corner hold opens the parent zone`,
  );
  await assertTargets(`${space.id} parent`);
  await assertZoneShape(`${space.id} parent`);
  await shot(space.id, 'parent');

  // Reset-confirm banner: the same target taps twice, and the copy has to sit
  // over the trophy band rather than mid-field.
  await tap('parent:reset');
  await shot(space.id, 'parent-confirm');
  await tap('parent:reset');

  // Install guide.
  await tap('parent:install');
  await page.waitForTimeout(300);
  await shot(space.id, 'install');
  await tap('parent:install');

  // Name overlay: DOM input over the drawn frame, Clear only with a saved name.
  await tap('parent:name');
  const overlayIds = await page.evaluate(() => window.__app.targets().map((entry) => entry.id));
  check(
    overlayIds.includes('name:save') && overlayIds.includes('name:cancel'),
    `${space.id}: the name overlay exposes save and cancel`,
    overlayIds.join(','),
  );
  check(overlayIds.includes('name:clear'), `${space.id}: a saved name opens Clear`);
  await assertTargets(`${space.id} name overlay`);
  await assertNameInput(`${space.id} name overlay`);
  await shot(space.id, 'name-overlay');
  await page.fill('.name-input', 'ZOE');
  const typed = await page.evaluate(() => document.querySelector('.name-input').value);
  check(typed === 'ZOE', `${space.id}: the name input accepts typing`, typed);
  await tap('name:cancel');
  check(
    (await page.evaluate(() => window.__app.screen().name)) === 'parent',
    `${space.id}: cancel returns to the parent zone`,
  );
  await tap('parent:done');
  check(
    (await page.evaluate(() => window.__app.screen().name)) === 'menu',
    `${space.id}: done returns to the menu`,
  );
}

check(pageErrors.length === 0, 'no uncaught page errors', pageErrors.join(' | '));
check(failures.length === 0, 'every check passed', failures.join(' | '));

writeFileSync(
  `${OUT}/gallery.html`,
  `<!doctype html><meta charset="utf-8"><title>Tablet parent surfaces</title>
<style>
body{font:14px/1.5 system-ui,sans-serif;background:#f7f4e8;color:#2e4a63;margin:24px}
h1{font-size:18px}h2{font-size:15px;margin-top:28px}
figure{margin:0;display:inline-block;vertical-align:top;width:300px}
img{width:100%;border:1px solid #2e4a63;border-radius:8px;background:#fff}
figcaption{font-size:12px;padding:4px 0}
</style>
<h1>Tablet parent surfaces — every space, every screen</h1>
${SPACES.map(
  (space) => `<h2>${space.id} — ${space.width}×${space.height}</h2>
${shots
  .filter((entry) => entry.file.startsWith(`${space.id}-`))
  .map(
    (entry) =>
      `<figure><img src="${entry.file}" alt="${entry.label}"><figcaption>${entry.label}</figcaption></figure>`,
  )
  .join('\n')}`,
).join('\n')}
`,
);

console.log(`\n${shots.length} shots · ${failures.length} failures`);
await browser.close();
process.exit(failures.length === 0 ? 0 : 1);
