// Name persistence hostile-input QA: hostile stored `name` values never crash
// the boot and never leak into the child UI; the first save rewrites them
// sanitized. Usage: pnpm exec vite --port 5199 --strictPort then
// node dev/qa/qa-name-hostile.mjs
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:4173';
const KEY = 'trace-discover-save-v1';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out');
mkdirSync(OUT, { recursive: true });

const failures = [];
function check(name, ok) {
  console.log(`${ok ? 'ok' : 'FAIL'} - ${name}`);
  if (!ok) failures.push(name);
}

async function launch() {
  try {
    return await chromium.launch({ channel: 'msedge' });
  } catch {
    return await chromium.launch({
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    });
  }
}

const baseSave = {
  badges: [],
  completedLevels: [],
  settings: { easierTracing: false, muted: false, skin: 'dino', volume: 1 },
  trophies: [],
  version: 3,
};

// value -> expected sanitized name ('' means "no name card")
const FIXTURES = [
  ['a number', 42, ''],
  ['an array', ['A', 'V'], ''],
  ['an object', { name: 'AVA' }, ''],
  ['a one-letter name', 'a', ''],
  ['a whitespace-and-symbols name', 'a b c', 'ABC'],
  ['a mixed hostile string', 'ab12!@', 'AB'],
  ['an overlong name', 'x'.repeat(40), 'XXXXXXX'],
  ['a nested object payload', { toString: 'evil' }, ''],
];

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));

const cardIds = () =>
  page.evaluate(() =>
    window.__app
      .targets()
      .map((t) => t.id)
      .filter((id) => id.startsWith('pack:') && id !== 'pack:home' && id !== 'pack:badge'),
  );

const tapSplash = async () => {
  const p = await page.evaluate(() => {
    const f = window.__app.field();
    return { x: f.x + (215 / 430) * f.width, y: f.y + (430 / 860) * f.height };
  });
  await page.mouse.click(p.x, p.y);
  await page.waitForFunction(() => window.__app.screen().name === 'menu', null, { timeout: 10000 });
};

const tapTarget = async (id) => {
  const hit = await page.evaluate((targetId) => {
    const target = window.__app.targets().find((t) => t.id === targetId);
    if (!target) throw new Error(`target missing: ${targetId}`);
    const f = window.__app.field();
    return { x: f.x + (target.x / 430) * f.width, y: f.y + (target.y / 860) * f.height };
  }, id);
  await page.mouse.click(hit.x, hit.y);
  await page.waitForTimeout(400);
};

await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
try {
  for (const [label, value, expected] of FIXTURES) {
    await page.evaluate(
      ([key, save, hostile]) => {
        localStorage.setItem(key, JSON.stringify({ ...save, name: hostile }));
      },
      [KEY, baseSave, value],
    );
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.__app && window.__app.screen, null, { timeout: 30000 });
    await tapSplash();
    const ids = await cardIds();
    if (expected === '') {
      check(`${label}: boots to 3 cards, no name`, ids.length === 3 && !ids.includes('pack:name'));
    } else {
      check(
        `${label}: composes "${expected}"`,
        ids.length === 4 && ids.includes('pack:name'),
      );
      await tapTarget('skin:cycle');
      const rewritten = await page.evaluate((key) => {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw).name : undefined;
      }, KEY);
      check(`${label}: first save rewrites "${expected}"`, rewritten === expected);
    }
  }
} catch (error) {
  console.error('FAILED:', String(error));
  process.exitCode = 1;
}

console.log(`page errors: ${pageErrors.length ? pageErrors.join(' | ') : '(none)'}`);
if (pageErrors.length) process.exitCode = 1;
if (failures.length) process.exitCode = 1;
await browser.close();
