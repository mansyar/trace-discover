// tools/cutout-all.mjs — like cutout.mjs but keeps every substantial component
// (for multi-object scenes and badges where detached pieces are part of the art).
// Drops only specks smaller than 0.5% of the largest component, then trims to the
// union box, pads to square and exports PNG.
// Usage: node tools/cutout-all.mjs <in.png> <out.png> [size=600]
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith('--'));
const [inp, outp] = pos;
if (!inp || !outp) {
  console.error('usage: node tools/cutout-all.mjs <in.png> <out.png> [size=600]');
  process.exit(1);
}
const OUT = parseInt(pos[2] || '600', 10);
const src = 'data:image/png;base64,' + fs.readFileSync(inp).toString('base64');

async function launch() {
  try {
    return await chromium.launch({ channel: 'msedge', headless: true });
  } catch {
    return await chromium.launch({
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      headless: true,
    });
  }
}

const browser = await launch();
const page = await browser.newPage();
const result = await page.evaluate(
  async ({ src, OUT }) => {
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = () => rej(new Error('img load failed'));
      img.src = src;
    });
    const W = img.width,
      H = img.height;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const id = ctx.getImageData(0, 0, W, H);
    const d = id.data;

    // reference background color = average of the 4 corners
    const px = (x, y) => {
      const j = (y * W + x) * 4;
      return [d[j], d[j + 1], d[j + 2]];
    };
    const corners = [px(1, 1), px(W - 2, 1), px(1, H - 2), px(W - 2, H - 2)];
    const cr = corners.reduce((s, p) => s + p[0], 0) / 4;
    const cg = corners.reduce((s, p) => s + p[1], 0) / 4;
    const cb = corners.reduce((s, p) => s + p[2], 0) / 4;
    const tol = 48,
      tol2 = tol * tol;
    const match = (p) => {
      const j = p * 4;
      const dr = d[j] - cr,
        dg = d[j + 1] - cg,
        db = d[j + 2] - cb;
      return dr * dr + dg * dg + db * db <= tol2;
    };

    // flood fill from every border pixel
    const seen = new Uint8Array(W * H);
    const stack = [];
    for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
    for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
    let cleared = 0;
    while (stack.length) {
      const p = stack.pop();
      if (seen[p] || !match(p)) continue;
      seen[p] = 1;
      d[p * 4 + 3] = 0;
      cleared++;
      const x = p % W,
        y = (p - x) / W;
      if (x > 0) stack.push(p - 1);
      if (x < W - 1) stack.push(p + 1);
      if (y > 0) stack.push(p - W);
      if (y < H - 1) stack.push(p + W);
    }

    // connected components of what is left; keep every substantial one
    const comp = new Int32Array(W * H).fill(-1);
    const comps = [];
    for (let i = 0; i < W * H; i++) {
      if (comp[i] !== -1 || d[i * 4 + 3] < 8) continue;
      const idx = comps.length;
      const q = [i];
      comp[i] = idx;
      let area = 0,
        x0 = W,
        y0 = H,
        x1 = 0,
        y1 = 0;
      while (q.length) {
        const p = q.pop();
        area++;
        const x = p % W,
          y = (p - x) / W;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        for (const n of [
          x > 0 ? p - 1 : -1,
          x < W - 1 ? p + 1 : -1,
          y > 0 ? p - W : -1,
          y < H - 1 ? p + W : -1,
        ]) {
          if (n >= 0 && comp[n] === -1 && d[n * 4 + 3] >= 8) {
            comp[n] = idx;
            q.push(n);
          }
        }
      }
      comps.push({ idx, area, x0, y0, x1, y1 });
    }
    comps.sort((a, b) => b.area - a.area);
    const largest = comps[0] ?? { area: 1 };
    const minArea = largest.area * 0.005;
    const kept = comps.filter((cc) => cc.area >= minArea);
    const keptIdx = new Set(kept.map((cc) => cc.idx));
    for (const cc of comps) {
      if (keptIdx.has(cc.idx)) continue;
      for (let p = 0; p < W * H; p++) if (comp[p] === cc.idx) d[p * 4 + 3] = 0;
    }
    ctx.putImageData(id, 0, 0);

    // remove ground shadow: seed at bottom-center of the largest bbox, flood its color
    let shadowCleared = 0;
    const bx = Math.floor((largest.x0 ?? 0 + (largest.x1 ?? 0)) / 2);
    let seed = -1;
    for (let y = (largest.y1 ?? H) - 1; y > (largest.y0 ?? 0); y--) {
      const p = y * W + bx;
      if (d[p * 4 + 3] >= 200) {
        seed = p;
        break;
      }
    }
    if (seed >= 0) {
      const j = seed * 4;
      const sr = d[j],
        sg = d[j + 1],
        sb = d[j + 2];
      const stol2 = 40 * 40;
      const seen2 = new Uint8Array(W * H);
      const q2 = [seed];
      const smatch = (p) => {
        const k = p * 4;
        const dr = d[k] - sr,
          dg = d[k + 1] - sg,
          db = d[k + 2] - sb;
        return dr * dr + dg * dg + db * db <= stol2;
      };
      while (q2.length) {
        const p = q2.pop();
        if (seen2[p] || !smatch(p)) continue;
        seen2[p] = 1;
        if (d[p * 4 + 3] >= 8) {
          d[p * 4 + 3] = 0;
          shadowCleared++;
        }
        const x = p % W,
          y = (p - x) / W;
        if (x > 0) q2.push(p - 1);
        if (x < W - 1) q2.push(p + 1);
        if (y > 0) q2.push(p - W);
        if (y < H - 1) q2.push(p + W);
      }
      ctx.putImageData(id, 0, 0);
    }

    // union bbox of remaining content (fallback: union of kept comps)
    let nx0 = W,
      ny0 = H,
      nx1 = -1,
      ny1 = -1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (d[(y * W + x) * 4 + 3] >= 8) {
          if (x < nx0) nx0 = x;
          if (x > nx1) nx1 = x;
          if (y < ny0) ny0 = y;
          if (y > ny1) ny1 = y;
        }
      }
    }
    let box;
    if (nx1 > nx0) box = { x0: nx0, y0: ny0, x1: nx1, y1: ny1 };
    else {
      box = {
        x0: Math.min(...kept.map((k) => k.x0)),
        y0: Math.min(...kept.map((k) => k.y0)),
        x1: Math.max(...kept.map((k) => k.x1)),
        y1: Math.max(...kept.map((k) => k.y1)),
      };
    }

    // trim to content bbox, pad 5% each side, scale to OUT square
    const bw = box.x1 - box.x0 + 1,
      bh = box.y1 - box.y0 + 1;
    const side = Math.max(bw, bh) * 1.1;
    const out = document.createElement('canvas');
    out.width = OUT;
    out.height = OUT;
    const octx = out.getContext('2d');
    octx.imageSmoothingQuality = 'high';
    const cx = (box.x0 + box.x1) / 2,
      cy = (box.y0 + box.y1) / 2;
    octx.drawImage(c, cx - side / 2, cy - side / 2, side, side, 0, 0, OUT, OUT);
    return {
      png: out.toDataURL('image/png'),
      W,
      H,
      cleared,
      shadowCleared,
      comps: comps.slice(0, 8),
      kept: kept.length,
      box,
    };
  },
  { src, OUT },
);

fs.writeFileSync(outp, Buffer.from(result.png.split(',')[1], 'base64'));
console.log('source:', result.W + 'x' + result.H, '| cleared px:', result.cleared);
console.log(
  'components:',
  result.comps.map((c) => `#${c.idx} area=${c.area} bbox=${c.x0},${c.y0}->${c.x1},${c.y1}`).join(' | '),
);
console.log(
  'kept:',
  result.kept,
  '| shadow px cleared:',
  result.shadowCleared,
  '| final box:',
  JSON.stringify(result.box),
  '| wrote',
  outp,
);
await browser.close();
