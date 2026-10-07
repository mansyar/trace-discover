// Row-band evidence probe (track tablet-fit_20261006, Phase 2 Task 4): drives
// the real app to the word rows it composes at runtime — the 7-letter My Name
// row, the shortest-name cap reference, and the ABC sequence bonus — in all
// four tablet/slate spaces plus both phone references, asserts the band
// placement, the field fit and the "never larger than one authored letter" cap
// live from `window.__app.strokes()`, and writes labelled screenshots + a
// gallery page for owner review. The paginated menu's runtime name card is
// reached through the `menu:next` target (the pager spots main.ts exposes for
// dev QA).
// Usage: from dev/ — `pnpm exec vite --port 5199 --strictPort`, then
// `node qa/qa-tablet-rows.mjs` (PORT overrides 5199, a URL argument overrides
// the base).
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const PORT = Number(process.env.PORT) > 0 ? Number(process.env.PORT) : 5199;
const BASE = process.argv[2] ?? `http://localhost:${PORT}`;
const OUT = 'qa/out/tablet-rows';
const SAVE_KEY = 'trace-discover-save-v1';

/** The recomposition case: a 7-letter name (its natural row width is 947 units). */
const NAME = 'AIRAABC';
const NAME_NATURAL = 947;
/** The shortest allowed name: the authored-size cap reference. */
const CAP_NAME = 'CC';
/** The ABC sequence bonus word (its natural row width is 384 units). */
const ABC_NATURAL = 384;

// Every design space with its row band: the shipped portrait fraction (470/860
// of the height), the centred landscape row, and the shipped band height. Each
// space also carries the authored trace-park fraction (session.ts TRACE_PARK /
// TRACE_PARK_WIDE over the phone reference), which the mascot must keep as the
// field grows.
const TRACE_PORTRAIT = { x: 215 / 430, y: 650 / 860 };
const TRACE_LANDSCAPE = { x: 430 / 860, y: 310 / 430 };
const SPACES = [
  { bandHeight: 380, centerY: 470, height: 860, id: 'phone-portrait', trace: TRACE_PORTRAIT, width: 430 },
  { bandHeight: 350, centerY: 215, height: 430, id: 'phone-landscape', trace: TRACE_LANDSCAPE, width: 860 },
  { bandHeight: 380, centerY: (1280 / 860) * 470, height: 1280, id: 'tablet-portrait', trace: TRACE_PORTRAIT, width: 960 },
  { bandHeight: 350, centerY: 480, height: 960, id: 'tablet-landscape', trace: TRACE_LANDSCAPE, width: 1280 },
  { bandHeight: 380, centerY: (1280 / 860) * 470, height: 1280, id: 'slate-portrait', trace: TRACE_PORTRAIT, width: 800 },
  { bandHeight: 350, centerY: 400, height: 800, id: 'slate-landscape', trace: TRACE_LANDSCAPE, width: 1280 },
];

/** Levels cleared to unlock the ABC bonus (nine letters, the shipped threshold). */
const ABC_CLEARED = Array.from({ length: 9 }, (_, index) => `abc-${'abcdefghi'[index]}`);

const boxFor = (space) => ({
  bottom: space.centerY + space.bandHeight / 2,
  left: 40,
  right: space.width - 40,
  top: space.centerY - space.bandHeight / 2,
});

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

// Seed: nine letters cleared (ABC bonus unlocked) plus the name from `qaName`.
await page.addInitScript(
  ({ completed, key }) => {
    const name = new URLSearchParams(location.search).get('qaName') ?? undefined;
    window.localStorage.setItem(
      key,
      JSON.stringify({ badges: [], completedLevels: completed, name, settings: {}, version: 3 }),
    );
  },
  { completed: ABC_CLEARED, key: SAVE_KEY },
);

