// tools/faces.mjs — one-shot: head-crop face icons for the skin switch button.
// Finds the eye whites in each character source, crops a square around them,
// composites onto the skin accent disc, and writes public/art/face/*.png.
// Also emits a 2x2 contact sheet for review. usage (cwd spike): node tools/faces.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const SOURCES = [
  { id: 'dino', file: 'gen/cut-dino-ref.png', accent: '#8ecae6', region: null, minArea: 40, maxSide: 340, box: null },
  {
    id: 'star',
    file: 'qa/pre-journey-star-level.png',
    accent: '#f3c969',
    region: { x0: 110, y0: 600, x1: 330, y1: 880 },
    minArea: 120,
    // Star face hand-placed: sprite spans x 82..348, top y 638 at level scale.
    box: { x0: 120, y0: 665, x1: 310, y1: 855 },
  },
  {
    id: 'construction',
    file: 'gen/cut-excavator-ref.png',
    accent: '#ffd166',
    region: null,
    minArea: 40,
    box: { x0: 30, y0: 0, x1: 450, y1: 440 },
  },
  { id: 'animal', file: 'gen/cut-lion-ref.png', accent: '#90be6d', region: null, minArea: 40, sideMul: 1.28, box: null },
];

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

const payload = SOURCES.map((s) => ({
  ...s,
  b64: 'data:image/png;base64,' + readFileSync(resolve(s.file)).toString('base64'),
}));

