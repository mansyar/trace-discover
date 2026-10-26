// Backdrop/art fit evidence probe (track tablet-fit_20261006, Phase 3): opens
// the first pre-writing level under each of the six shipped skins in all six
// design spaces (both authored phone references + the four tablet spaces),
// measures the composed backdrop *from the live canvas* — edge coverage and the
// horizon/ground band fraction — and asserts the fixed-anchor policy holds, then
// traces the level to success and checks the success wash reaches every edge.
// Writes labelled screenshots + a gallery page for owner review.
// Usage: from dev/ — `pnpm exec vite --port 5199 --strictPort`, then
// `node qa/qa-tablet-backdrops.mjs` (PORT overrides 5199, a URL argument
// overrides the base).
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const PORT = Number(process.env.PORT) > 0 ? Number(process.env.PORT) : 5199;
const BASE = process.argv[2] ?? `http://localhost:${PORT}`;
const OUT = 'qa/out/tablet-backdrops';
const SAVE_KEY = 'trace-discover-save-v1';

/** Every shipped skin with its backdrop file; all six are square 1024². */
const SKINS = [
  { id: 'dino', url: '/art/bg/dino.webp' },
  { id: 'star', url: '/art/bg/star.webp' },
  { id: 'construction', url: '/art/bg/construction.webp' },
  { id: 'animal', url: '/art/bg/animals.webp' },
  { id: 'teddy', url: '/art/bg/teddy.webp' },
  { id: 'trex', url: '/art/bg/trex.webp' },
];

/** The six design spaces at their exact viewport anchors (zero bars). */
const SPACES = [
  { height: 860, id: 'phone-portrait', viewport: { height: 860, width: 430 }, width: 430 },
  { height: 430, id: 'phone-landscape', viewport: { height: 430, width: 860 }, width: 860 },
  { height: 1280, id: 'tablet-portrait', viewport: { height: 1366, width: 1024 }, width: 960 },
  { height: 960, id: 'tablet-landscape', viewport: { height: 1024, width: 1366 }, width: 1280 },
  { height: 1280, id: 'slate-portrait', viewport: { height: 1280, width: 800 }, width: 800 },
  { height: 800, id: 'slate-landscape', viewport: { height: 800, width: 1280 }, width: 1280 },
];
const TABLET_SPACES = SPACES.filter((space) => !space.id.startsWith('phone-'));
const REFERENCE = { landscape: 'phone-landscape', portrait: 'phone-portrait' };

/** render.ts paints these before any art: a leftover means the field was not
 *  covered (the shipped bug: the no-art stand-in only filled the phone box). */
const FIELD_FILL = [237, 245, 217];
const CREAM = [246, 227, 184];

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

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
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

// Seed: a clean save carrying the skin under test (the URL says which).
await page.addInitScript(
  ({ key }) => {
    const skin = new URLSearchParams(location.search).get('qaSkin') ?? 'dino';
    window.localStorage.setItem(
      key,
      JSON.stringify({ badges: [], completedLevels: [], name: undefined, settings: { skin }, version: 3 }),
    );
  },
  { key: SAVE_KEY },
);

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

