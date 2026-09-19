// tools/animals-placeholders.mjs — temporary art at the animals pack's final
// URLs (goal vignettes, stickers, menu card, badge) so the art-reference
// invariant stays honest between registration (Phase 1) and the real art
// batch (Phase 2), which overwrites every file this writes.
// usage (any cwd): node dev/tools/animals-placeholders.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ART = path.resolve(HERE, '..', '..', 'public', 'art');

const HUES = ['#8ecae6', '#f4a261', '#f9d97b', '#90be6d', '#e5d3ef', '#e0c9b5', '#c9b6f2', '#b8c4d9'];

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
const data = await page.evaluate((hues) => {
  const canvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return [c, c.getContext('2d')];
  };
  const disc = (g, x, y, r, fill) => {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = fill;
    g.fill();
  };
  const out = {};
  hues.forEach((hue, i) => {
    const n = i + 1;
    // goal vignette: soft disc on transparent, packing-agnostic placeholder
    {
      const [c, g] = canvas(256, 256);
      disc(g, 128, 128, 104, `${hue}66`);
      disc(g, 128, 128, 74, hue);
      out[`goal/animal-${n}.webp`] = c.toDataURL('image/webp', 0.8);
    }
    // sticker: white disc + navy ring + hue center (house sticker shape)
    {
      const [c, g] = canvas(160, 160);
      disc(g, 80, 80, 72, '#ffffff');
      g.beginPath();
      g.arc(80, 80, 68, 0, Math.PI * 2);
      g.lineWidth = 6;
      g.strokeStyle = '#2e4a63';
      g.stroke();
      disc(g, 80, 80, 42, hue);
      out[`sticker/animal-${n}.webp`] = c.toDataURL('image/webp', 0.8);
    }
  });
  // menu card: three hue discs in a pastel band
  {
    const [c, g] = canvas(520, 260);
    g.fillStyle = '#fdf3e3';
    g.fillRect(0, 0, 520, 260);
    disc(g, 130, 130, 74, '#f4a6a0');
    disc(g, 260, 130, 74, '#f9d97b');
    disc(g, 390, 130, 74, '#8ecae6');
    out['pack/card-animals.webp'] = c.toDataURL('image/webp', 0.8);
  }
  // badge: paw-less placeholder medallion (hue disc + navy ring)
  {
    const [c, g] = canvas(400, 400);
    disc(g, 200, 200, 184, '#f4a6a0');
    g.beginPath();
    g.arc(200, 200, 176, 0, Math.PI * 2);
    g.lineWidth = 18;
    g.strokeStyle = '#2e4a63';
    g.stroke();
    disc(g, 200, 200, 96, '#fdf3e3');
    out['pack/animals-badge.webp'] = c.toDataURL('image/webp', 0.8);
  }
  return out;
}, HUES);

let failed = 0;
for (const [rel, url] of Object.entries(data)) {
  const file = path.join(ART, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
  console.log(`placeholder public/art/${rel} ${fs.statSync(file).size}B`);
}
if (failed) process.exit(1);
await browser.close();