const browser = await launch();
const page = await browser.newPage();
await page.setContent('<!doctype html><html><body></body></html>');
const out = await page.evaluate(async (sources) => {
  async function load(u) {
    return await new Promise((ok, bad) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = bad;
      i.src = u;
    });
  }

  function clustersIn(img, region, minArea) {
    const W = img.width;
    const H = img.height;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, W, H).data;
    const x0 = region ? region.x0 : 0;
    const y0 = region ? region.y0 : 0;
    const x1 = region ? region.x1 : W;
    const y1 = region ? region.y1 : H;
    const white = new Uint8Array(W * H);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const p = y * W + x;
        const i = p * 4;
        const r = d[i];
        const gg = d[i + 1];
        const bb = d[i + 2];
        const aa = d[i + 3];
        const mx = Math.max(r, gg, bb);
        const mn = Math.min(r, gg, bb);
        if (aa > 200 && r > 218 && gg > 226 && bb > 232 && mx - mn < 30) {
          white[p] = 1;
        }
      }
    }
    const seen = new Uint8Array(W * H);
    const found = [];
    const qx = new Int32Array(W * H);
    const qy = new Int32Array(W * H);
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        const p0 = yy * W + xx;
        if (!white[p0] || seen[p0]) continue;
        let head = 0;
        let tail = 0;
        qx[tail] = xx;
        qy[tail] = yy;
        tail++;
        seen[p0] = 1;
        let n = 0;
        let bx0 = xx;
        let by0 = yy;
        let bx1 = xx;
        let by1 = yy;
        while (head < tail) {
          const x = qx[head];
          const y = qy[head];
          head++;
          n++;
          if (x < bx0) bx0 = x;
          if (x > bx1) bx1 = x;
          if (y < by0) by0 = y;
          if (y > by1) by1 = y;
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ]) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < x0 || ny < y0 || nx >= x1 || ny >= y1) continue;
            const np = ny * W + nx;
            if (white[np] && !seen[np]) {
              seen[np] = 1;
              qx[tail] = nx;
              qy[tail] = ny;
              tail++;
            }
          }
        }
        if (n >= minArea && n <= 6000) {
          found.push({ n, x0: bx0, y0: by0, x1: bx1, y1: by1 });
        }
      }
    }
    found.sort((a, b) => b.n - a.n);
    return found.slice(0, 8);
  }

  // Two eye whites sit side by side: similar y centers, similar sizes, a
  // sensible horizontal gap. Score every candidate pair and keep the best.
  function pickEyes(list, W, H) {
    let best = null;
    let bestScore = Infinity;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (!a || !b) continue;
        const ya = (a.y0 + a.y1) / 2;
        const yb = (b.y0 + b.y1) / 2;
        const xa = (a.x0 + a.x1) / 2;
        const xb = (b.x0 + b.x1) / 2;
        const dy = Math.abs(ya - yb);
        const dx = Math.abs(xa - xb);
        const ratio = Math.max(a.n, b.n) / Math.max(1, Math.min(a.n, b.n));
        if (dy > H * 0.12 || dx < W * 0.06 || dx > W * 0.35 || ratio > 3) continue;
        const score = dy * 4 + Math.abs(Math.log(ratio)) * 120 + Math.abs(a.n - b.n) * 0.05;
        if (score < bestScore) {
          bestScore = score;
          best = { a, b };
        }
      }
    }
    return best;
  }

  const results = [];
  const sheet = document.createElement('canvas');
  sheet.width = 512;
  sheet.height = 512;
  const sg = sheet.getContext('2d');
  sg.fillStyle = '#f6e3b8';
  sg.fillRect(0, 0, 512, 512);

  let index = 0;
  for (const s of sources) {
    const img = await load(s.b64);
    const W = img.width;
    const H = img.height;
    const list = clustersIn(img, s.region, s.minArea);
    const diag = list.map((c) => ({ n: c.n, c: [Math.round((c.x0 + c.x1) / 2), Math.round((c.y0 + c.y1) / 2)] }));

    let cx;
    let cy;
    let side;
    const eyes = pickEyes(list, W, H);
    if (eyes) {
      const { a, b } = eyes;
      cx = (Math.min(a.x0, b.x0) + Math.max(a.x1, b.x1)) / 2;
      cy = (Math.min(a.y0, b.y0) + Math.max(a.y1, b.y1)) / 2;
      const eyeSpan = Math.max(a.x1, b.x1) - Math.min(a.x0, b.x0);
      side = Math.max(eyeSpan * 2.4, 180);
    } else {
      cx = W / 2;
      cy = H * 0.4;
      side = Math.min(W, H) * 0.45;
    }
    if (s.box) {
      cx = (s.box.x0 + s.box.x1) / 2;
      cy = (s.box.y0 + s.box.y1) / 2;
      side = Math.max(s.box.x1 - s.box.x0, s.box.y1 - s.box.y0);
    }
    if (s.sideMul) side = side * s.sideMul;
    side = Math.min(side, W, H);
    if (s.maxSide) side = Math.min(side, s.maxSide);
    const sx = Math.min(Math.max(cx - side / 2, 0), W - side);
    const sy = Math.min(Math.max(cy - side / 2, 0), H - side);

    const face = document.createElement('canvas');
    face.width = 256;
    face.height = 256;
    const fg = face.getContext('2d');
    fg.fillStyle = s.accent;
    fg.fillRect(0, 0, 256, 256);
    fg.drawImage(img, sx, sy, side, side, 0, 0, 256, 256);

    const col = index % 2;
    const row = Math.floor(index / 2);
    sg.drawImage(face, col * 256, row * 256);
    index++;

    results.push({
      id: s.id,
      clusters: diag,
      paired: Boolean(eyes),
      crop: { side: Math.round(side), sx: Math.round(sx), sy: Math.round(sy) },
      png: face.toDataURL('image/png').split(',')[1],
    });
  }
  return { results, sheet: sheet.toDataURL('image/png').split(',')[1] };
}, payload);

mkdirSync(resolve('..', 'public', 'art', 'face'), { recursive: true });
for (const r of out.results) {
  writeFileSync(resolve('..', 'public', 'art', 'face', r.id + '.png'), Buffer.from(r.png, 'base64'));
  console.log(
    `${r.id}: paired=${r.paired} crop=${JSON.stringify(r.crop)} clusters=${JSON.stringify(r.clusters)} -> public/art/face/${r.id}.png`,
  );
}
writeFileSync(resolve('gen', 'faces-sheet.png'), Buffer.from(out.sheet, 'base64'));
console.log('sheet -> gen/faces-sheet.png');
await browser.close();
