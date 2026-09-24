// Foreground WebP diet for the payload-headroom track.
// Stages browser-canvas re-encodes for review; it never changes shipped files
// unless invoked explicitly with --install. Asset paths, dimensions, alpha,
// and URLs are preserved. Rive/WASM and non-foreground art are excluded.
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const ART = path.join(ROOT, 'public', 'art');
const OUT = path.join(ROOT, 'dev', 'qa', 'out', 'webp-diet');
const DEFAULT_CLASSES = ['goal', 'sticker', 'pack'];
const QUALITY_BY_CLASS = Object.freeze({
  bg: 0.8,
  face: 0.85,
  goal: 0.75,
  pack: 0.75,
  sticker: 0.75,
});

/**
 * @typedef {{ readonly afterBytes: number, readonly beforeBytes: number, readonly path: string }} DietRow
 * @typedef {{ readonly height: number, readonly width: number }} ImageSize
 */

/**
 * Returns the quality floor for a normalized art-relative path.
 * @param {string} filePath
 * @returns {number | undefined}
 */
export function qualityForArtPath(filePath) {
  const artClass = normalizePath(filePath).split('/')[0];
  return QUALITY_BY_CLASS[artClass];
}

/**
 * Candidate paths deliberately match shipped paths so installation is URL-safe.
 * @param {string} filePath
 * @returns {string}
 */
export function candidateOutputPath(filePath) {
  return normalizePath(filePath);
}

/**
 * @param {readonly DietRow[]} rows
 * @returns {{ readonly afterBytes: number, readonly beforeBytes: number, readonly fileCount: number, readonly savedBytes: number }}
 */
export function summarizeSavings(rows) {
  const beforeBytes = rows.reduce((sum, row) => sum + row.beforeBytes, 0);
  const afterBytes = rows.reduce((sum, row) => sum + row.afterBytes, 0);
  return {
    afterBytes,
    beforeBytes,
    fileCount: rows.length,
    savedBytes: beforeBytes - afterBytes,
  };
}

/**
 * Stages the selected foreground classes and writes a review page.
 * @param {readonly string[]} classes
 * @returns {Promise<void>}
 */
export async function stageCandidates(classes = DEFAULT_CLASSES) {
  const selected = normalizeClasses(classes);
  const files = collectFiles(ART, selected);
  if (files.length === 0) {
    throw new Error(`webp-diet: no WebP files found for classes ${selected.join(', ')}`);
  }
  mkdirSync(path.join(OUT, 'webp'), { recursive: true });
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto('about:blank');
  const rows = [];

  for (const file of files) {
    const relative = path.relative(ART, file).split(path.sep).join('/');
    const quality = qualityForArtPath(relative);
    if (quality === undefined) {
      throw new Error(`webp-diet: no quality policy for ${relative}`);
    }
    const result = await reencode(page, file, quality);
    const output = path.join(OUT, 'webp', relative);
    mkdirSync(path.dirname(output), { recursive: true });
    const outputBytes = Buffer.from(result.dataUrl.split(',')[1] ?? '', 'base64');
    writeFileSync(output, outputBytes);
    const row = {
      afterBytes: outputBytes.length,
      beforeBytes: statSync(file).size,
      height: result.height,
      maxDelta: result.maxDelta,
      overPct: result.overPct,
      path: relative,
      quality,
      rmse: result.rmse,
      width: result.width,
    };
    rows.push(row);
    console.log(
      `${relative} ${result.width}x${result.height} ${row.beforeBytes} -> ${row.afterBytes} B rmse=${result.rmse} over=${result.overPct}%`,
    );
  }
  await browser.close();

  const manifest = {
    classes: selected,
    generatedAt: new Date().toISOString(),
    qualityByClass: QUALITY_BY_CLASS,
    summary: summarizeSavings(rows),
    assets: rows,
  };
  writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  writeFileSync(path.join(OUT, 'review.html'), reviewPage(rows));
  console.log(
    `\n${rows.length} candidates: ${manifest.summary.beforeBytes} -> ${manifest.summary.afterBytes} B (saved ${manifest.summary.savedBytes} B)`,
  );
  console.log(`Review: ${path.relative(ROOT, path.join(OUT, 'review.html'))}`);
  console.log('Install only after review: node dev/tools/webp-diet.mjs --install');
}

/**
 * Copies previously staged candidates into the shipped art tree.
 * @param {readonly string[]} classes
 * @returns {void}
 */
export function installCandidates(classes = DEFAULT_CLASSES) {
  const selected = normalizeClasses(classes);
  const sourceRoot = path.join(OUT, 'webp');
  const files = collectFiles(sourceRoot, selected);
  if (files.length === 0) {
    throw new Error('webp-diet: no staged candidates found; run without --install first');
  }
  for (const file of files) {
    const relative = path.relative(sourceRoot, file);
    const destination = path.join(ART, relative);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(file, destination);
    console.log(`installed art/${relative.split(path.sep).join('/')}`);
  }
}

/**
 * @param {readonly string[]} classes
 * @returns {string[]}
 */
function normalizeClasses(classes) {
  const unique = [...new Set(classes.map((value) => value.trim()).filter(Boolean))];
  for (const value of unique) {
    if (!(value in QUALITY_BY_CLASS)) {
      throw new Error(`webp-diet: unsupported art class '${value}'`);
    }
  }
  return unique;
}

/**
 * @param {string} root
 * @param {readonly string[]} classes
 * @returns {string[]}
 */
