// tools/trace-contour.mjs — outlines a reference cutout's silhouette into
// field-space control points for reference-traced packs (animals first).
// Pipeline: alpha mask (>=128) → marching-squares boundary loops → keep the
// longest loop → circular smoothing → Ramer–Douglas–Peucker simplify →
// optional anatomy cuts (normalized anchors) → fit into the field target box
// → integer control points per stroke.
// Usage: node tools/trace-contour.mjs <ref.png> --out <file.json>
//        [--box x0,y0,x1,y1] [--flip] [--tol 2.5] [--smooth 2] [--cut nx,ny]...
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith('--'));
const flag = (name, def) => {
  const i = args.indexOf('--' + name);
  return i > -1 ? args[i + 1] : def;
};
const cuts = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--cut') cuts.push(args[i + 1].split(',').map(Number));
}
const inp = pos[0];
const outp = flag('out');
if (!inp || !outp) {
  console.error(
    'usage: node tools/trace-contour.mjs <ref.png> --out <file.json> [--box x0,y0,x1,y1] [--flip] [--tol 2.5] [--smooth 2] [--cut nx,ny]...',
  );
  process.exit(1);
}
const box = flag('box', '64,250,366,680').split(',').map(Number);
const flip = args.includes('--flip');
const tol = Number(flag('tol', '2.5'));
const smooth = Number(flag('smooth', '2'));

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

