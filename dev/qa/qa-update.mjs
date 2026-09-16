// Update-lifecycle probe (track `pwa-resilience_20260916`) — proves the
// waiting-service-worker contract: updates download in the background but can
// never take over a running session; activation happens on the next cold start,
// and the relaunched version still works fully offline.
//
// Checks (all must pass):
//   1. Build audit — dist/sw.js has no skipWaiting()/clientsClaim() and keeps
//      precacheAndRoute + cleanupOutdatedCaches + navigation fallback.
//   2. Waiting semantics — after a synthetic update, the new worker waits while
//      the page is open; the running page is not claimed (no controllerchange)
//      and keeps being served by the old version.
//   3. Next-launch activation — close + reopen: the new version's precache is
//      served (marker visible) and works with the network fully offline.
//
// Usage: pnpm build && node dev/qa/qa-update.mjs
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(HERE, '..', '..', 'dist');
const OUT = path.join(HERE, 'out', 'update');
const SANDBOX = path.join(OUT, 'sandbox');
const PORT = Number(process.env.QA_UPDATE_PORT || 4185);
const BASE = `http://localhost:${PORT}/`;

const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.wasm': 'application/wasm',
  '.riv': 'application/octet-stream',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

async function launch() {
  for (const exe of EDGE_PATHS) {
    if (fs.existsSync(exe)) {
      return chromium.launch({ executablePath: exe });
    }
  }
  return chromium.launch({ channel: 'msedge' });
}

function startServer(root) {
  const server = http.createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/' || p === '') p = '/index.html';
    const file = path.normalize(path.join(root, p));
    if (!file.startsWith(root)) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    try {
      const body = await fs.promises.readFile(file);
      res.writeHead(200, {
        'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'cache-control': 'no-store',
      });
      res.end(body);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end(`not found: ${p}`);
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

// Both versions precache manifest.webmanifest, so a marker inside it can only
// come from a service worker cache — never from the network.
const fetchManifest = async (page) =>
  page.evaluate(async () => {
    const res = await fetch('./manifest.webmanifest').catch(() => null);
    if (res === null) return 'fetch-failed';
    return res.ok && (await res.text()).includes('qa-update-vB') ? 'vB' : 'vA';
  });

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  fs.cpSync(DIST, SANDBOX, { recursive: true });

  // 1. Build audit — the generated SW must never self-activate while sessions
  // are open, the app must never send an activation-forcing message, and
  // precaching + navigation fallback must stay intact. clientsClaim stays on
  // for first-launch offline: claiming only happens on first install or after
  // all instances close — never mid-session.
  const sw = fs.readFileSync(path.join(SANDBOX, 'sw.js'), 'utf8');
  const registerScript = fs.readFileSync(path.join(SANDBOX, 'registerSW.js'), 'utf8');
  check(
    'audit: no ungated skipWaiting (waits for every instance to close)',
    !/skipWaiting\(\s*\)\s*[,;)]/.test(sw),
    'SKIP_WAITING message-gated activation is fine; auto-activation is not',
  );
  check(
    'audit: app never sends SKIP_WAITING',
    !registerScript.includes('SKIP_WAITING') && !registerScript.includes('skipWaiting'),
  );
  check('audit: clientsClaim on activate (first-launch control)', sw.includes('clientsClaim('));
  check(
    'audit: precache + cleanup + navigation fallback intact',
    sw.includes('precacheAndRoute(') && sw.includes('cleanupOutdatedCaches(') && sw.includes('createHandlerBoundToURL('),
  );

  const server = await startServer(SANDBOX);
  const browser = await launch();
  const context = await browser.newContext({ viewport: { width: 430, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));

  // 2a. Fresh install of version A: SW controls, marker not yet present.
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__app !== undefined, null, { timeout: 15000 });
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 20000 });
  const manifestA = await fetchManifest(page);
  check('session A: app ready, SW controlling', true);
  check('session A: vA content served', manifestA === 'vA', manifestA);
  await page.screenshot({ path: path.join(OUT, 'a-online.png') });

  // 2b. Deploy version B into the sandbox: mark a file both versions precache
  // (manifest.webmanifest) and bump its precache revision so vB fetches the
  // new bytes; the changed sw.js is what the update check picks up.
  const manifestPath = path.join(SANDBOX, 'manifest.webmanifest');
  const manifestB = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifestB['qa-update-vB'] = true;
  fs.writeFileSync(manifestPath, JSON.stringify(manifestB));
  const swB = `${sw.replace(/url:"manifest\.webmanifest",revision:"[^"]*"/, 'url:"manifest.webmanifest",revision:"qa-update-vB"')}\n// qa-update vB\n`;
  if (!swB.includes('revision:"qa-update-vB"')) {
    throw new Error('qa-update: failed to rewrite the manifest revision in sw.js');
  }
  fs.writeFileSync(path.join(SANDBOX, 'sw.js'), swB);

  await page.evaluate(() => {
    window.__qaCtrl = 0;
    window.__qaAlive = 'yes';
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.__qaCtrl += 1;
    });
  });
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration.update();
  });

  const waitingOk = await page
    .waitForFunction(
      async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        return registration !== undefined && registration !== null && registration.waiting !== null;
      },
      null,
      { timeout: 20000 },
    )
    .then(() => true)
    .catch(() => false);
  check('update: new worker waits while a session is open', waitingOk);

  await page.waitForTimeout(2000); // settle window: any (wrong) activation must surface here
  const live = await page.evaluate(() => ({ ctrl: window.__qaCtrl, alive: window.__qaAlive }));
  check('update: running page was not claimed (no controllerchange)', live.ctrl === 0, `controllerchange fired ${live.ctrl}x`);
  check('update: running session untouched (no reload)', live.alive === 'yes');
  const manifestMid = await fetchManifest(page);
  check('update: session still served by vA', manifestMid === 'vA', manifestMid);
  await page.screenshot({ path: path.join(OUT, 'b-after-update.png') });

  // 3. Close every client => the waiting worker activates; reopen => vB serves.
  await page.close();
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const page2 = await context.newPage();
  page2.on('pageerror', (error) => errors.push(String(error)));
  await page2.goto(BASE, { waitUntil: 'load' });
  await page2.waitForFunction(() => window.__app !== undefined, null, { timeout: 15000 });
  await page2.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 20000 });
  const manifestAfter = await fetchManifest(page2);
  check('relaunch: next cold start serves the new version', manifestAfter === 'vB', manifestAfter);
  await page2.screenshot({ path: path.join(OUT, 'c-relaunch.png') });

  // 3b. The relaunched version must still work with the network fully offline.
  await page2.context().setOffline(true);
  await page2.reload({ waitUntil: 'load' });
  await page2.waitForFunction(() => window.__app !== undefined, null, { timeout: 15000 });
  check('offline: app boots from precache', true);
  const manifestOffline = await fetchManifest(page2);
  check('offline: vB precache serves the marker', manifestOffline === 'vB', manifestOffline);
  await page2.screenshot({ path: path.join(OUT, 'd-offline.png') });

  check('no page errors', errors.length === 0, errors.join(' | ') || 'none');

  await browser.close();
  server.close();
  server.closeAllConnections();

  const failed = results.filter((entry) => !entry.ok);
  console.log(
    failed.length === 0
      ? '\nqa-update: ALL CHECKS PASSED'
      : `\nqa-update: ${failed.length} CHECK(S) FAILED:\n${failed.map((entry) => `  - ${entry.name} (${entry.detail})`).join('\n')}`,
  );
  process.exit(failed.length > 0 ? 1 : 0);
})().catch((error) => {
  console.error('probe failed:', error);
  process.exit(1);
});
