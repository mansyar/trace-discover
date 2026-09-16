import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Burst-capture the dino harness (fixed dino skin) to verify mid-blink parity
// of the rebuilt dino.riv (480 px re-cut + cast patch technique).
// Idle loop is 180 frames @60fps (3 s); blink occupies ~f110-117 (~0.12 s).
// Usage: node dev/qa/qa-dino-blink.mjs (dev server on :5199)
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out', 'dino', 'blinkseq');
const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) fs.rmSync(path.join(OUT, f));
  let browser = null;
  for (const exe of EDGE_PATHS) {
    if (fs.existsSync(exe)) {
      browser = await chromium.launch({ executablePath: exe });
      break;
    }
  }
  browser ??= await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  await page.goto('http://localhost:5199/dev/harness/play.html?level=pre-5', {
    waitUntil: 'load',
  });
  await page.waitForFunction(() => window.__qa !== undefined, null, { timeout: 30000 });
  await wait(600);
  const N = 32;
  for (let i = 0; i < N; i++) {
    await page.screenshot({ path: path.join(OUT, `f${String(i).padStart(2, '0')}.png`) });
    await wait(175);
  }
  console.log(`captured ${N} frames in ${OUT}`);
  console.log(`page errors: ${pageErrors.length === 0 ? '(none)' : pageErrors.join(' | ')}`);
  await browser.close();
})().catch((error) => {
  console.error('burst failed:', error);
  process.exitCode = 1;
});
