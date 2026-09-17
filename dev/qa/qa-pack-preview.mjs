import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Smoke: pack preview harness (pack.html) renders JSON pack levels straight
// from src/packs/data — strokes, margins, start/goal markers, checkpoint
// circles — and exposes them through window.__packPreview. Also captures
// spot-check screenshots for pre levels 1/7/12 and bonus 1.
// Usage: node dev/qa/qa-pack-preview.mjs (dev server on :5199)
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:5199';
const OUT = path.join(HERE, 'out');
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const logs = [];

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

const CASES = [
  { level: 'pre-1', shot: 'pack-preview-pre-1.png' },
  { level: 'pre-7', shot: 'pack-preview-pre-7.png' },
  { level: 'pre-12', shot: 'pack-preview-pre-12.png' },
  { level: 'pre-bonus-1', shot: 'pack-preview-pre-bonus-1.png' },
];

// --all sweeps every level of the pack for the full visual spot-check.
if (process.argv.includes('--all')) {
  for (let index = 1; index <= 12; index += 1) {
    const level = `pre-${index}`;
    if (!CASES.some((entry) => entry.level === level)) {
      CASES.push({ level, shot: `pack-preview-${level}.png` });
    }
  }
  for (let index = 1; index <= 3; index += 1) {
    const level = `pre-bonus-${index}`;
    if (!CASES.some((entry) => entry.level === level)) {
      CASES.push({ level, shot: `pack-preview-${level}.png` });
    }
  }
}

for (const { level, shot } of CASES) {
  await page.goto(`${BASE}/dev/harness/pack.html?pack=pre&level=${level}`, { waitUntil: 'load' });
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
        start: p.start,
        goal: p.goal,
      };
    });
    await page.screenshot({ path: path.join(OUT, shot) });
    const issues = [];
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

// Default URL (no params) must fall back to the first pack and level.
await page.goto(`${BASE}/dev/harness/pack.html`, { waitUntil: 'load' });
try {
  await page.waitForFunction(() => window.__packPreview !== undefined, null, { timeout: 15000 });
  const fallback = await page.evaluate(() => ({
    pack: window.__packPreview.pack.id,
    levelId: window.__packPreview.levelId,
  }));
  logs.push(`default url: ${fallback.pack}/${fallback.levelId}`);
} catch (error) {
  logs.push(`default url: FAILED to load -- ${String(error)}`);
}

logs.push(`page errors: ${pageErrors.length === 0 ? '(none)' : pageErrors.join(' | ')}`);
console.log(logs.join('\n'));
await browser.close();
