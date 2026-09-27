// Cold-cache readiness probe: on a brand-new browser profile (empty content
// cache) the app must hold the drawn gate while the first-run warm-up fills,
// release it onto the menu with the whole shipped inventory cached and no page
// errors, and never swallow the tap a child makes while the gate is closed.
// Usage: (production preview on :4173) cd dev && node qa/qa-readiness.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const URL = process.argv[2] ?? 'http://localhost:4173/';
const OUT = path.join(HERE, 'out', 'readiness');
const DIST = path.resolve(HERE, '..', '..', 'dist');
const CONTENT_CACHE_NAME = 'trace-discover-content-v1';
const READY_TIMEOUT_MS = 90000;
const SAMPLE_CAP = 20000;

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

function countShippedContentFiles() {
  let count = 0;
  const walk = (dir) => {
    for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, dirent.name);
      if (dirent.isDirectory()) {
        walk(full);
        continue;
      }
      const relative = path.relative(DIST, full).split(path.sep).join('/');
      if (relative.startsWith('art/') || relative.startsWith('rive/')) {
        count += 1;
      }
    }
  };
  walk(DIST);
  return count;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch();
  // A fresh page on a fresh browser: the content cache is empty, which is what
  // makes this a first-run probe at all.
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));

  await page.goto(URL, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__app !== undefined, null, { timeout: 15000 });

  // Sample the gate from inside the page: polling from Node would miss most of
  // the fill, and a Playwright async predicate returns its Promise immediately
  // (always truthy), so waitForFunction cannot be used for this.
  await page.evaluate((cap) => {
    window.__samples = [];
    window.__sampleTimer = setInterval(() => {
      const content = window.__app?.content?.();
      if (content && window.__samples.length < cap) {
        window.__samples.push({
          failed: content.failed.length,
          fraction: content.fraction,
          ready: content.ready,
        });
      }
    }, 2);
  }, SAMPLE_CAP);

  // Wait for the first decided state (the pending report at fraction 0) so the
  // gate screenshot is taken while the fill is actually running.
  let first = null;
  const firstDeadline = Date.now() + 5000;
  while (Date.now() < firstDeadline) {
    first = await page.evaluate(() => window.__app.content());
    if (first !== null) {
      break;
    }
    await page.waitForTimeout(5);
  }
  if (first === null) {
    console.log('note: readiness had not decided before the first sample window');
  } else if (first.ready === false) {
    await page.screenshot({ path: path.join(OUT, 'gate-filling.png') });
    console.log(`gate held the splash at fill ${first.fraction.toFixed(3)}`);
  } else {
    console.log('note: gate was already open at the first sample');
  }

  // A child taps the splash the moment it is on screen. The shell must hold a
  // tap taken while the gate is closed and replay it when the gate opens.
  const splash = await page.evaluate(() => {
    const hit = window.__app.targets().find((t) => t.id === 'splash');
    if (!hit) {
      return null;
    }
    const f = window.__app.field();
    return { x: f.x + (hit.x / 430) * f.width, y: f.y + (hit.y / 860) * f.height };
  });
  if (!splash) {
    throw new Error('splash target missing');
  }
  const beforeTap = await page.evaluate(() => window.__app.content());
  await page.mouse.click(splash.x, splash.y);
  const tappedWhileClosed = beforeTap === null || beforeTap.ready === false;

  const startedAt = Date.now();
  const readyDeadline = Date.now() + READY_TIMEOUT_MS;
  let state = null;
  while (Date.now() < readyDeadline) {
    state = await page.evaluate(() => window.__app.content());
    if (state !== null && state.ready) {
      break;
    }
    await page.waitForTimeout(20);
  }
  const readyMs = Date.now() - startedAt;
  const samples = await page.evaluate(() => {
    clearInterval(window.__sampleTimer);
    return window.__samples;
  });

  const expected = countShippedContentFiles();
  const cacheCount = await page.evaluate(async (name) => {
    const cache = await caches.open(name);
    return (await cache.keys()).length;
  }, CONTENT_CACHE_NAME);

  const reachedMenu = await page
    .waitForFunction(() => window.__app.screen().name === 'menu', null, { timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  await page.screenshot({ path: path.join(OUT, 'menu-after-warmup.png') });

  const gateSamples = samples.filter((sample) => sample.ready === false);
  const gateSeen = gateSamples.length > 0;
  const monotonic = samples.every(
    (sample, index) => index === 0 || sample.fraction >= samples[index - 1].fraction - 1e-9,
  );
  const inRange = samples.every((sample) => sample.fraction >= 0 && sample.fraction <= 1);

  console.log(
    gateSeen
      ? `gate: observed closed across ${gateSamples.length} samples (fractions ${gateSamples[0].fraction.toFixed(3)}..${gateSamples[gateSamples.length - 1].fraction.toFixed(3)})`
      : 'gate: NEVER observed closed (no ready:false sample)',
  );
  console.log(`fill monotonic: ${monotonic ? 'yes' : 'NO'}; in 0..1: ${inRange ? 'yes' : 'NO'}`);
  console.log(`readiness released after ~${readyMs} ms`);
  console.log(
    `readiness: ready=${state?.ready} reason=${state?.reason ?? '(none)'} fraction=${state?.fraction ?? '(none)'} failed=${state?.failed?.length ?? '(none)'}`,
  );
  if (state?.failed?.length > 0) {
    console.log(`failed assets: ${state.failed.join(', ')}`);
  }
  console.log(`content cache: ${cacheCount}/${expected}`);
  console.log(
    `tap while gate closed: ${tappedWhileClosed ? 'yes (held and replayed)' : 'no (gate was already open)'}`,
  );
  console.log(`reached menu without a second tap: ${reachedMenu ? 'yes' : 'NO'}`);
  console.log('page errors:', errors.length === 0 ? '(none)' : errors.join(' | '));

  const failures = [];
  if (state === null || state.ready !== true) {
    failures.push('readiness never resolved');
  } else {
    if (state.reason !== 'warmed') {
      failures.push(`expected the warm-up to release the gate, got reason '${state.reason}'`);
    }
    if (state.fraction !== 1) {
      failures.push(`resolved gate fill was ${state.fraction}, expected 1`);
    }
    if (state.failed.length > 0) {
      failures.push(`warm-up could not cache: ${state.failed.join(', ')}`);
    }
  }
  if (!gateSeen) {
    failures.push('the gate never held the splash (no ready:false sample)');
  }
  if (!monotonic) {
    failures.push('the gate fill was not monotonic');
  }
  if (!inRange) {
    failures.push('a gate fill sample fell outside 0..1');
  }
  if (cacheCount < expected) {
    failures.push(`content cache incomplete: ${cacheCount}/${expected}`);
  }
  if (!reachedMenu) {
    failures.push('the splash tap never reached the menu');
  }
  if (errors.length > 0) {
    failures.push(`page errors: ${errors.join(' | ')}`);
  }

  await browser.close();
  if (failures.length > 0) {
    console.log('READINESS FAILED:', failures.join(' | '));
    process.exitCode = 1;
  } else {
    console.log('READINESS OK');
  }
})().catch((error) => {
  console.error('probe failed:', error);
  process.exitCode = 1;
});
