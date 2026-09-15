// tools/findeyes.mjs — locate the eye whites in a cut-out character PNG and compute
// the patch rect + Rive node coordinates for a blink overlay.
// usage: node tools/findeyes.mjs <png> [--margin=28] [--feather=12] [--cropmargin=24] [--anchorx=237] [--anchory=256] [--scale=0.71]
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const png = args.find(a => !a.startsWith('--'));
const num = (n, d) => { const a = args.find(s => s.startsWith('--' + n + '=')); return a ? Number(a.split('=')[1]) : d; };
const margin = num('margin', 28), cropmargin = num('cropmargin', 24);
const anchorx = num('anchorx', 237), anchory = num('anchory', 256), scale = num('scale', 0.71);
const b64 = 'data:image/png;base64,' + readFileSync(resolve(png)).toString('base64');

async function launch() {
  try { return await chromium.launch({ channel: 'msedge', headless: true }); }
  catch { return await chromium.launch({ headless: true, executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' }); }
}
const browser = await launch();
const page = await browser.newPage();
await page.setContent('<!doctype html><html><body></body></html>');
const out = await page.evaluate(async ({ u }) => {
  const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = u; });
  const W = img.width, H = img.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, W, H).data;
  const white = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) {
    const i = p * 4;
    const r = d[i], gg = d[i + 1], bb = d[i + 2], aa = d[i + 3];
    const mx = Math.max(r, gg, bb), mn = Math.min(r, gg, bb);
    if (aa > 200 && r > 218 && gg > 226 && bb > 232 && (mx - mn) < 30) white[p] = 1;
  }
  const seen = new Uint8Array(W * H);
  const clusters = [];
  const qx = new Int32Array(W * H), qy = new Int32Array(W * H);
  for (let y0 = 0; y0 < H; y0++) for (let x0 = 0; x0 < W; x0++) {
    const p0 = y0 * W + x0;
    if (!white[p0] || seen[p0]) continue;
    let head = 0, tail = 0; qx[tail] = x0; qy[tail] = y0; tail++; seen[p0] = 1;
    let n = 0, bx0 = x0, by0 = y0, bx1 = x0, by1 = y0;
    while (head < tail) {
      const x = qx[head], y = qy[head]; head++; n++;
      if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const np = ny * W + nx;
        if (white[np] && !seen[np]) { seen[np] = 1; qx[tail] = nx; qy[tail] = ny; tail++; }
      }
    }
    clusters.push({ n, x0: bx0, y0: by0, x1: bx1, y1: by1 });
  }
  clusters.sort((a, b) => b.n - a.n);
  return { W, H, clusters: clusters.slice(0, 6) };
}, { u: b64 });

console.log('image:', out.W + 'x' + out.H);
for (const c of out.clusters) console.log('cluster:', JSON.stringify(c));
const eyes = out.clusters.slice(0, 2);
if (eyes.length === 2) {
  const x0 = Math.min(...eyes.map(e => e.x0)), y0 = Math.min(...eyes.map(e => e.y0));
  const x1 = Math.max(...eyes.map(e => e.x1)), y1 = Math.max(...eyes.map(e => e.y1));
  const rect = { x0: x0 - margin, y0: y0 - margin, x1: x1 + margin, y1: y1 + margin };
  const cx = (rect.x0 + rect.x1) / 2, cy = (rect.y0 + rect.y1) / 2;
  const nx = -13 + (cx - 300) * scale, ny = -4 + (cy - 300) * scale;
  console.log('eyes bbox:', JSON.stringify({ x0, y0, x1, y1 }));
  console.log('RECT=' + [rect.x0, rect.y0, rect.x1, rect.y1].join(','));
  console.log('crop center:', cx, cy, '| node local (round1): x=' + nx.toFixed(1) + ' y=' + ny.toFixed(1));
} else {
  console.log('expected 2 eye clusters, got', eyes.length, '— adjust thresholds manually');
}
await browser.close();
