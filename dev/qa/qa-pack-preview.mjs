import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Smoke: pack preview harness (pack.html) renders JSON pack levels straight
// from src/packs/data — strokes, margins, start/goal markers, checkpoint
// circles — and exposes them through window.__packPreview. Spot-checks the
// first/middle/last main level of every pack plus its first bonus, and
// captures a screenshot per case.
// Usage: node dev/qa/qa-pack-preview.mjs [baseUrl] [--all]
// The preview page lives in dev/harness/ — a Vite *dev* server must be running
// (`pnpm exec vite --port 5199 --strictPort`); prod preview (`pnpm preview`)
// does not serve dev/.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.argv.find((arg) => arg.startsWith('http')) ?? 'http://localhost:5199';
const OUT = path.join(HERE, 'out');
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const logs = [];

// Packs + levels straight from disk: deterministic order, no server needed.
const DATA_DIR = path.resolve(HERE, '../../src/packs/data');
const packs = fs
  .readdirSync(DATA_DIR)
  .filter((file) => file.endsWith('.json'))
  .sort()
  .map((file) => {
    const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
    return {
      bonuses: (raw.bonuses ?? []).map((level) => level.id),
      id: raw.id,
      mains: (raw.levels ?? []).map((level) => level.id),
    };
  });

// Spot cases: first/middle/last main level + first bonus of every pack;
// --all appends every remaining level.
const all = process.argv.includes('--all');
const CASES = [];
for (const pack of packs) {
  const seen = new Set();
  const add = (level) => {
    if (typeof level === 'string' && !seen.has(level)) {
      seen.add(level);
      CASES.push({ level, pack: pack.id });
    }
  };
  if (all) {
    for (const level of [...pack.mains, ...pack.bonuses]) add(level);
  } else {
    add(pack.mains[0]);
    add(pack.mains[Math.floor(pack.mains.length / 2)]);
    add(pack.mains[pack.mains.length - 1]);
    add(pack.bonuses[0]);
  }
}

let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
} catch {
  browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
  });
}

const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(String(error)));

for (const { level, pack } of CASES) {
  await page.goto(`${BASE}/dev/harness/pack.html?pack=${pack}&level=${level}`, { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => window.__packPreview !== undefined, null, { timeout: 15000 });
    await wait(400);
    const preview = await page.evaluate(() => {
      const p = window.__packPreview;
      return {
        pack: p.pack.id,
        levelId: p.levelId,
        strokes: p.strokes.length,
        checkpoints: p.checkpointPoints.length,
        margin: p.margin,
      };
    });
    await page.screenshot({ path: path.join(OUT, `pack-preview-${level}.png`) });
    const issues = [];
    if (preview.pack !== pack) issues.push(`pack mismatch (${preview.pack})`);
    if (preview.levelId !== level) issues.push(`level mismatch (${preview.levelId})`);
    if (preview.checkpoints !== 6) issues.push(`checkpoints ${preview.checkpoints} !== 6`);
    if (preview.strokes < 1) issues.push('no strokes');
    logs.push(
      issues.length === 0
        ? `${level}: OK (strokes ${preview.strokes}, checkpoints ${preview.checkpoints}, margin ${preview.margin})`
        : `${level}: PROBLEM -- ${issues.join('; ')}`,
    );
  } catch (error) {
    logs.push(`${level}: FAILED to load -- ${String(error)}`);
  }
}

// Default URL (no params) must fall back to a known pack + level.
await page.goto(`${BASE}/dev/harness/pack.html`, { waitUntil: 'load' });
try {
  await page.waitForFunction(() => window.__packPreview !== undefined, null, { timeout: 15000 });
  const fallback = await page.evaluate(() => ({
    pack: window.__packPreview.pack.id,
    levelId: window.__packPreview.levelId,
  }));
  const known = packs.some(
    (entry) => entry.id === fallback.pack && [...entry.mains, ...entry.bonuses].includes(fallback.levelId),
  );
  logs.push(
    `default url: ${known ? 'OK' : 'PROBLEM'} -- ${fallback.pack}/${fallback.levelId} (packs: ${packs
      .map((entry) => entry.id)
      .join(', ')})`,
  );
} catch (error) {
  logs.push(`default url: FAILED to load -- ${String(error)}`);
}

logs.push(`page errors: ${pageErrors.length === 0 ? '(none)' : pageErrors.join(' | ')}`);
console.log(logs.join('\n'));
await browser.close();
