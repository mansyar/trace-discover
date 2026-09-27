// Offline cold-start probe: installs the SW from the production preview
// server, then goes fully offline and plays pre-1 end to end. It also asserts
// the boot escapes a first run can take - a complete cache, an incomplete
// cache, and a level opened while its content is still missing - never present
// the gate, and that returning connectivity heals the open level in place.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const URL = process.argv[2] ?? 'http://localhost:4173/';
const LEVEL = process.argv[3] ?? 'pre-1';
const OUT = path.join(HERE, 'out', 'offline');
const DIST = path.resolve(HERE, '..', '..', 'dist');
const CONTENT_CACHE_NAME = 'trace-discover-content-v1';

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

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));

  // content() is null until the boot has decided once, so wait for the decision
  // before reading it instead of assuming it is already there.
  const waitForReadiness = async (timeoutMs = 20000) => {
    const deadline = Date.now() + timeoutMs;
    let state = null;
    while (Date.now() < deadline) {
      state = await page.evaluate(() => window.__app.content());
      if (state !== null) {
        return state;
      }
      await page.waitForTimeout(5);
    }
    throw new Error(`readiness never resolved (last state ${JSON.stringify(state)})`);
  };

  // Online first visit: let the service worker install + precache.
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__app !== undefined, null, { timeout: 15000 });
  await page.waitForFunction(
    () => navigator.serviceWorker?.controller !== null,
    null,
    { timeout: 20000 },
  );
  console.log('online: app ready, SW controlling');

  // Let the first-visit SW control change settle (it can trigger a self-reload;
  // seeding a save mid-reload is racy and can lose the write).
  await page.waitForTimeout(1200);
  await page.waitForFunction(() => window.__app !== undefined, null, { timeout: 15000 });

  const expectedContentCount = countShippedContentFiles();
  await page.waitForFunction(
    (expected) =>
      caches
        .open('trace-discover-content-v1')
        .then((cache) => cache.keys())
        .then((keys) => keys.length >= expected),
    expectedContentCount,
    { timeout: 60000 },
  );
  const onlineContentCount = await page.evaluate(async () => {
    const cache = await caches.open('trace-discover-content-v1');
    return (await cache.keys()).length;
  });
  if (onlineContentCount < expectedContentCount) {
    throw new Error(
      `online content warm-up incomplete: ${onlineContentCount}/${expectedContentCount}`,
    );
  }
  console.log(`online: content warm-up ${onlineContentCount}/${expectedContentCount}`);

  // Record every readiness state a boot reports, from the very first frame on,
  // so "the gate never appeared" is an observation rather than an assumption.
  await page.addInitScript(() => {
    window.__readiness = [];
    const timer = setInterval(() => {
      const state = window.__app?.content?.();
      if (state) {
        window.__readiness.push({
          fraction: state.fraction,
          ready: state.ready,
          reason: state.reason,
          t: performance.now(),
        });
        if (window.__readiness.length > 400) {
          clearInterval(timer);
        }
      }
    }, 2);
  });

  // Returning user, online, complete cache: the scan plays straight through on
  // the next frame, so the gate must never be presented.
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__app !== undefined, null, { timeout: 15000 });
  const onlineReturn = {
    readiness: await page.evaluate(() => window.__readiness),
    state: await waitForReadiness(),
  };
  if (onlineReturn.state?.reason !== 'complete' || onlineReturn.state.ready !== true) {
    throw new Error(
      `online returning-user boot did not play straight through: ${JSON.stringify(onlineReturn.state)}`,
    );
  }
  if (onlineReturn.readiness.some((sample) => sample.ready === false)) {
    throw new Error('online returning-user boot presented the gate');
  }
  console.log(
    `online returning-user boot: no gate (reason ${onlineReturn.state.reason}, ${onlineReturn.readiness.length} samples)`,
  );

  // Optional preset skin (4th arg): prove that skin's assets boot offline too.
  const skin = process.argv[4];
  if (skin) {
    await page.evaluate((s) => {
      localStorage.setItem(
        'trace-discover-save-v1',
        JSON.stringify({
          badges: [],
          completedLevels: [],
          settings: { easierTracing: false, muted: false, skin: s, volume: 1 },
          trophies: [],
          version: 3,
        }),
      );
    }, skin);
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.__app !== undefined, null, { timeout: 15000 });
    const presetSkin = await page.evaluate(() => {
      const raw = localStorage.getItem('trace-discover-save-v1');
      return raw ? JSON.parse(raw).settings.skin : null;
    });
    if (presetSkin !== skin) {
      throw new Error(`preset skin did not persist (storage: ${presetSkin})`);
    }
    console.log(`preset skin: ${skin} (storage: ${presetSkin})`);
  }

  // Fully offline, cold reload.
  await page.context().setOffline(true);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__app !== undefined, null, { timeout: 15000 });
  const offlineSkin = await page.evaluate(() => {
    const raw = localStorage.getItem('trace-discover-save-v1');
    return raw ? JSON.parse(raw).settings.skin : null;
  });
  const offlineContentCount = await page.evaluate(async () => {
    const cache = await caches.open('trace-discover-content-v1');
    return (await cache.keys()).length;
  });
  if (offlineContentCount < expectedContentCount) {
    throw new Error(
      `offline content cache incomplete: ${offlineContentCount}/${expectedContentCount}`,
    );
  }
  console.log(
    `offline: app booted with ${offlineContentCount}/${expectedContentCount} content assets (storage skin: ${offlineSkin})`,
  );

  // Returning user, offline, complete cache: playing immediately is the only
  // useful answer, so the gate must never be presented here either.
  const offlineReturn = {
    readiness: await page.evaluate(() => window.__readiness),
    state: await waitForReadiness(),
  };
  if (offlineReturn.state?.reason !== 'offline' || offlineReturn.state.ready !== true) {
    throw new Error(
      `offline returning-user boot did not escape the gate: ${JSON.stringify(offlineReturn.state)}`,
    );
  }
  if (offlineReturn.readiness.some((sample) => sample.ready === false)) {
    throw new Error('offline returning-user boot presented the gate');
  }
  const offlineDecisionMs = Math.round(offlineReturn.readiness[0]?.t ?? -1);
  if (offlineDecisionMs < 0 || offlineDecisionMs > 1000) {
    throw new Error(`offline returning-user boot decided after ${offlineDecisionMs} ms`);
  }
  console.log(
    `offline returning-user boot: no gate, decided ${offlineDecisionMs} ms after load (${offlineReturn.readiness.length} samples)`,
  );

  const tap = async (id) => {
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
      throw new Error('target missing: ' + id);
    }
    await page.mouse.click(pt.x, pt.y);
    await page.waitForTimeout(400);
  };

  // Poll from Node here too: a Playwright async predicate hands back its Promise
  // (always truthy) immediately, so waitForFunction would not actually wait.
  const waitForCacheSize = async (expected) => {
    const deadline = Date.now() + 60000;
    let seen = 0;
    while (Date.now() < deadline) {
      seen = await page.evaluate(async (name) => {
        const cache = await caches.open(name);
        return (await cache.keys()).length;
      }, CONTENT_CACHE_NAME);
      if (seen >= expected) {
        return seen;
      }
      await page.waitForTimeout(100);
    }
    throw new Error(`content cache never refilled (last seen ${seen}/${expected})`);
  };

  await tap('splash');
  const packId = LEVEL.startsWith('num-')
    ? 'numbers'
    : LEVEL.startsWith('shape-')
      ? 'shapes'
      : LEVEL.startsWith('pattern-')
        ? 'patterns'
        : LEVEL.startsWith('animal-')
          ? 'animals'
          : 'pre';
  await tap(`pack:${packId}`);
  await page.screenshot({ path: path.join(OUT, 'offline-pack.png') });

  // Trace the chosen level with the real pointer path.
  await tap(`level:${LEVEL}`);
  await page.waitForFunction(() => window.__app.path().length > 10, null, { timeout: 30000 });
  const trace = await page.evaluate(() => {
    const field = window.__app.field();
    const path = window.__app.path();
    const pts = path.filter((_, i) => i % 4 === 0);
    pts.push(path[path.length - 1]);
    return { field, pts };
  });
  const toClient = (p) => ({
    x: trace.field.x + (p.x / 430) * trace.field.width,
    y: trace.field.y + (p.y / 860) * trace.field.height,
  });
  const first = toClient(trace.pts[0]);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  for (const p of trace.pts.slice(1)) {
    const c = toClient(p);
    await page.mouse.move(c.x, c.y, { steps: 2 });
    await page.waitForTimeout(60);
  }
  const goal = toClient(trace.pts[trace.pts.length - 1]);
  for (let i = 0; i < 6; i += 1) {
    await page.mouse.move(goal.x, goal.y);
    await page.waitForTimeout(120);
  }
  await page.mouse.up();
  const success = await page
    .waitForFunction(() => window.__app.success(), null, { timeout: 30000 })
    .then(() => true)
    .catch(() => false);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: path.join(OUT, `offline-${LEVEL}-success.png`) });
  console.log(`offline ${LEVEL} trace:`, success ? 'SUCCESS' : 'INCOMPLETE');

  // Incomplete cache while offline: waiting cannot gain anything, so the boot
  // must play immediately - no gate and no dead end on a half-cached device.
  const keptEntries = await page.evaluate(async (name) => {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    for (const key of keys.slice(6)) {
      await cache.delete(key);
    }
    return (await cache.keys()).length;
  }, CONTENT_CACHE_NAME);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__app !== undefined, null, { timeout: 15000 });
  const escaped = {
    readiness: await page.evaluate(() => window.__readiness),
    state: await waitForReadiness(),
  };
  const escapeMs = Math.round(escaped.readiness[0]?.t ?? -1);
  if (
    escaped.state?.reason !== 'offline' ||
    escaped.state.ready !== true ||
    escaped.state.fraction !== 1
  ) {
    throw new Error(
      `incomplete-cache offline boot did not escape the gate: ${JSON.stringify(escaped.state)}`,
    );
  }
  if (escaped.readiness.some((sample) => sample.ready === false)) {
    throw new Error('incomplete-cache offline boot presented the gate');
  }
  if (escapeMs < 0 || escapeMs > 1000) {
    throw new Error(`incomplete-cache offline boot decided after ${escapeMs} ms`);
  }
  console.log(
    `offline with ${keptEntries}/${expectedContentCount} cached: no gate, decided ${escapeMs} ms after load (the whole cache was not awaited)`,
  );
  await tap('splash');
  await page.waitForFunction(() => window.__app.screen().name === 'menu', null, { timeout: 15000 });
  console.log('offline incomplete cache: one tap reached the menu');

  // A level opened while its content is still missing: the drawn stand-ins carry
  // it, and returning connectivity must make it fully real in place.
  await tap(`pack:${packId}`);
  await tap(`level:${LEVEL}`);
  await page.waitForFunction(() => window.__app.path().length > 10, null, { timeout: 30000 });
  const standinRun = await page.evaluate(() => ({
    character: window.__app.character(),
    levelContent: window.__app.levelContent(),
    path: window.__app.path().length,
    screen: `${window.__app.screen().name}/${window.__app.screen().levelId}`,
  }));
  if (standinRun.character !== 'standin') {
    throw new Error(`offline level did not present the drawn stand-in: ${standinRun.character}`);
  }
  await page.screenshot({ path: path.join(OUT, `${LEVEL}-standin.png`) });

  await page.context().setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.waitForFunction(() => window.__app.character() === 'real', null, { timeout: 30000 });
  const refilled = await waitForCacheSize(expectedContentCount);
  await page.waitForTimeout(800);
  const healed = await page.evaluate(() => ({
    character: window.__app.character(),
    charCanvas: document.querySelector('#char').style.display,
    levelContent: window.__app.levelContent(),
    path: window.__app.path().length,
    screen: `${window.__app.screen().name}/${window.__app.screen().levelId}`,
  }));
  await page.screenshot({ path: path.join(OUT, `${LEVEL}-healed.png`) });
  console.log(`level on stand-ins: ${JSON.stringify(standinRun)}`);
  console.log(
    `level after connectivity returned: ${JSON.stringify(healed)} (content cache ${refilled}/${expectedContentCount})`,
  );
  if (healed.character !== 'real' || healed.charCanvas !== 'block') {
    throw new Error('the open level never became fully real when connectivity returned');
  }
  if (healed.screen !== standinRun.screen || healed.path < standinRun.path) {
    throw new Error(
      `the level restarted while healing (${standinRun.screen} -> ${healed.screen}, path ${standinRun.path} -> ${healed.path})`,
    );
  }

  console.log('page errors:', errors.length === 0 ? '(none)' : errors.join(' | '));
  await browser.close();
  if (!success || errors.length > 0) {
    process.exitCode = 1;
  }
})().catch((error) => {
  console.error('probe failed:', error);
  // Exit outright: a stranded browser keeps the event loop alive, so setting an
  // exit code would hang the probe instead of reporting the failure.
  process.exit(1);
});
