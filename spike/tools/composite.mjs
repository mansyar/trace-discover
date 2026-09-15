// tools/composite.mjs — build a small, feathered "eye patch" by blending a region of
// an overlay drawing onto the base drawing, plus a cropped export for pixel-perfect
// overlay swaps in Rive (body stays identical; only the patch region can change).
// usage: node tools/composite.mjs <base.png> <overlay.png> <outFull.png> <outCrop.png> --rect=x0,y0,x1,y1 --feather=N --margin=N
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const [basePath, overPath, outFull, outCrop] = args.filter(a => !a.startsWith('--'));
const num = (n, d) => { const a = args.find(s => s.startsWith('--' + n + '=')); return a ? Number(a.split('=')[1]) : d; };
const rv = args.find(s => s.startsWith('--rect=')).split('=')[1].split(',').map(Number);
const rect = { x0: rv[0], y0: rv[1], x1: rv[2], y1: rv[3] };
const feather = num('feather', 12), margin = num('margin', 24);
const b64 = p => 'data:image/png;base64,' + readFileSync(resolve(p)).toString('base64');

async function launch() {
  try { return await chromium.launch({ channel: 'msedge', headless: true }); }
  catch { return await chromium.launch({ headless: true, executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' }); }
}

const browser = await launch();
const page = await browser.newPage();
await page.setContent('<!doctype html><html><body></body></html>');
const out = await page.evaluate(async ({ baseU, overU, rect, feather, margin }) => {
  const load = u => new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error('img load fail')); i.src = u; });
  const [b, o] = await Promise.all([load(baseU), load(overU)]);
  const W = b.width, H = b.height;
  if (o.width !== W || o.height !== H) throw new Error('size mismatch');
  const px = img => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(img, 0, 0); return g.getImageData(0, 0, W, H).data; };
  const bp = px(b), op = px(o);
  const diff = (a, d) => {
    let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let i = 0; i < a.length; i += 4) {
      const dd = Math.abs(a[i] - d[i]) + Math.abs(a[i + 1] - d[i + 1]) + Math.abs(a[i + 2] - d[i + 2]) + Math.abs(a[i + 3] - d[i + 3]);
      if (dd > 24) { n++; const p = i >> 2, x = p % W, y = (p / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    return { n, x0, y0, x1, y1 };
  };
  const raw = diff(bp, op);
  const cc = document.createElement('canvas'); cc.width = W; cc.height = H;
  const g = cc.getContext('2d');
  g.drawImage(b, 0, 0);
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
  const t = tmp.getContext('2d');
  t.drawImage(o, 0, 0);
  t.globalCompositeOperation = 'destination-in';
  t.filter = `blur(${feather}px)`;
  t.fillStyle = '#fff';
  t.fillRect(rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0);
  g.drawImage(tmp, 0, 0);
  const fixed = diff(bp, g.getImageData(0, 0, W, H).data);
  const cx0 = Math.max(0, rect.x0 - margin), cy0 = Math.max(0, rect.y0 - margin);
  const cx1 = Math.min(W, rect.x1 + margin), cy1 = Math.min(H, rect.y1 + margin);
  const cr = document.createElement('canvas'); cr.width = cx1 - cx0; cr.height = cy1 - cy0;
  cr.getContext('2d').drawImage(cc, cx0, cy0, cr.width, cr.height, 0, 0, cr.width, cr.height);
  return {
    full: cc.toDataURL('image/png'),
    crop: cr.toDataURL('image/png'),
    stats: { raw, fixed, crop: { cx0, cy0, cx1, cy1, w: cr.width, h: cr.height } },
  };
}, { baseU: b64(basePath), overU: b64(overPath), rect, feather, margin });
const save = (u, p) => writeFileSync(resolve(p), Buffer.from(u.split(',')[1], 'base64'));
save(out.full, outFull);
save(out.crop, outCrop);
console.log('raw diff (base vs overlay):    ', JSON.stringify(out.stats.raw));
console.log('fixed diff (base vs composite):', JSON.stringify(out.stats.fixed));
console.log('crop region:', JSON.stringify(out.stats.crop));
await browser.close();