async function mapPoint(point) {
  const field = await page.evaluate(() => window.__app.field());
  const space = await page.evaluate(() => window.__app.space());
  return {
    x: field.x + (point.x / space.width) * field.width,
    y: field.y + (point.y / space.height) * field.height,
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
  const point = await mapPoint(target);
  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(320);
}

/** Opens the paginated menu's runtime name card (toddler flow: page two). */
async function openNameCard() {
  const ids = await page.evaluate(() => window.__app.targets().map((entry) => entry.id));
  if (!ids.includes('pack:name')) {
    await tap('menu:next');
  }
  await tap('pack:name');
}

async function openLevel(label, name, pick) {
  const query = name === undefined ? '' : `?qaName=${name}`;
  await page.goto(`${BASE}/index.html${query}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__app !== undefined, null, { timeout: 30000 });
  await page.waitForFunction(() => window.__app.screen().name === 'splash', null, { timeout: 30000 });
  await tap('splash');
  await page.waitForFunction(() => window.__app.screen().name === 'menu', null, { timeout: 30000 });
  await pick();
  const screen = await page.evaluate(() => window.__app.screen());
  if (screen.name !== 'level') {
    throw new Error(`${label}: expected a level, got ${JSON.stringify(screen)}`);
  }
  await page.waitForFunction(() => window.__app.strokes().length > 0, null, { timeout: 15000 });
  await page.waitForTimeout(900); // let the level-start entrance hop settle
  return screen;
}

const openNameRow = async () => {
  await openNameCard();
  await tap('level:name-1');
};

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`shot ${name}`);
}

async function liveRow() {
  return page.evaluate(() => {
    const strokes = window.__app.strokes();
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    for (const stroke of strokes) {
      for (const point of stroke) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      }
    }
    return { field: window.__app.field(), space: window.__app.space(), maxX, maxY, minX, minY };
  });
}

/** The authored-size cap: the tallest ink any single letter may reach, measured
 *  live on the portrait phone reference (the space every glyph is authored in). */
async function measureAuthoredCap() {
  await page.setViewportSize({ width: 430, height: 860 });
  await openLevel('authored cap', CAP_NAME, openNameRow);
  const row = await liveRow();
  const ySpan = row.maxY - row.minY;
  const xSpan = row.maxX - row.minX;
  console.log(`authored cap (${CAP_NAME} on ${row.space.id}): ${xSpan.toFixed(1)}×${ySpan.toFixed(1)}`);
  return { xSpan, ySpan };
}

/** The mascot's waiting spot as a field fraction, read from the live character
 *  canvas: `positionCharacter` places the canvas centre 0.38 of the character
 *  size below the park point, so the park is measured back out of the rect. */
async function parkFraction() {
  return page.evaluate(() => {
    const rect = document.querySelector('.char-canvas').getBoundingClientRect();
    const field = window.__app.field();
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;
    return {
      x: (centerX - field.x) / field.width,
      y: (centerY - field.y - rect.width * 0.38) / field.height,
    };
  });
}

/** Live row placement assertions for one space + word row. */
async function assertRow(label, space, { xSpan, ySpan }) {
  const live = await liveRow();
  check(live.space.id === space.id, `${label}: ${space.id} space selected`, live.space.id);
  const aspect = live.field.width / live.field.height;
  const designed = space.width / space.height;
  check(
    Math.abs(aspect - designed) < 0.01,
    `${label}: field keeps the ${space.id} aspect`,
    `${aspect.toFixed(3)} vs ${designed.toFixed(3)}`,
  );

  const box = boxFor(space);
  const centerX = (live.minX + live.maxX) / 2;
  const centerY = (live.minY + live.maxY) / 2;
  const rowXSpan = live.maxX - live.minX;
  const rowYSpan = live.maxY - live.minY;
  const detail =
    `row w${rowXSpan.toFixed(1)} h${rowYSpan.toFixed(1)} ` +
    `centre (${centerX.toFixed(1)}, ${centerY.toFixed(1)})`;

  check(
    live.minX >= box.left - 0.75 && live.maxX <= box.right + 0.75,
    `${label}: row inside the ${space.id} box width`,
    detail,
  );
  check(
    live.minY >= box.top - 0.75 && live.maxY <= box.bottom + 0.75,
    `${label}: row inside the ${space.id} band`,
    detail,
  );
  check(Math.abs(centerX - space.width / 2) <= 1.5, `${label}: row centred horizontally`, detail);
  check(
    Math.abs(centerY - space.centerY) <= 1.5,
    `${label}: row band centre at y=${space.centerY.toFixed(1)}`,
    detail,
  );
  check(
    Math.abs(rowXSpan - xSpan) <= 1.5,
    `${label}: row width ${xSpan.toFixed(0)} (composed for the box)`,
    detail,
  );
  check(
    Math.abs(rowYSpan - ySpan) <= 1.5,
    `${label}: row height ${ySpan.toFixed(0)} (scaled authored size)`,
    detail,
  );
  return { rowXSpan, rowYSpan };
}

const gallery = [];
const parks = [];
let authoredCap = null;

// 1. Measure the authored cap live, then hold it fixed for every space: no row
//    may ever draw ink taller than this (the reason no engine retune is needed).
authoredCap = await measureAuthoredCap();
check(authoredCap.ySpan > 300 && authoredCap.ySpan < 400, 'authored cap measured', `h${authoredCap.ySpan.toFixed(1)}`);
await shot('cap-phone-portrait');

let portraitNameYSpan = null;

for (const space of SPACES) {
  await page.setViewportSize({ height: space.height, width: space.width });
  const box = boxFor(space);
  const boxWidth = box.right - box.left;

  // The 7-letter runtime name row: the recomposition case.
  await openLevel(`${space.id} name`, NAME, async () => {
    await openNameCard();
    await shot(`menu-${space.id}`);
    await tap('level:name-1');
  });
  await shot(`name-row-${space.id}`);
  const nameScale = Math.min(1, boxWidth / NAME_NATURAL);
  const nameRow = await assertRow(`${space.id} name row`, space, {
    xSpan: Math.min(NAME_NATURAL, boxWidth),
    ySpan: authoredCap.ySpan * nameScale,
  });
  check(
    nameRow.rowYSpan <= authoredCap.ySpan + 0.5,
    `${space.id} name row: cap holds (≤ authored ${authoredCap.ySpan.toFixed(1)})`,
    `h${nameRow.rowYSpan.toFixed(1)}`,
  );
  if (portraitNameYSpan === null) {
    portraitNameYSpan = nameRow.rowYSpan;
  } else if (space.id !== 'phone-landscape') {
    check(
      nameRow.rowYSpan > portraitNameYSpan * 1.5,
      `${space.id} name row: grows the long name past the phone reference`,
      `${nameRow.rowYSpan.toFixed(1)} vs ${portraitNameYSpan.toFixed(1)}`,
    );
  }
  gallery.push({ group: space.id, label: `7-letter name row (${NAME})`, name: `name-row-${space.id}` });

  // The mascot keeps its authored waiting spot as a fraction of the field, so
  // the recomposed row never grows underneath it into the letters.
  const park = await parkFraction();
  check(
    Math.abs(park.x - space.trace.x) <= 0.015 && Math.abs(park.y - space.trace.y) <= 0.02,
    `${space.id} mascot park: authored field fraction kept`,
    `measured (${park.x.toFixed(3)}, ${park.y.toFixed(3)}) vs authored (${space.trace.x.toFixed(3)}, ${space.trace.y.toFixed(3)})`,
  );
  // On a tablet the resolved park clears the row band entirely (the phone
  // references keep their shipped park, which sits inside their nominal band).
  if (space.id !== 'phone-portrait' && space.id !== 'phone-landscape') {
    check(
      park.y > box.bottom / space.height,
      `${space.id} mascot park: waits clear below the row band`,
      `y ${(park.y * space.height).toFixed(1)} vs band bottom ${box.bottom.toFixed(1)}`,
    );
  }
  parks.push({
    authored: `(${space.trace.x.toFixed(3)}, ${space.trace.y.toFixed(3)})`,
    id: space.id,
    measured: `(${park.x.toFixed(3)}, ${park.y.toFixed(3)})`,
  });

  // Shortest-name reference: authored size must be identical in every space.
  await openLevel(`${space.id} cap reference`, CAP_NAME, openNameRow);
  await shot(`name-cap-${space.id}`);
  const capRow = await assertRow(`${space.id} cap reference`, space, {
    xSpan: Math.min(authoredCap.xSpan, boxWidth),
    ySpan: authoredCap.ySpan,
  });
  check(
    Math.abs(capRow.rowYSpan - authoredCap.ySpan) <= 0.5,
    `${space.id} cap reference: authored letter size identical to the phone reference`,
    `${capRow.rowYSpan.toFixed(2)} vs ${authoredCap.ySpan.toFixed(2)}`,
  );
  gallery.push({
    group: space.id,
    label: `shortest name (${CAP_NAME}) — authored size`,
    name: `name-cap-${space.id}`,
  });

  // The ABC sequence bonus recomposes into the same box on non-phone spaces.
  if (space.id !== 'phone-portrait' && space.id !== 'phone-landscape') {
    await openLevel(`${space.id} ABC bonus`, NAME, async () => {
      await tap('pack:abc');
      await tap('pack:badge');
    });
    const bonusScreen = await page.evaluate(() => window.__app.screen());
    check(
      bonusScreen.name === 'level' && bonusScreen.levelId === 'abc-bonus-1',
      `${space.id}: ABC bonus opens from the badge seal`,
      JSON.stringify(bonusScreen),
    );
    await shot(`abc-bonus-row-${space.id}`);
    const bonusRow = await assertRow(`${space.id} ABC bonus row`, space, {
      xSpan: Math.min(ABC_NATURAL, boxWidth),
      ySpan: authoredCap.ySpan * Math.min(1, boxWidth / ABC_NATURAL),
    });
    check(
      bonusRow.rowYSpan <= authoredCap.ySpan + 0.5,
      `${space.id} ABC bonus row: cap holds (≤ authored ${authoredCap.ySpan.toFixed(1)})`,
      `h${bonusRow.rowYSpan.toFixed(1)}`,
    );
    gallery.push({ group: space.id, label: 'ABC bonus row', name: `abc-bonus-row-${space.id}` });
  }
}

const groups = [...new Set(gallery.map((entry) => entry.group))];
writeFileSync(
  `${OUT}/gallery.html`,
  `<!doctype html>
<meta charset="utf-8">
<title>Tablet row-band evidence — tablet-fit_20261006</title>
<style>
  body { background: #101418; color: #e8eef5; font: 14px/1.5 system-ui, sans-serif; margin: 24px; }
  h1 { font-size: 20px; } h2 { font-size: 15px; margin: 28px 0 8px; color: #9fd0ff; }
  figure { display: inline-block; margin: 0 16px 16px 0; vertical-align: top; }
  img { border: 1px solid #2c3a48; display: block; max-width: 340px; height: auto; }
  figcaption { color: #9fb0c0; margin-top: 4px; }
</style>
<h1>Word-row band placement — tablet-fit_20261006 (task 4)</h1>
<p>Runtime compositions read from <code>window.__app.strokes()</code> by
<code>dev/qa/qa-tablet-rows.mjs</code>. Portrait rows sit at 470/860 of the space
height; landscape rows are centred. The authored cap is
${authoredCap.ySpan.toFixed(1)} units of ink height.</p>
<p>Mascot waiting spot measured from the live <code>.char-canvas</code> rect as a
field fraction (the authored fraction is the phone reference's park):</p>
<pre>${['space             measured            authored', ...parks.map((p) => `${p.id.padEnd(18)}${p.measured.padEnd(20)}${p.authored}`)].join('\n')}</pre>
${groups
  .map(
    (group) => `<h2>${group}</h2>
${gallery
  .filter((entry) => entry.group === group)
  .map(
    (entry) =>
      `<figure><img src="./${entry.name}.png" alt="${entry.name}"><figcaption>${entry.label}</figcaption></figure>`,
  )
  .join('\n')}`,
  )
  .join('\n')}
`,
);

check(gallery.length === 16, 'row evidence captured for every space', `${gallery.length} shots`);
check(pageErrors.length === 0, 'no page errors', pageErrors.join(' | '));
console.log(`gallery: ${BASE}/dev/${OUT}/gallery.html`);
await browser.close();

console.log(
  failures.length === 0
    ? 'tablet row-band QA passed'
    : `tablet row-band QA FAILED (${failures.length})`,
);
process.exitCode = failures.length === 0 ? 0 : 1;