/** Reads the game canvas at design-space fractions of the field. */
async function sample(fractions) {
  return page.evaluate((points) => {
    const canvas = document.querySelector('.game-canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const field = window.__app.field();
    const space = window.__app.space();
    const dpr = canvas.width / canvas.getBoundingClientRect().width;
    const fieldHeight = (field.width * space.height) / space.width;
    return points.map(({ fx, fy }) => {
      const x = Math.round((field.x + fx * field.width) * dpr);
      const y = Math.round((field.y + fy * fieldHeight) * dpr);
      const data = context.getImageData(
        Math.min(canvas.width - 1, Math.max(0, x)),
        Math.min(canvas.height - 1, Math.max(0, y)),
        1,
        1,
      ).data;
      return [data[0], data[1], data[2]];
    });
  }, fractions);
}

/** Border points just inside each edge, clear of the face button (top left)
 *  and the waiting mascot (bottom centre): uncovered ground shows up here. */
const BORDER = [
  { fx: 0.04, fy: 0.03 },
  { fx: 0.5, fy: 0.03 },
  { fx: 0.96, fy: 0.03 },
  { fx: 0.96, fy: 0.5 },
  { fx: 0.82, fy: 0.96 },
  { fx: 0.18, fy: 0.96 },
  { fx: 0.04, fy: 0.5 },
  { fx: 0.04, fy: 0.9 },
];

/**
 * Wide-spread field points for the crop comparison: clear of the level ink
 * (which owns the middle), the face button (top left) and the mascot (bottom
 * centre), because those paint over the backdrop.
 */
const PROBE_POINTS = [
  { fx: 0.5, fy: 0.08 },
  { fx: 0.15, fy: 0.25 },
  { fx: 0.85, fy: 0.25 },
  { fx: 0.1, fy: 0.5 },
  { fx: 0.9, fy: 0.5 },
  { fx: 0.12, fy: 0.8 },
  { fx: 0.88, fy: 0.8 },
  { fx: 0.85, fy: 0.1 },
];

/**
 * The documented cover-crop, evaluated independently of the app: a square
 * 1024² backdrop scaled by the looser axis and centred. Returns, for each field
 * point, the source pixel it must show.
 */
async function expectedFromImage(backdropUrl, points) {
  const args = { fields: points, url: `${BASE}${backdropUrl}` };
  const read = () =>
    page.evaluate(async ({ url, fields }) => {
      const response = await fetch(url);
      const bitmap = await createImageBitmap(await response.blob());
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(bitmap, 0, 0, 1024, 1024);
      const space = window.__app.space();
      const scale = Math.max(space.width / 1024, space.height / 1024);
      const drawn = 1024 * scale;
      const offsetX = (space.width - drawn) / 2;
      const offsetY = (space.height - drawn) / 2;
      return fields.map(({ fx, fy }) => {
        const sx = (fx * space.width - offsetX) / drawn;
        const sy = (fy * space.height - offsetY) / drawn;
        const data = context.getImageData(
          Math.min(1023, Math.max(0, Math.round(sx * 1024))),
          Math.min(1023, Math.max(0, Math.round(sy * 1024))),
          1,
          1,
        ).data;
        return [data[0], data[1], data[2]];
      });
    }, args);
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await read();
    } catch (error) {
      lastError = error;
      await wait(250);
    }
  }
  throw lastError;
}

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`shot ${name}`);
}

