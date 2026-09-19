import { chromium } from 'playwright-core';

// Zero-text audit: child-facing surfaces must not render any text nodes
// (icons/sound/motion only). Parent zone is the one place text is allowed,
// so it is not part of this sweep. Throwaway evidence probe.
const BASE = process.argv[2] ?? 'http://localhost:4173';
const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch() {
  const fs = await import('node:fs');
  for (const exe of EDGE_PATHS) {
    if (fs.existsSync(exe)) {
      return chromium.launch({ executablePath: exe });
    }
  }
  return chromium.launch({ channel: 'msedge' });
}

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
await page.goto(BASE + '/index.html');
await page.evaluate(() => localStorage.removeItem('trace-discover-save-v1'));
await page.reload();
await page.waitForFunction(() => window.__app !== undefined, null, { timeout: 15000 });

const text = () => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim());

const tap = async (id) => {
  const pt = await page.evaluate((targetId) => {
    const hit = window.__app.targets().find((t) => t.id === targetId);
    const f = window.__app.field();
    return hit ? { x: f.x + (hit.x / 430) * f.width, y: f.y + (hit.y / 860) * f.height } : null;
  }, id);
  if (!pt) {
    throw new Error(`target missing: ${id}`);
  }
  await page.mouse.click(pt.x, pt.y);
  await wait(350);
};

const results = [];
const audit = async (label) => {
  const value = await text();
  results.push(`${label}: ${value === '' ? 'clean' : `'"${value}"'`}`);
};

await audit('splash');
await tap('splash');
await audit('menu');
await tap('pack:animals');
await audit('pack (animals)');
await tap('level:animal-1');
await audit('level (animal-1)');

const dirty = results.filter((line) => !line.endsWith('clean'));
console.log(results.join('\n'));
console.log(dirty.length === 0 ? 'zero-text audit passed' : `zero-text audit FAILED (${dirty.length})`);
await browser.close();
process.exitCode = dirty.length === 0 ? 0 : 1;
