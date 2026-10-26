// Trail-guide measurement probe (track tablet-fit_20261006): answers whether a
// tablet word row needs a thicker trail, larger dots or a wider tip now that a
// 7-letter row is ~2.5x longer than the portrait-phone reference. It drives the
// real app to the runtime 7-letter My Name row in all six design spaces, reads
// the composed geometry live from `window.__app.strokes()`, and measures the
// RENDERED trail guide from the trail canvas pixels — the ribbon width across
// the active stroke (max over arcs, so the marching dots never split the run)
// and the first dot's diameter — then reports every guide dimension in field
// units, device px and as a fraction of the composed letter height.
//
// The decision it supports: the guide is authored at finger scale and is NOT
// retuned per space, so what grows on a tablet is the letter (the intent of the
// fill-the-canvas reflow). Expressed per letter, the tablet guide is at or
// above the shipped landscape-phone reference — so no thicker trail, larger
// dots or wider tip is warranted. The real outlier is the opposite one: the
// portrait-phone long name, where the fixed 64-unit guide is wider than the
// shrunken letter it follows.
// Usage: from dev/ — `pnpm exec vite --port 5199 --strictPort`, then
// `node qa/qa-tablet-trail.mjs` (PORT overrides 5199, a URL argument overrides
// the base).
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const PORT = Number(process.env.PORT) > 0 ? Number(process.env.PORT) : 5199;
const BASE = process.argv[2] ?? `http://localhost:${PORT}`;
const OUT = 'qa/out/tablet-trail';
const SAVE_KEY = 'trace-discover-save-v1';

/** The recomposition case: a 7-letter name (its natural row width is 947 units). */
const NAME = 'AIRAABC';

/** The authored path style the renderer draws with (src/app/render.ts PATH_STYLE). */
const STYLE = { ribbonWidth: 64, outlineWidth: 6, dotRadius: 7, tipRadius: 16, dotSpacing: 46 };

// Every design space the viewport selector can pick, with a representative
// device viewport (a portrait tablet is narrower than its landscape twin, which
// is what makes the slate portrait row the tightest tablet composition).
const SPACES = [
  { device: { height: 844, width: 390 }, id: 'phone-portrait' },
  { device: { height: 390, width: 844 }, id: 'phone-landscape' },
  { device: { height: 1024, width: 768 }, id: 'tablet-portrait' },
  { device: { height: 768, width: 1024 }, id: 'tablet-landscape' },
  { device: { height: 1280, width: 800 }, id: 'slate-portrait' },
  { device: { height: 800, width: 1280 }, id: 'slate-landscape' },
];

const ABC_CLEARED = Array.from({ length: 9 }, (_, index) => `abc-${'abcdefghi'[index]}`);

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
async function openNameRow() {
  const ids = await page.evaluate(() => window.__app.targets().map((entry) => entry.id));
  if (!ids.includes('pack:name')) {
    await tap('menu:next');
  }
  await tap('pack:name');
  await tap('level:name-1');
}

