// Child-surface tablet matrix (track tablet-fit_20261006, Phase 4): drives every
// child screen — splash, menu, pack (portrait grid, landscape rows, pager page
// two), sticker board, level, success and badge — at the four tablet spaces plus
// both phone references, asserts the surfaces stay in-bounds with the 90-unit
// target floor held (target centers keep half a floor from every field edge), the
// parked mascot's box stays whole inside the field, and no page errors appear.
// Writes labelled screenshots + a gallery page for owner review.
// Usage: from dev/ — `pnpm exec vite --port 5199 --strictPort`, then
// `node qa/qa-tablet-surfaces.mjs` (PORT overrides 5199, a URL argument overrides
// the base).
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const PORT = Number(process.env.PORT) > 0 ? Number(process.env.PORT) : 5199;
const BASE = process.argv[2] ?? `http://localhost:${PORT}`;
const OUT = 'qa/out/tablet-surfaces';
const SAVE_KEY = 'trace-discover-save-v1';

/** Half the 90-unit toddler target floor: no target may sit closer to an edge. */
const TARGET_FLOOR = 90;
const EDGE_MARGIN = TARGET_FLOOR / 2;
/** A parked mascot may kiss the edge by under a unit (the authored phone parks do). */
const MASCOT_EDGE_TOLERANCE = 1.5;

/** Every design space worth a matrix row: the four tablet spaces, plus the two
 *  phone references the tablet output must not disturb. */
const SPACES = [
  { height: 1280, id: 'tablet-portrait', width: 960 },
  { height: 960, id: 'tablet-landscape', width: 1280 },
  { height: 1280, id: 'slate-portrait', width: 800 },
  { height: 800, id: 'slate-landscape', width: 1280 },
  { height: 860, id: 'phone-portrait', width: 430 },
  { height: 430, id: 'phone-landscape', width: 860 },
];
const TABLET_IDS = new Set(['tablet-portrait', 'tablet-landscape', 'slate-portrait', 'slate-landscape']);

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
const page = await browser.newPage({ hasTouch: true, viewport: { width: 430, height: 860 } });
const pageErrors = [];
page.on('pageerror', (error) => {
  pageErrors.push(error.message);
  console.error('PAGE ERROR:', error.message);
});

// Seed: a mixed save so the splash skips onboarding, packs show both cleared and
// open levels, and the sticker shelf has art.
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

async function shot(spaceId, name, note = '') {
  const file = `${OUT}/${spaceId}-${name}.png`;
  await page.screenshot({ path: file });
  shots.push({ file: `${spaceId}-${name}.png`, label: `${spaceId} · ${name}${note ? ` · ${note}` : ''}` });
  console.log(`shot ${spaceId}/${name}${note ? ` | ${note}` : ''}`);
}

const shots = [];

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

/** Opens the app at a space with the save seeded, landing on the first screen. */
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

/** Every exposed target inside the design space, with half a toddler floor of
 *  margin by default. The sticker board passes a smaller margin on the phone
 *  references: the board sizes its own cells to fit 29 levels, and the phone
 *  board has always shrunk below the 90-unit floor (pre-existing), while every
 *  tablet board holds it. */
async function assertTargetsInside(label, margin = EDGE_MARGIN) {
  const data = await page.evaluate(() => ({
    space: window.__app.space(),
    targets: window.__app.targets(),
  }));
  const outside = data.targets.filter(
    (target) =>
      target.x < margin ||
      target.y < margin ||
      target.x > data.space.width - margin ||
      target.y > data.space.height - margin,
  );
  check(
    outside.length === 0,
    `${label}: every target sits ${margin === EDGE_MARGIN ? 'a half-floor ' : ''}inside the field`,
    outside.length === 0 ? '' : outside.map((entry) => entry.id).join(', '),
  );
}

/** The parked mascot's canvas box, converted back into design units. */
async function mascotBox() {
  return page.evaluate(() => {
    const canvas = document.querySelector('#char');
    if (!canvas || canvas.style.display === 'none') {
      return null;
    }
    const field = window.__app.field();
    const space = window.__app.space();
    const rect = canvas.getBoundingClientRect();
    const scale = space.width / field.width;
    return {
      bottom: (rect.bottom - field.y) * scale,
      left: (rect.left - field.x) * scale,
      right: (rect.right - field.x) * scale,
      space,
      top: (rect.top - field.y) * scale,
    };
  });
}

/** The character canvas carries a little transparent padding under the drawn
 *  feet (about 9% of its box on the phone references), so the in-level sprite is
 *  allowed to hang below by that authored share and no more. */