/** Opens pre-1 from a clean save at the given viewport, under the given skin. */
async function openLevel(space, skin) {
  await page.setViewportSize(space.viewport);
  await page.goto(`${BASE}/index.html?qaSkin=${skin}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__app !== undefined, null, { timeout: 30000 });
  await page.waitForFunction(() => window.__app.screen().name === 'splash', null, { timeout: 30000 });
  await tap('splash');
  await page.waitForFunction(() => window.__app.screen().name === 'menu', null, { timeout: 30000 });
  await tap('pack:pre');
  await tap('level:pre-1');
  await page.waitForFunction(() => window.__app.strokes().length > 0, null, { timeout: 15000 });
  // The backdrop decodes from /art/bg/*.webp; the canvas switches off the
  // stand-in the frame it lands. Poll the live pixels instead of guessing.
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const [corner] = await sample([{ fx: 0.5, fy: 0.02 }]);
    if (corner && distance(corner, FIELD_FILL) > 10) {
      break;
    }
    await wait(150);
  }
  await wait(600); // let the level-start entrance hop settle
}

/** Traces every stroke of the open level and waits for the success screen. */
async function completeLevel() {
  const strokes = await page.evaluate(() =>
    window.__app.strokes().map((points) => {
      const sampled = points.filter((_, index) => index % 3 === 0);
      sampled.push(points[points.length - 1]);
      return sampled;
    }),
  );
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
    for (let index = 0; index < 6; index += 1) {
      await page.mouse.move(last.x, last.y, { steps: 1 });
      await wait(80);
    }
    await page.mouse.up();
    await wait(200);
  }
  // The confetti burst plays on the bare level (the success wash lands on top of
  // it later), so poll right after the last stroke for its widest spread.
  let spread = { count: 0, quadrants: [] };
  for (let frame = 0; frame < 20 && spread.count < 4; frame += 1) {
    const candidate = await confettiSpread();
    if (candidate.count > spread.count) {
      spread = candidate;
    }
    await wait(80);
  }
  await page.waitForFunction(() => window.__app.success(), null, { timeout: 45000 });
  return spread;
}

const gallery = [];
const crops = [];

for (const space of SPACES) {
  for (const skin of SKINS) {
    await openLevel(space, skin.id);
    const selected = await page.evaluate(() => window.__app.space().id);
    check(selected === space.id, `${skin.id} ${space.id}: space selected`, selected);

    const border = await sample(BORDER);
    const fillHits = border.filter(
      (pixel) =>
        distance(pixel, FIELD_FILL) <= 5 || distance(pixel, CREAM) <= 5,
    ).length;
    check(
      fillHits === 0,
      `${skin.id} ${space.id}: backdrop covers every edge`,
      `${fillHits} uncovered`,
    );

    // What is on screen must be the documented cover-crop of the same square
    // image — same scale, same anchor, same band under the ink and the mascot.
    const expected = await expectedFromImage(skin.url, PROBE_POINTS);
    const actual = await sample(PROBE_POINTS);
    const drift = actual.map((pixel, index) => distance(pixel, expected[index]));
    const mismatched = drift.filter((value) => value > 24).length;
    check(
      mismatched === 0,
      `${skin.id} ${space.id}: shows the documented cover-crop`,
      `${mismatched} of ${PROBE_POINTS.length} points off (max ${Math.max(...drift).toFixed(1)})`,
    );
    crops.push({ id: space.id, skin: skin.id, worst: Math.max(...drift) });
    await shot(`${skin.id}-${space.id}`);
    gallery.push({
      group: space.id,
      label: `${skin.id} — cover-crop of the authored art`,
      name: `${skin.id}-${space.id}`,
    });
  }
}

// The anchor policy in one number: the worst pixel disagreement between the
// live field and the documented crop, across every skin and space.
const worst = crops.reduce((value, entry) => Math.max(value, entry.worst), 0);
check(worst <= 24, 'every space composites the authored art identically', `worst Δ ${worst.toFixed(1)}`);

// Success wash + confetti cover every tablet field (the skin is cosmetic here).
/** Confetti fills (see src/render/confetti.ts); the dino art has none of them. */
const CONFETTI = [
  [232, 106, 146],
  [110, 198, 185],
  [111, 168, 212],
];

/** Counts confetti-coloured pixels across the field and which quadrants hold them. */
async function confettiSpread() {
  return page.evaluate((palette) => {
    const canvas = document.querySelector('.game-canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const field = window.__app.field();
    const dpr = canvas.width / canvas.getBoundingClientRect().width;
    const left = Math.round(field.x * dpr);
    const top = Math.round(field.y * dpr);
    const width = Math.round(field.width * dpr);
    const height = Math.round((field.width * window.__app.space().height) / window.__app.space().width * dpr);
    const data = context.getImageData(left, top, Math.min(width, canvas.width - left), Math.min(height, canvas.height - top)).data;
    const step = 3;
    let count = 0;
    const quadrants = new Set();
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const index = (y * width + x) * 4;
        const pixel = [data[index], data[index + 1], data[index + 2]];
        const match = palette.some(
          (colour) =>
            Math.abs(pixel[0] - colour[0]) <= 10 &&
            Math.abs(pixel[1] - colour[1]) <= 10 &&
            Math.abs(pixel[2] - colour[2]) <= 10,
        );
        if (match) {
          count += 1;
          quadrants.add(`${x < width / 2 ? 'l' : 'r'}${y < height / 2 ? 't' : 'b'}`);
        }
      }
    }
    return { count, quadrants: [...quadrants] };
  }, CONFETTI);
}

/** Wide-spread points clear of the face button and the success controls. */
const WASH_POINTS = [
  { fx: 0.3, fy: 0.05 },
  { fx: 0.95, fy: 0.05 },
  { fx: 0.05, fy: 0.5 },
  { fx: 0.95, fy: 0.5 },
  { fx: 0.05, fy: 0.95 },
  { fx: 0.95, fy: 0.95 },
];
for (const space of TABLET_SPACES) {
  await openLevel(space, 'dino');
  const before = await sample(WASH_POINTS);
  const spread = await completeLevel();
  await wait(300);
  const after = await sample(WASH_POINTS);
  check(
    spread.count >= 4 && spread.quadrants.length >= 2,
    `${space.id} success: confetti spans the field`,
    `${spread.count} px over ${spread.quadrants.join('')}`,
  );
  const covered = after.filter((pixel, index) => {
    const previous = before[index];
    return previous ? distance(pixel, previous) > 8 : false;
  }).length;
  check(
    covered === WASH_POINTS.length,
    `${space.id} success: wash reaches every edge`,
    `${covered}/${WASH_POINTS.length}`,
  );
  const inBounds = await page.evaluate(() => {
    const space = window.__app.space();
    return window.__app
      .targets()
      .filter((target) => target.id.startsWith('success:'))
      .map((target) => ({
        id: target.id,
        inside:
          target.x - (target.radius ?? 0) >= 0 &&
          target.y - (target.radius ?? 0) >= 0 &&
          target.x + (target.radius ?? 0) <= space.width &&
          target.y + (target.radius ?? 0) <= space.height,
      }));
  });
  check(
    inBounds.length > 0 && inBounds.every((entry) => entry.inside),
    `${space.id} success: controls inside the field`,
    inBounds.map((entry) => entry.id).join(','),
  );
  await shot(`success-${space.id}`);
  gallery.push({ group: space.id, label: 'success wash + confetti', name: `success-${space.id}` });
}

const groups = [...new Set(gallery.map((entry) => entry.group))];
const cropRows = SPACES.map((space) => {
  const rows = crops.filter((entry) => entry.id === space.id);
  const worstOf = rows.reduce((value, entry) => Math.max(value, entry.worst), 0);
  return `${space.id.padEnd(18)}${worstOf.toFixed(1)} (${rows.length} skins)`;
});
writeFileSync(
  `${OUT}/gallery.html`,
  `<!doctype html>
<meta charset="utf-8">
<title>Tablet backdrop fit evidence — tablet-fit_20261006</title>
<style>
  body { background: #101418; color: #e8eef5; font: 14px/1.5 system-ui, sans-serif; margin: 24px; }
  h1 { font-size: 20px; } h2 { font-size: 15px; margin: 28px 0 8px; color: #9fd0ff; }
  figure { display: inline-block; margin: 0 16px 16px 0; vertical-align: top; }
  img { border: 1px solid #2c3a48; display: block; max-width: 300px; height: auto; }
  figcaption { color: #9fb0c0; margin-top: 4px; }
</style>
<h1>Backdrop fit — cover-crop under the fixed anchor (task P3.T2 / P3.T3)</h1>
<p>Live canvas measurements from <code>dev/qa/qa-tablet-backdrops.mjs</code>.
Every edge sample of every skin is backdrop (no <code>#edf5d9</code> fill), and
eight points per space match the documented cover-crop of the same square image
(computed independently in the probe) within 24/255 per channel.</p>
<pre>${['space             worst pixel delta vs the documented crop', ...cropRows].join('\n')}</pre>
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

check(pageErrors.length === 0, 'no page errors', pageErrors.join(' | '));
console.log(`gallery: ${BASE}/dev/${OUT}/gallery.html`);
await browser.close();

console.log(
  failures.length === 0 ? 'tablet backdrop QA passed' : `tablet backdrop QA FAILED (${failures.length})`,
);
process.exitCode = failures.length === 0 ? 0 : 1;
