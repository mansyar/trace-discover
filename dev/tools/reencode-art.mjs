// tools/reencode-art.mjs — Payload diet: re-encode shipped raster art to WebP.
// Source of truth = the shipped lossless files in public/art/** (PNG/JPG): using
// them guarantees identical dimensions and appearance by construction (dev/art-src
// is pre-opt and not dimension-equivalent, so it is not used).
// Encodes WebP via the browser canvas and stages candidates + review artifacts
// into dev/qa/out/reencode/ (git-ignored):
//   webp/<class>/<name>.webp   candidate files
//   manifest.json              per-asset bytes/dims/quality + diff stats
//   sheets/<class>.png         contact sheet of the class (candidate versions)
//   focus/worst.png            1:1 original | webp pairs, worst diffs first
// usage:
//   node dev/tools/reencode-art.mjs            # stage candidates + review artifacts
//   node dev/tools/reencode-art.mjs --install  # copy staged webp into public/art
import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const ART = join(ROOT, 'public', 'art');
const OUT = join(ROOT, 'dev', 'qa', 'out', 'reencode');

const CLASSES = {
  bg: { quality: 0.8, cols: 2 },
  face: { quality: 0.85, cols: 4 },
  goal: { quality: 0.85, cols: 6 },
  pack: { quality: 0.85, cols: 3 },
  sticker: { quality: 0.85, cols: 6 },
};
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg' };

if (process.argv.includes('--install')) {
  for (const cls of Object.keys(CLASSES)) {
    const dir = join(OUT, 'webp', cls);
    for (const f of readdirSync(dir)) {
      cpSync(join(dir, f), join(ART, cls, f));
      console.log(`installed art/${cls}/${f}`);
    }
  }
  process.exit(0);
}

// --- collect shipped assets -------------------------------------------------
const assets = [];
for (const cls of Object.keys(CLASSES)) {
  for (const f of readdirSync(join(ART, cls))) {
    const ext = f.slice(f.lastIndexOf('.')).toLowerCase();
    if (!MIME[ext]) throw new Error(`unexpected file: art/${cls}/${f}`);
    const bytes = readFileSync(join(ART, cls, f));
    assets.push({ cls, name: f, mime: MIME[ext], b64: bytes.toString('base64'), inBytes: bytes.length });
  }
}
mkdirSync(OUT, { recursive: true });

async function launch() {
  try {
    return await chromium.launch({ channel: 'msedge', headless: true });
  } catch {
    return await chromium.launch({
      headless: true,
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    });
  }
}
const browser = await launch();
const page = await browser.newPage();
await page.setContent('<!doctype html><html><body></body></html>');

// --- encode + per-asset diff ------------------------------------------------
const rows = [];
for (const a of assets) {
  const res = await page.evaluate(
    async ({ b64, mime, quality }) => {
      const bitmap = async (u) => createImageBitmap(await (await fetch(u)).blob());
      const orig = await bitmap(`data:${mime};base64,${b64}`);
      const c1 = document.createElement('canvas');
      c1.width = orig.width;
      c1.height = orig.height;
      const g1 = c1.getContext('2d', { willReadFrequently: true });
      g1.drawImage(orig, 0, 0);
      const dataUrl = c1.toDataURL('image/webp', quality);
      const cand = await bitmap(dataUrl);
      const c2 = document.createElement('canvas');
      c2.width = orig.width;
      c2.height = orig.height;
      const g2 = c2.getContext('2d', { willReadFrequently: true });
      g2.drawImage(cand, 0, 0);
      const A = g1.getImageData(0, 0, orig.width, orig.height).data;
      const B = g2.getImageData(0, 0, orig.width, orig.height).data;
      let sq = 0;
      let max = 0;
      let over = 0;
      for (let i = 0; i < A.length; i += 4) {
        const d = Math.max(
          Math.abs(A[i] - B[i]),
          Math.abs(A[i + 1] - B[i + 1]),
          Math.abs(A[i + 2] - B[i + 2]),
          Math.abs(A[i + 3] - B[i + 3]),
        );
        sq += (A[i] - B[i]) ** 2 + (A[i + 1] - B[i + 1]) ** 2 + (A[i + 2] - B[i + 2]) ** 2;
        if (d > max) max = d;
        if (d > 16) over++;
      }
      const n = A.length / 4;
      return {
        dataUrl,
        width: orig.width,
        height: orig.height,
        rmse: Math.round(Math.sqrt(sq / (3 * n)) * 100) / 100,
        max,
        overPct: Math.round(((100 * over) / n) * 1000) / 1000,
      };
    },
    { b64: a.b64, mime: a.mime, quality: CLASSES[a.cls].quality },
  );
  const outBytes = Buffer.from(res.dataUrl.split(',')[1], 'base64');
  const outName = a.name.slice(0, a.name.lastIndexOf('.')) + '.webp';
  mkdirSync(join(OUT, 'webp', a.cls), { recursive: true });
  writeFileSync(join(OUT, 'webp', a.cls, outName), outBytes);
  rows.push({
    cls: a.cls,
    name: a.name,
    outName,
    quality: CLASSES[a.cls].quality,
    width: res.width,
    height: res.height,
    inBytes: a.inBytes,
    outBytes: outBytes.length,
    rmse: res.rmse,
    maxDelta: res.max,
    overPct: res.overPct,
  });
  console.log(
    `${a.cls}/${a.name} ${res.width}x${res.height} ${(a.inBytes / 1024).toFixed(0)}KB -> ${(outBytes.length / 1024).toFixed(0)}KB rmse=${res.rmse} over=${res.overPct}%`,
  );
}