function collectFiles(root, classes) {
  const allowed = new Set(classes);
  if (!existsSync(root)) {
    return [];
  }
  const files = [];
  walk(root, root, allowed, files);
  return files.sort((a, b) => a.localeCompare(b));
}

/**
 * @param {string} directory
 * @param {string} root
 * @param {ReadonlySet<string>} classes
 * @param {string[]} files
 * @returns {void}
 */
function walk(directory, root, classes, files) {
  for (const dirent of readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, dirent.name);
    if (dirent.isDirectory()) {
      walk(full, root, classes, files);
    } else if (classes.has(path.relative(root, full).split(path.sep)[0] ?? '')) {
      files.push(full);
    }
  }
}

/**
 * @param {import('playwright-core').Page} page
 * @param {string} file
 * @param {number} quality
 * @returns {Promise<{ dataUrl: string, height: number, maxDelta: number, overPct: number, rmse: number, width: number }>}
 */
async function reencode(page, file, quality) {
  const b64 = readFileSync(file).toString('base64');
  return page.evaluate(
    async ({ b64, quality }) => {
      const bytes = await (await fetch(`data:image/webp;base64,${b64}`)).arrayBuffer();
      const original = await createImageBitmap(new Blob([bytes], { type: 'image/webp' }));
      const first = document.createElement('canvas');
      first.width = original.width;
      first.height = original.height;
      const firstContext = first.getContext('2d', { willReadFrequently: true });
      firstContext.drawImage(original, 0, 0);
      const candidateUrl = first.toDataURL('image/webp', quality);
      const candidateBytes = await (await fetch(candidateUrl)).arrayBuffer();
      const candidate = await createImageBitmap(new Blob([candidateBytes], { type: 'image/webp' }));
      const second = document.createElement('canvas');
      second.width = original.width;
      second.height = original.height;
      const secondContext = second.getContext('2d', { willReadFrequently: true });
      secondContext.drawImage(candidate, 0, 0);
      const a = firstContext.getImageData(0, 0, original.width, original.height).data;
      const b = secondContext.getImageData(0, 0, original.width, original.height).data;
      let squared = 0;
      let max = 0;
      let over = 0;
      for (let i = 0; i < a.length; i += 4) {
        const delta = Math.max(
          Math.abs(a[i] - b[i]),
          Math.abs(a[i + 1] - b[i + 1]),
          Math.abs(a[i + 2] - b[i + 2]),
          Math.abs(a[i + 3] - b[i + 3]),
        );
        squared +=
          (a[i] - b[i]) ** 2 +
          (a[i + 1] - b[i + 1]) ** 2 +
          (a[i + 2] - b[i + 2]) ** 2;
        max = Math.max(max, delta);
        if (delta > 16) over += 1;
      }
      const pixels = a.length / 4;
      return {
        dataUrl: candidateUrl,
        height: original.height,
        maxDelta: max,
        overPct: Math.round((100 * over * 1000) / pixels) / 1000,
        rmse: Math.round((Math.sqrt(squared / (3 * pixels)) * 100)) / 100,
        width: original.width,
      };
    },
    { b64, quality },
  );
}

/**
 * @param {readonly { readonly afterBytes: number, readonly beforeBytes: number, readonly height: number, readonly maxDelta: number, readonly overPct: number, readonly path: string, readonly quality: number, readonly rmse: number, readonly width: number }[]} rows
 * @returns {string}
 */
function reviewPage(rows) {
  const cards = rows
    .map(
      (row) => `<article><h2>${escapeHtml(row.path)}</h2><p>${row.beforeBytes} -> ${row.afterBytes} B · ${row.width}x${row.height} · q${row.quality} · RMSE ${row.rmse} · max Δ ${row.maxDelta} · over16 ${row.overPct}%</p><div class="pair"><figure><figcaption>shipped</figcaption><img src="../../../../public/art/${row.path}" /></figure><figure><figcaption>candidate</figcaption><img src="webp/${row.path}" /></figure></div></article>`,
    )
    .join('\n');
  return `<!doctype html><meta charset="utf-8"><title>WebP diet review</title><style>body{font:16px system-ui;background:#f6e3b8;color:#2e4a63;margin:24px}article{background:#fff;border:3px solid #2e4a63;border-radius:12px;margin:18px 0;padding:12px}.pair{display:flex;gap:18px;flex-wrap:wrap}figure{margin:0}img{display:block;max-width:360px;max-height:360px;background:#eee}figcaption{font-weight:700;padding:4px 0}</style><h1>WebP diet review</h1><p>Review every candidate before running <code>--install</code>. The shipped side is the left image; the staged candidate is the right image.</p>${cards}`;
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return entities[character] ?? character;
  });
}

/**
 * @param {string} value
 * @returns {string}
 */
function normalizePath(value) {
  return value.split(path.sep).join('/').replace(/^\/+/, '');
}

/**
 * @returns {Promise<import('playwright-core').Browser>}
 */
async function launchBrowser() {
  try {
    return await chromium.launch({ channel: 'msedge', headless: true });
  } catch {
    return await chromium.launch({
      headless: true,
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    });
  }
}

/**
 * @returns {void}
 */
function main() {
  const args = process.argv.slice(2);
  const classesArg = args.find((arg) => arg.startsWith('--classes='));
  const classes = classesArg ? classesArg.slice('--classes='.length).split(',') : DEFAULT_CLASSES;
  if (args.includes('--install')) {
    installCandidates(classes);
  } else {
    void stageCandidates(classes).catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
