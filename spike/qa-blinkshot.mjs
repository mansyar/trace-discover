import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Burst-capture the parked excavator so we can pick a mid-blink frame.
// Idle loop is 180 frames @60fps (3s); blink occupies ~f106-120 (~0.23s).
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'qa', 'blinkseq');
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
  await page.goto('http://localhost:5176/play.html?level=construction-1', {
    waitUntil: 'load',
  });
  await page.waitForFunction(() => window.__qa !== undefined, null, { timeout: 30000 });
  await wait(1500);
  const N = 24;
  for (let i = 0; i < N; i++) {
    await page.screenshot({ path: path.join(OUT, `f${String(i).padStart(2, '0')}.png`) });
    await wait(175);
  }
  console.log(`captured ${N} frames in ${OUT}`);
  await browser.close();
})().catch((error) => {
  console.error('burst failed:', error);
  process.exitCode = 1;
});
