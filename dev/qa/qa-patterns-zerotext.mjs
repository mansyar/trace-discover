// Zero-text audit for the patterns surfaces (patterns-pack_20260920):
// child-facing screens must not render any text nodes (icons/sound/motion
// only). Throwaway evidence probe, qa-animals-zerotext precedent.
import { chromium } from 'playwright-core';

const BASE = process.argv[2] ?? 'http://localhost:5199';
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
  results.push(`${label}: ${value === '' ? 'clean' : `"${value}"`}`);
};

await audit('splash');
await tap('splash');
await audit('menu (six packs)');
await tap('pack:patterns');
await audit('pack (patterns)');
await tap('level:pattern-1');
await audit('level (pattern-1)');

const dirty = results.filter((line) => !line.endsWith('clean'));
console.log(results.join('\n'));
console.log(dirty.length === 0 ? 'zero-text audit passed' : `zero-text audit FAILED (${dirty.length})`);
await browser.close();
process.exitCode = dirty.length === 0 ? 0 : 1;
