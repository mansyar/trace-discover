// tools/gridshot.mjs — render a crop of a PNG with a coordinate grid for visual measurement.
// usage: node tools/gridshot.mjs <in.png> <out.png> --rect=x0,y0,x1,y1 [--scale=2] [--step=25]
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const [png, out] = args.filter(a => !a.startsWith('--'));
const num = (n, d) => { const a = args.find(s => s.startsWith('--' + n + '=')); return a ? Number(a.split('=')[1]) : d; };
const rv = args.find(s => s.startsWith('--rect=')).split('=')[1].split(',').map(Number);
const rect = { x0: rv[0], y0: rv[1], x1: rv[2], y1: rv[3] };
const scale = num('scale', 2), step = num('step', 25);
const b64 = 'data:image/png;base64,' + readFileSync(resolve(png)).toString('base64');

async function launch() {
  try { return await chromium.launch({ channel: 'msedge', headless: true }); }
  catch { return await chromium.launch({ headless: true, executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' }); }
}
const browser = await launch();
const page = await browser.newPage();
await page.setContent('<!doctype html><html><body></body></html>');
const dataUrl = await page.evaluate(async ({ u, rect, scale, step }) => {
  const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = u; });
  const W = (rect.x1 - rect.x0) * scale, H = (rect.y1 - rect.y0) * scale;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.drawImage(img, rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0, 0, 0, W, H);
  g.lineWidth = 1;
  g.font = '11px monospace';
  const maxX = img.width, maxY = img.height;
  for (let gx = Math.ceil(rect.x0 / step) * step; gx <= Math.min(rect.x1, maxX); gx += step) {
    const X = Math.round((gx - rect.x0) * scale) + 0.5;
    const big = gx % 100 === 0;
    g.strokeStyle = big ? 'rgba(255,0,0,.75)' : 'rgba(255,0,0,.22)';
    g.beginPath(); g.moveTo(X, 0); g.lineTo(X, H); g.stroke();
    g.fillStyle = 'rgba(255,0,0,.85)'; g.fillText(String(gx), X + 2, 11);
  }
  for (let gy = Math.ceil(rect.y0 / step) * step; gy <= Math.min(rect.y1, maxY); gy += step) {
    const Y = Math.round((gy - rect.y0) * scale) + 0.5;
    const big = gy % 100 === 0;
    g.strokeStyle = big ? 'rgba(255,0,0,.75)' : 'rgba(255,0,0,.22)';
    g.beginPath(); g.moveTo(0, Y); g.lineTo(W, Y); g.stroke();
    g.fillStyle = 'rgba(255,0,0,.85)'; g.fillText(String(gy), 2, Y + 11);
  }
  return c.toDataURL('image/png');
}, { u: b64, rect, scale, step });
writeFileSync(resolve(out), Buffer.from(dataUrl.split(',')[1], 'base64'));
console.log('wrote', out, 'crop', JSON.stringify(rect), 'scale', scale);
await browser.close();