const src = 'data:image/png;base64,' + fs.readFileSync(inp).toString('base64');
const browser = await launch();
const page = await browser.newPage();
const result = await page.evaluate(
  async ({ src, box, flip, tol, smooth, cuts }) => {
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = () => rej(new Error('img load failed'));
      img.src = src;
    });
    const W = img.width;
    const H = img.height;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, W, H).data;
    const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] >= 128;

    // Marching squares on the binary mask → undirected segments per cell.
    const edge = {
      top: (x, y) => `${x + 0.5},${y}`,
      right: (x, y) => `${x + 1},${y + 0.5}`,
      bottom: (x, y) => `${x + 0.5},${y + 1}`,
      left: (x, y) => `${x},${y + 0.5}`,
    };
    const TABLE = {
      0: [],
      1: [['left', 'bottom']],
      2: [['bottom', 'right']],
      3: [['left', 'right']],
      4: [['top', 'right']],
      5: [['left', 'top'], ['bottom', 'right']],
      6: [['top', 'bottom']],
      7: [['top', 'left']],
      8: [['left', 'top']],
      9: [['top', 'bottom']],
      10: [['left', 'bottom'], ['top', 'right']],
      11: [['top', 'right']],
      12: [['left', 'right']],
      13: [['bottom', 'right']],
      14: [['left', 'bottom']],
      15: [],
    };
    const pts = new Map(); // point key -> list of { other, seg }
    const addSeg = (a, b) => {
      const seg = { a, b };
      if (!pts.has(a)) pts.set(a, []);
      if (!pts.has(b)) pts.set(b, []);
      pts.get(a).push({ other: b, seg });
      pts.get(b).push({ other: a, seg });
    };
    for (let y = -1; y < H; y++) {
      for (let x = -1; x < W; x++) {
        const tl = inside(x, y) ? 8 : 0;
        const tr = inside(x + 1, y) ? 4 : 0;
        const br = inside(x + 1, y + 1) ? 2 : 0;
        const bl = inside(x, y + 1) ? 1 : 0;
        const cellSegs = TABLE[tl + tr + br + bl];
        for (const [e1, e2] of cellSegs) addSeg(edge[e1](x, y), edge[e2](x, y));
      }
    }
    // Chain segments into loops (each dual point should have degree 2).
    const used = new Set();
    const loops = [];
    const parse = (k) => k.split(',').map(Number);
    for (const [startKey] of pts) {
      for (const entry of pts.get(startKey)) {
        if (used.has(entry.seg)) continue;
        const loop = [parse(startKey)];
        let curKey = startKey;
        let next = entry;
        while (next && !used.has(next.seg)) {
          used.add(next.seg);
          curKey = next.other;
          loop.push(parse(curKey));
          const candidates = pts.get(curKey).filter((e) => !used.has(e.seg));
          next = candidates[0];
        }
        loops.push(loop);
      }
    }
    loops.sort((a, b) => b.length - a.length);
    const loop = loops[0];

    // Circular smoothing to soften pixel steps.
    let ring = loop.slice(0, -1); // drop duplicate closing point for wraparound
    for (let pass = 0; pass < smooth; pass++) {
      const n = ring.length;
      const out = [];
      for (let i = 0; i < n; i++) {
        const a = ring[(i - 1 + n) % n];
        const b = ring[i];
        const c2 = ring[(i + 1) % n];
        out.push([(a[0] + 2 * b[0] + c2[0]) / 4, (a[1] + 2 * b[1] + c2[1]) / 4]);
      }
      ring = out;
    }

    // Ramer–Douglas–Peucker, anchored on the closed ring: the ring is cut at
    // ring[0] and its farthest vertex so the segment endpoints never coincide
    // (a zero-length baseline would drop every point).
    const ring2 = [...ring, ring[0]];
    const keep = new Uint8Array(ring2.length);
    let far = 1;
    let farD = -1;
    for (let i = 1; i < ring.length; i++) {
      const dd = (ring[i][0] - ring[0][0]) ** 2 + (ring[i][1] - ring[0][1]) ** 2;
      if (dd > farD) {
        farD = dd;
        far = i;
      }
    }
    keep[0] = 1;
    keep[far] = 1;
    keep[ring2.length - 1] = 1;
    const simplify = (i0, i1) => {
      const stack = [[i0, i1]];
      while (stack.length) {
        const [a, b] = stack.pop();
        const [x0, y0] = ring2[a];
        const [x1, y1] = ring2[b];
        const dx = x1 - x0;
        const dy = y1 - y0;
        const len = Math.hypot(dx, dy) || 1;
        let best = -1;
        let bestI = -1;
        for (let i = a + 1; i < b; i++) {
          const [px, py] = ring2[i];
          const dist = Math.abs(dy * px - dx * py + x1 * y0 - y1 * x0) / len;
          if (dist > best) {
            best = dist;
            bestI = i;
          }
        }
        if (best > tol) {
          keep[bestI] = 1;
          stack.push([a, bestI], [bestI, b]);
        }
      }
    };
    simplify(0, far);
    simplify(far, ring2.length - 1);
    const simplified = ring2.filter((_, i) => keep[i]);
    simplified.pop(); // drop the appended closing duplicate

    // Anatomy cuts: split the closed ring at the nearest vertices.
    let strokes;
    if (cuts.length === 0) {
      strokes = [[...simplified, simplified[0]]]; // closed
    } else {
      const cutIndex = cuts.map(([nx, ny]) => {
        const cx = nx * W;
        const cy = ny * H;
        let best = 0;
        let bestD = Infinity;
        simplified.forEach(([px, py], i) => {
          const dd = (px - cx) ** 2 + (py - cy) ** 2;
          if (dd < bestD) {
            bestD = dd;
            best = i;
          }
        });
        return best;
      });
      cutIndex.sort((a, b) => a - b);
      strokes = [];
      for (let i = 0; i < cutIndex.length; i++) {
        const from = cutIndex[i];
        const to = cutIndex[(i + 1) % cutIndex.length];
        const seg = [];
        for (let j = from; ; j = (j + 1) % simplified.length) {
          seg.push(simplified[j]);
          if (j === to) break;
        }
        strokes.push(seg);
      }
    }

    // Fit all strokes into the field box, preserving aspect; optional mirror.
    let bx0 = Infinity;
    let by0 = Infinity;
    let bx1 = -Infinity;
    let by1 = -Infinity;
    for (const s of strokes) {
      for (const [x, y] of s) {
        const fx = flip ? W - x : x;
        if (fx < bx0) bx0 = fx;
        if (fx > bx1) bx1 = fx;
        if (y < by0) by0 = y;
        if (y > by1) by1 = y;
      }
    }
    const [fx0, fy0, fx1, fy1] = box;
    const scale = Math.min((fx1 - fx0) / (bx1 - bx0), (fy1 - fy0) / (by1 - by0));
    const offX = fx0 + ((fx1 - fx0) - (bx1 - bx0) * scale) / 2;
    const offY = fy0 + ((fy1 - fy0) - (by1 - by0) * scale) / 2;
    const place = ([x, y]) => {
      const fx = flip ? W - x : x;
      return [Math.round(offX + (fx - bx0) * scale), Math.round(offY + (y - by0) * scale)];
    };
    const fieldStrokes = strokes.map((s) => {
      const out = [];
      let prev = null;
      for (const point of s) {
        const p = place(point);
        if (!prev || p[0] !== prev[0] || p[1] !== prev[1]) out.push(p);
        prev = p;
      }
      return out;
    });

    return { W, H, loopPoints: loop.length, simplified: simplified.length, strokes: fieldStrokes };
  },
  { src, box, flip, tol, smooth, cuts },
);

const json = {
  source: inp,
  width: result.W,
  height: result.H,
  box,
  strokemap: {},
  strokes: result.strokes.map((s) => s.map(([x, y]) => ({ x, y }))),
};
fs.mkdirSync(outp.replace(/[^\\/]+$/, ''), { recursive: true });
fs.writeFileSync(outp, `${JSON.stringify(json, null, 2)}\n`);
console.log(
  `loop ${result.loopPoints}pts -> ${result.simplified}pts -> ${result.strokes.length} stroke(s): ${result.strokes
    .map((s) => s.length)
    .join(', ')} | wrote ${outp}`,
);
await browser.close();