async function openNameLevel(space) {
  await page.setViewportSize(space.device);
  await page.goto(`${BASE}/index.html?qaName=${NAME}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__app !== undefined, null, { timeout: 30000 });
  await page.waitForFunction(() => window.__app.screen().name === 'splash', null, { timeout: 30000 });
  await tap('splash');
  await page.waitForFunction(() => window.__app.screen().name === 'menu', null, { timeout: 30000 });
  await openNameRow();
  const screen = await page.evaluate(() => window.__app.screen());
  if (screen.name !== 'level') {
    throw new Error(`${space.id}: expected a level, got ${JSON.stringify(screen)}`);
  }
  await page.waitForFunction(() => window.__app.strokes().length > 0, null, { timeout: 15000 });
  await page.waitForTimeout(700);
}

/**
 * Measures the composed row and the RENDERED guide from the trail canvas. The
 * active (first) stroke is opaque; every other stroke is drawn faint, so only
 * the active one can be measured reliably. The ribbon width is the longest
 * contiguous ribbon-coloured run over the perpendicular profile, maximised
 * across arcs (a marching dot splits the run at multiples of the dot spacing).
 */
async function measureTrail() {
  return page.evaluate(
    ({ style }) => {
      const dpr = window.devicePixelRatio || 1;
      const field = window.__app.field();
      const space = window.__app.space();
      const strokes = window.__app.strokes();
      const active = strokes[0];
      const canvas = document.querySelector('canvas.game-canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const perUnit = (field.width * dpr) / space.width; // backing px per field unit
      const toCanvas = (p) => ({
        x: (field.x + (p.x / space.width) * field.width) * dpr,
        y: (field.y + (p.y / space.height) * field.height) * dpr,
      });

      let minX = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      for (const stroke of strokes) {
        for (const point of stroke) {
          minX = Math.min(minX, point.x);
          maxX = Math.max(maxX, point.x);
          minY = Math.min(minY, point.y);
          maxY = Math.max(maxY, point.y);
        }
      }

      let total = 0;
      for (let i = 1; i < active.length; i += 1) {
        total += Math.hypot(active[i].x - active[i - 1].x, active[i].y - active[i - 1].y);
      }

      const pointAt = (arc) => {
        let walked = 0;
        let at = active[0];
        let dir = { x: 1, y: 0 };
        for (let i = 1; i < active.length; i += 1) {
          const a = active[i - 1];
          const b = active[i];
          const seg = Math.hypot(b.x - a.x, b.y - a.y);
          if (walked + seg >= arc) {
            const t = seg === 0 ? 0 : (arc - walked) / seg;
            at = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
            const len = seg === 0 ? 1 : seg;
            dir = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
            break;
          }
          walked += seg;
          at = b;
        }
        return { at, n: { x: -dir.y, y: dir.x } };
      };

      const near = (data, index, ref, tol) =>
        Math.hypot(data[index] - ref[0], data[index + 1] - ref[1], data[index + 2] - ref[2]) <= tol;
      const RIBBON = [207, 227, 242];
      const DOT = [111, 168, 212];

      // Longest contiguous run of `ref` across the profile at `arc`.
      const runAt = (arc, ref, tol) => {
        const { at, n } = pointAt(arc);
        let run = 0;
        let best = 0;
        for (let t = -55; t <= 55; t += 0.5) {
          const p = toCanvas({ x: at.x + n.x * t, y: at.y + n.y * t });
          const px = Math.round(p.x);
          const py = Math.round(p.y);
          const inside = px >= 0 && py >= 0 && px < canvas.width && py < canvas.height;
          const data = inside ? ctx.getImageData(px, py, 1, 1).data : [0, 0, 0];
          if (inside && near(data, 0, ref, tol)) {
            run += 0.5;
            best = Math.max(best, run);
          } else {
            run = 0;
          }
        }
        return best;
      };

      let ribbonUnits = 0;
      for (let arc = 30; arc < total - 30; arc += 3) {
        ribbonUnits = Math.max(ribbonUnits, runAt(arc, RIBBON, 40));
      }
      // The first marching dot sits exactly one dot-spacing along the stroke.
      const dotUnits = runAt(style.dotSpacing, DOT, 45);

      return {
        dotUnits,
        fieldScale: field.width / space.width,
        letterHeight: maxY - minY,
        ribbonUnits,
        rowWidth: maxX - minX,
        space,
      };
    },
    { style: STYLE },
  );
}

const rows = [];
for (const space of SPACES) {
  await openNameLevel(space);
  const m = await measureTrail();
  check(m.space.id === space.id, `${space.id}: space selected`, m.space.id);
  check(
    m.ribbonUnits >= STYLE.ribbonWidth - 2 && m.ribbonUnits <= STYLE.ribbonWidth + 4,
    `${space.id}: rendered ribbon is the authored ${STYLE.ribbonWidth} units`,
    `measured ${m.ribbonUnits.toFixed(1)}`,
  );
  check(
    m.dotUnits >= STYLE.dotRadius * 2 - 3 && m.dotUnits <= STYLE.dotRadius * 2 + 4,
    `${space.id}: rendered dot diameter is the authored ${STYLE.dotRadius * 2} units`,
    `measured ${m.dotUnits.toFixed(1)}`,
  );

  const scale = m.fieldScale;
  const ribbonOverLetter = m.ribbonUnits / m.letterHeight;
  rows.push({
    space: space.id,
    rowWidth: m.rowWidth,
    letterHeight: m.letterHeight,
    deviceScale: scale,
    ribbon: m.ribbonUnits,
    ribbonPx: m.ribbonUnits * scale,
    dotPx: m.dotUnits * scale,
    tipPx: STYLE.tipRadius * 2 * scale,
    ribbonOverLetter,
    dotOverLetter: m.dotUnits / m.letterHeight,
    tipOverLetter: (STYLE.tipRadius * 2) / m.letterHeight,
    dotsPerRow: (m.rowWidth - STYLE.ribbonWidth) / STYLE.dotSpacing,
  });
}

const pad = (v, n) => String(v).padEnd(n);
const header =
  pad('space', 18) +
  pad('rowW', 8) +
  pad('letterH', 9) +
  pad('scale', 7) +
  pad('ribbon', 8) +
  pad('ribbonPx', 10) +
  pad('dotPx', 8) +
  pad('tipPx', 8) +
  pad('rib/letter', 12) +
  pad('dot/letter', 12) +
  pad('dots@row', 10);
const lines = [header];
for (const r of rows) {
  lines.push(
    pad(r.space, 18) +
      pad(r.rowWidth.toFixed(1), 8) +
      pad(r.letterHeight.toFixed(1), 9) +
      pad(r.deviceScale.toFixed(3), 7) +
      pad(r.ribbon.toFixed(1), 8) +
      pad(r.ribbonPx.toFixed(1), 10) +
      pad(r.dotPx.toFixed(1), 8) +
      pad(r.tipPx.toFixed(1), 8) +
      pad(r.ribbonOverLetter.toFixed(3), 12) +
      pad(r.dotOverLetter.toFixed(3), 12) +
      pad(r.dotsPerRow.toFixed(1), 10),
  );
}
console.log(`\n${lines.join('\n')}\n`);

const phonePortrait = rows.find((r) => r.space === 'phone-portrait');
const tablets = rows.filter((r) => r.space.startsWith('tablet') || r.space.startsWith('slate'));

check(
  tablets.every((r) => r.ribbon >= STYLE.ribbonWidth - 2),
  'tablet ribbon width equals the phone reference (no per-space retune)',
  tablets.map((r) => r.ribbon.toFixed(1)).join(', '),
);
check(
  rows.every((r) => r.ribbonPx >= 45 && r.ribbonPx <= 70),
  'the rendered guide stays finger-scale (45-70 px) on every representative device',
  rows.map((r) => `${r.space} ${r.ribbonPx.toFixed(1)}`).join(', '),
);
check(
  phonePortrait.ribbonOverLetter > 0.4,
  'portrait-phone long name is the thick outlier (guide wider than its shrunken letter)',
  `${phonePortrait.ribbonOverLetter.toFixed(3)}`,
);
check(
  tablets.every((r) => r.dotsPerRow > phonePortrait.dotsPerRow),
  'the longer tablet row carries more direction dots, not fewer',
  tablets.map((r) => `${r.space} ${r.dotsPerRow.toFixed(1)}`).join(', '),
);

// The comparison the thickness decision rests on. The guide is constant, so a
// bigger letter is the only thing that changes: per letter the tablet rows sit
// a little under the shipped landscape-phone row and far under the portrait
// phone's long-name row (its guide is wider than the letter it follows).
const landscape = rows.find((r) => r.space === 'phone-landscape');
console.log('\nguide-to-letter, widest to thinnest:');
for (const r of [...rows].sort((a, b) => b.ribbonOverLetter - a.ribbonOverLetter)) {
  console.log(`  ${r.space.padEnd(18)} ${r.ribbonOverLetter.toFixed(3)}`);
}
const thinnestTablet = Math.min(...tablets.map((r) => r.ribbonOverLetter));
console.log(
  `\ntablet thinnest ${thinnestTablet.toFixed(3)} vs landscape-phone ${landscape.ribbonOverLetter.toFixed(3)} ` +
    `(${(((thinnestTablet / landscape.ribbonOverLetter) - 1) * 100).toFixed(0)}%), ` +
    `portrait-phone ${phonePortrait.ribbonOverLetter.toFixed(3)}.\n`,
);
check(
  rows.every((r) => Math.abs(r.tipOverLetter / r.ribbonOverLetter - 0.5) < 0.02),
  'tip stays a fixed half of the guide width in every space',
);
check(pageErrors.length === 0, 'no page errors', pageErrors.join(' | '));

writeFileSync(`${OUT}/run.log`, `${lines.join('\n')}\n`);
console.log(`table written to ${OUT}/run.log`);
await browser.close();

console.log(
  failures.length === 0 ? 'tablet trail-guide QA passed' : `tablet trail-guide QA FAILED (${failures.length})`,
);
process.exitCode = failures.length === 0 ? 0 : 1;
