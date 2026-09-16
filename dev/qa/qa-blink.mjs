import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Smoke: new excavator.riv loads in-app and survives >1 idle-blink cycle.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  let browser = null;
  for (const exe of EDGE_PATHS) {
    if (fs.existsSync(exe)) {
      browser = await chromium.launch({ executablePath: exe });
      break;
    }
  }
  browser ??= await chromium.launch({ channel: 'msedge' });
  const pageErrors = [];
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  await page.goto('http://localhost:5176/dev/harness/play.html?level=pre-5', {
    waitUntil: 'load',
  });
  await page.waitForFunction(() => window.__qa !== undefined, null, { timeout: 30000 });
  await wait(7000);
  fs.mkdirSync(path.join(HERE, 'out'), { recursive: true });
  await page.screenshot({ path: path.join(HERE, 'out', 'blink-eased.png') });
  console.log(`page errors: ${pageErrors.length === 0 ? '(none)' : pageErrors.join(' | ')}`);
  await browser.close();
})().catch((error) => {
  console.error('blink smoke failed:', error);
  process.exitCode = 1;
});
