import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Install-guide variants (parent-zone Phase 6): one page per variant with a
// UA override (plus navigator.standalone for the installed case); opens the
// gate and the install panel for screenshot evidence.
// Usage: dev server on :5199, then `node dev/qa/qa-install-variants.mjs`.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:5199';
const OUT = path.join(HERE, 'out');
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
} catch {
  browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
  });
}

const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

const VARIANTS = [
  { file: 'install-android.png', label: 'android', userAgent: ANDROID_UA },
  { file: 'install-ios.png', label: 'ios', userAgent: IPHONE_UA },
  { file: 'install-generic.png', label: 'generic', userAgent: undefined },
  { file: 'install-installed.png', label: 'installed', standalone: true, userAgent: undefined },
];

for (const variant of VARIANTS) {
  const context = await browser.newContext({
    userAgent: variant.userAgent,
    viewport: { width: 430, height: 900 },
  });
  if (variant.standalone) {
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'standalone', { get: () => true });
    });
  }
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.removeItem('trace-discover-save-v1'));
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__app && window.__app.screen, null, { timeout: 30000 });
  await wait(700);

  const tapTarget = async (id) => {
    const pt = await page.evaluate((targetId) => {
      const hit = window.__app.targets().find((t) => t.id === targetId);
      if (!hit) return null;
      const f = window.__app.field();
      return { x: f.x + (hit.x / 430) * f.width, y: f.y + (hit.y / 860) * f.height };
    }, id);
    if (!pt) throw new Error(`target missing: ${id}`);
    await page.mouse.click(pt.x, pt.y);
    await wait(450);
  };

  await tapTarget('splash');
  const gate = await page.evaluate(() => {
    const f = window.__app.field();
    const hit = window.__app.targets().find((t) => t.id === 'gate');
    return { x: f.x + (hit.x / 430) * f.width, y: f.y + (hit.y / 860) * f.height };
  });
  await page.mouse.move(gate.x, gate.y);
  await page.mouse.down();
  await wait(3000);
  await page.mouse.up();
  await wait(300);

  const screenName = await page.evaluate(() => window.__app.screen().name);
  if (screenName !== 'parent') {
    throw new Error(`ASSERT(${variant.label}): expected parent screen, got ${screenName}`);
  }
  await tapTarget('parent:install');
  await page.screenshot({ path: path.join(OUT, variant.file) });
  console.log(
    `${variant.label}: out/${variant.file} (errors: ${errors.length === 0 ? 'none' : errors.join(' | ')})`,
  );
  await context.close();
}

await browser.close();