async function assertMascotInside(label, hangShare = 0) {
  const box = await mascotBox();
  if (!box) {
    return;
  }
  const slack = MASCOT_EDGE_TOLERANCE;
  const slackBelow = slack + hangShare * (box.bottom - box.top);
  const inside =
    box.left >= -slack &&
    box.top >= -slack &&
    box.right <= box.space.width + slack &&
    box.bottom <= box.space.height + slackBelow;
  check(
    inside,
    `${label}: the parked mascot's box stays inside the field${hangShare > 0 ? ' (authored below-park padding allowed)' : ""}`,
    inside
      ? `${Math.round(box.left)},${Math.round(box.top)} → ${Math.round(box.right)},${Math.round(box.bottom)}`
      : `${Math.round(box.left)},${Math.round(box.top)} → ${Math.round(box.right)},${Math.round(box.bottom)} in ${box.space.width}x${box.space.height}`,
  );
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

/** Card widths per menu row, to name the arrangement in the log. */
async function menuColumns() {
  return page.evaluate(() => {
    const cards = window.__app.targets().filter((entry) => entry.id.startsWith('pack:'));
    return new Set(cards.map((card) => Math.round(card.x))).size;
  });
}

for (const space of SPACES) {
  const tablet = TABLET_IDS.has(space.id);
  console.log(`\n== ${space.id} (${space.width}x${space.height})${tablet ? '' : ' — phone reference'}`);

  // 1. Splash.
  await openSpace(space);
  check(
    (await page.evaluate(() => window.__app.space().id)) === space.id,
    `${space.id}: the viewport selects its own space`,
  );
  await shot(space.id, 'splash');
  await assertMascotInside(`${space.id} splash`);

  // 2. Menu.
  await toMenu();
  await assertTargetsInside(`${space.id} menu`);
  await assertMascotInside(`${space.id} menu`);
  await shot(space.id, 'menu', `${await menuColumns()} columns`);

  // 3. Every pack grid, then the ABC pager's second page (its portrait grid
  // paginates, so the pager row and the recomposed page both get a check).
  const packIds = await page.evaluate(() =>
    window.__app
      .targets()
      .filter((entry) => entry.id.startsWith('pack:') && entry.id !== 'pack:badge')
      .map((entry) => entry.id.slice('pack:'.length)),
  );
  check(packIds.length >= 6, `${space.id} menu: every static pack is on the page`, packIds.join(','));
  for (const packId of packIds) {
    if (!(await tap(`pack:${packId}`))) {
      continue;
    }
    await assertTargetsInside(`${space.id} pack ${packId}`);
    await assertMascotInside(`${space.id} pack ${packId}`);
    await shot(space.id, `pack-${packId}`);
    if (packId === 'abc' && (await tap('pager:next'))) {
      await assertTargetsInside(`${space.id} pack abc page 2`);
      await shot(space.id, 'pack-abc-page2');
    }
    await tap('pack:home');
    await wait(250);
  }
  await tap('pack:abc');

  // 4. Sticker board from the pack's shelf band.
  if (await tap('pack:shelf')) {
    const screen = await page.evaluate(() => window.__app.screen().name);
    if (screen === 'sticker-board') {
      await assertTargetsInside(`${space.id} sticker board`, tablet ? EDGE_MARGIN : 2);
      await shot(space.id, 'sticker-board');
    }
  }

  // 5. Level + success on pre-1.
  await openSpace(space);
  await toMenu();
  await tap('pack:pre');
  await tap('level:pre-1');
  await page.waitForFunction(() => window.__app.strokes().length > 0, null, { timeout: 15000 });
  await wait(900);
  await assertMascotInside(`${space.id} level`, 0.15);
  await shot(space.id, 'level-pre-1');
  await traceLevel();
  await assertTargetsInside(`${space.id} success`);
  await assertMascotInside(`${space.id} success`);
  await shot(space.id, 'success');

  // 6. Badge celebration: the pack's last open level was just cleared, so the
  // success screen's next action opens the badge screen.
  await tap('success:next');
  await page.waitForFunction(() => window.__app.screen().name === 'badge', null, {
    timeout: 15000,
  });
  await wait(400);
  await assertTargetsInside(`${space.id} badge`);
  await shot(space.id, 'badge');
}

check(pageErrors.length === 0, 'no uncaught page errors', pageErrors.join(' | '));
check(failures.length === 0, 'every check passed', failures.join(' | '));

writeFileSync(
  `${OUT}/gallery.html`,
  `<!doctype html><meta charset="utf-8"><title>Tablet child surfaces</title>
<style>
body{font:14px/1.5 system-ui,sans-serif;background:#f7f4e8;color:#2e4a63;margin:24px}
h1{font-size:18px}h2{font-size:15px;margin-top:28px}
figure{margin:0;display:inline-block;vertical-align:top;width:300px}
img{width:100%;border:1px solid #2e4a63;border-radius:8px;background:#fff}
figcaption{font-size:12px;padding:4px 0}
</style>
<h1>Tablet child surfaces — every space, every screen</h1>
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
