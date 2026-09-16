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
//   3. Next-launch activation — close + reopen: the new version serves (its new
//      precache entry is visible) and works with the network fully offline.
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

const fetchMarker = async (page) =>
  page.evaluate(async () => {
    const res = await fetch('./qa-marker.txt').catch(() => null);
    if (res === null) return 'fetch-failed';
    return `${res.status}:${(await res.text()).trim()}`;
  });

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  fs.cpSync(DIST, SANDBOX, { recursive: true });

  // 1. Build audit — the generated SW must not force activation or claiming.
  const sw = fs.readFileSync(path.join(SANDBOX, 'sw.js'), 'utf8');
  check('audit: sw.js has no skipWaiting()', !sw.includes('skipWaiting('), 'must wait for all instances to close');
  check('audit: sw.js has no clientsClaim()', !sw.includes('clientsClaim('), 'must not claim open pages');
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
  const markerA = await fetchMarker(page);
  check('session A: app ready, SW controlling', true);
  check('session A: vB marker absent', markerA === '404:not found: /qa-marker.txt', markerA);
  await page.screenshot({ path: path.join(OUT, 'a-online.png') });

  // 2b. Deploy version B into the sandbox, then trigger an update check.
  fs.writeFileSync(path.join(SANDBOX, 'qa-marker.txt'), 'vB');
  const swB = `${sw.replace('precacheAndRoute([', 'precacheAndRoute([{url:"qa-marker.txt",revision:null},')}\n// qa-update vB\n`;
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
  const markerMid = await fetchMarker(page);
  check('update: session still served by vA', markerMid === '404:not found: /qa-marker.txt', markerMid);
  await page.screenshot({ path: path.join(OUT, 'b-after-update.png') });

  // 3. Close every client => the waiting worker activates; reopen => vB serves.
  await page.close();
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const page2 = await context.newPage();
  page2.on('pageerror', (error) => errors.push(String(error)));
  await page2.goto(BASE, { waitUntil: 'load' });
  await page2.waitForFunction(() => window.__app !== undefined, null, { timeout: 15000 });
  await page2.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 20000 });
  const markerB = await fetchMarker(page2);
  check('relaunch: next cold start serves the new version', markerB === '200:vB', markerB);
  await page2.screenshot({ path: path.join(OUT, 'c-relaunch.png') });

  // 3b. The relaunched version must still work with the network fully offline.
  await page2.context().setOffline(true);
  await page2.reload({ waitUntil: 'load' });
  await page2.waitForFunction(() => window.__app !== undefined, null, { timeout: 15000 });
  check('offline: app boots from precache', true);
  const markerOffline = await fetchMarker(page2);
  check('offline: vB precache serves the marker', markerOffline === '200:vB', markerOffline);
  await page2.screenshot({ path: path.join(OUT, 'd-offline.png') });

  check('no page errors', errors.length === 0, errors.join(' | ') || 'none');

  await browser.close();
  server.close();

  const failed = results.filter((entry) => !entry.ok);
  console.log(
    failed.length === 0
      ? '\nqa-update: ALL CHECKS PASSED'
      : `\nqa-update: ${failed.length} CHECK(S) FAILED:\n${failed.map((entry) => `  - ${entry.name} (${entry.detail})`).join('\n')}`,
  );
  if (failed.length > 0) {
    process.exitCode = 1;
  }
})().catch((error) => {
  console.error('probe failed:', error);
  process.exitCode = 1;
});