// --- manifest ---------------------------------------------------------------
const byClass = {};
for (const r of rows) {
  const c = (byClass[r.cls] ??= { count: 0, inBytes: 0, outBytes: 0, maxRmse: 0, maxOverPct: 0 });
  c.count++;
  c.inBytes += r.inBytes;
  c.outBytes += r.outBytes;
  c.maxRmse = Math.max(c.maxRmse, r.rmse);
  c.maxOverPct = Math.max(c.maxOverPct, r.overPct);
}
const totalIn = rows.reduce((s, r) => s + r.inBytes, 0);
const totalOut = rows.reduce((s, r) => s + r.outBytes, 0);
writeFileSync(
  join(OUT, 'manifest.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), classes: CLASSES, totals: { inBytes: totalIn, outBytes: totalOut }, byClass, assets: rows }, null, 2),
);

// --- review sheets ----------------------------------------------------------
const b64Of = (cls, f) => 'data:image/webp;base64,' + readFileSync(join(OUT, 'webp', cls, f)).toString('base64');

const makeGrid = (items, cols) =>
  page.evaluate(
    async ({ items, cols }) => {
      const load = (u) =>
        new Promise((ok, bad) => {
          const i = new Image();
          i.onload = () => ok(i);
          i.onerror = bad;
          i.src = u;
        });
      const cell = 256;
      const canvas = document.createElement('canvas');
      canvas.width = cell * cols;
      canvas.height = cell * Math.ceil(items.length / cols);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f6e3b8';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < items.length; i++) {
        const img = await load(items[i].b64);
        const x = (i % cols) * cell;
        const y = Math.floor(i / cols) * cell;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 4, y + 4, cell - 8, cell - 8);
        const s = (cell - 16) / Math.max(img.width, img.height);
        const w = img.width * s;
        const h = img.height * s;
        ctx.drawImage(img, x + (cell - w) / 2, y + (cell - h) / 2, w, h);
        ctx.fillStyle = 'rgba(0,0,0,.65)';
        ctx.font = '11px monospace';
        ctx.fillText(items[i].label, x + 8, y + cell - 10);
      }
      return canvas.toDataURL('image/png');
    },
    { items, cols },
  );

mkdirSync(join(OUT, 'sheets'), { recursive: true });
for (const cls of Object.keys(CLASSES)) {
  const items = rows
    .filter((r) => r.cls === cls)
    .map((r) => ({ b64: b64Of(cls, r.outName), label: `${r.outName} ${(r.outBytes / 1024).toFixed(0)}KB` }));
  const sheet = await makeGrid(items, CLASSES[cls].cols);
  writeFileSync(join(OUT, 'sheets', `${cls}.png`), Buffer.from(sheet.split(',')[1], 'base64'));
}

// worst-diff focus pairs, 1:1
const focus = [...rows].sort((a, b) => b.overPct - a.overPct || b.rmse - a.rmse).slice(0, 8);
const focusUrl = await page.evaluate(
  async (pairs) => {
    const load = (u) =>
      new Promise((ok, bad) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = bad;
        i.src = u;
      });
    const pad = 10;
    const labelH = 18;
    const loaded = [];
    for (const p of pairs) {
      loaded.push({ o: await load(p.orig), w: await load(p.webp), label: p.label });
    }
    const perRow = 2;
    const rowH = Math.max(...loaded.map((l) => Math.max(l.o.height, l.w.height))) + labelH + pad;
    const rowW = Math.max(...loaded.map((l) => l.o.width + l.w.width + 3 * pad));
    const canvas = document.createElement('canvas');
    canvas.width = rowW * perRow;
    canvas.height = rowH * Math.ceil(loaded.length / perRow);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f6e3b8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < loaded.length; i++) {
      const l = loaded[i];
      const x0 = (i % perRow) * rowW + pad;
      const y0 = Math.floor(i / perRow) * rowH + pad;
      ctx.drawImage(l.o, x0, y0);
      ctx.drawImage(l.w, x0 + l.o.width + pad, y0);
      ctx.fillStyle = '#000';
      ctx.font = '12px monospace';
      ctx.fillText(`${l.label}  [left=orig | right=webp]`, x0, y0 + Math.max(l.o.height, l.w.height) + 14);
    }
    return canvas.toDataURL('image/png');
  },
  focus.map((r) => ({
    orig: 'data:' + (r.name.endsWith('.jpg') ? 'image/jpeg' : 'image/png') + ';base64,' + readFileSync(join(ART, r.cls, r.name)).toString('base64'),
    webp: b64Of(r.cls, r.outName),
    label: `${r.name}  rmse=${r.rmse} over=${r.overPct}%  ${(r.inBytes / 1024).toFixed(0)}->${(r.outBytes / 1024).toFixed(0)}KB`,
  })),
);
mkdirSync(join(OUT, 'focus'), { recursive: true });
writeFileSync(join(OUT, 'focus', 'worst.png'), Buffer.from(focusUrl.split(',')[1], 'base64'));

await browser.close();

const pct = ((1 - totalOut / totalIn) * 100).toFixed(1);
console.log(`\ntotal: ${rows.length} files, ${(totalIn / 1048576).toFixed(2)} MB -> ${(totalOut / 1048576).toFixed(2)} MB (-${pct}%)`);
for (const [cls, c] of Object.entries(byClass)) {
  console.log(`  ${cls}: ${c.count} files ${(c.inBytes / 1024).toFixed(0)}KB -> ${(c.outBytes / 1024).toFixed(0)}KB  maxRmse=${c.maxRmse} maxOver=${c.maxOverPct}%`);
}
console.log(`artifacts -> dev/qa/out/reencode/{webp,manifest.json,sheets,focus}`);
