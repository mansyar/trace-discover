// Pack vignette compositor: builds the 10 goal arts and the 10 sticker seals from cutout
// parts (numerals + single objects) so object counts are exact. Deterministic layouts;
// per-instance rotation/hue variance keeps the set lively. Numerals may be composed from
// several parts (8 = two stacked 0 ovals; 9 = 0 oval loop + 1 bar stem) when a single
// generated glyph is not usable.
//
// Usage: node dev/tools/vignette.mjs  (writes dev/art-src/nums/vig-*.png)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = dirname(fileURLToPath(import.meta.url));
const NUMS = resolve(HERE, '..', 'art-src', 'nums');
const EDGE = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const exe = EDGE.find((p) => {
  try {
    return readFileSync(p, 'rb');
  } catch {
    return false;
  }
});
const b64 = (f) => readFileSync(resolve(NUMS, f)).toString('base64');

const parts = {
  n0: b64('clean-goal-0.png'), // single 0 oval with tiny sparkle
  n1: b64('clean-numeral-1.png'), // plain vertical bar
  n2: b64('clean-numeral-2.png'),
  n3: b64('clean-numeral-3.png'),
  n4: b64('clean-numeral-4.png'),
  n5: b64('clean-goal-5.png'), // numeral-only render (stars were missing)
  n6: b64('clean-numeral-6.png'),
  n7: b64('clean-numeral-7.png'),
  apple: b64('clean-obj-apple.png'),
  balloon: b64('clean-obj-balloon.png'),
  ball: b64('clean-obj-ball.png'),
  block: b64('clean-obj-block.png'),
  star: b64('clean-obj-star.png'),
  flower: b64('clean-obj-flower.png'),
  bubble: b64('clean-obj-bubble.png'),
  dot: b64('clean-obj-dot.png'),
  sparkle: b64('clean-obj-sparkle.png'),
  sun: b64('clean-obj-sun.png'),
};

const DEG = Math.PI / 180;
const item = (src, x, y, size, rot = 0, hue = 0) => ({ src, x, y, size, rot, hue });
const np = (src, x, y, h) => ({ src, x, y, h });

function ring(src, n, cx, cy, r, size, startDeg, sizes = null, hues = null) {
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const a = (startDeg + (360 / n) * i) * DEG;
    const s = size * (sizes ? sizes[i % sizes.length] : 1);
    const rot = (i % 2 === 0 ? 1 : -1) * (6 + (i % 3) * 5);
    out.push(item(src, cx + r * Math.cos(a), cy + r * Math.sin(a), s, rot, hues ? hues[i % hues.length] : 0));
  }
  return out;
}

function arcItems(src, n, cx, cy, r, a0, a1, size) {
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const a = (a0 + ((a1 - a0) * i) / (n - 1)) * DEG;
    out.push(item(src, cx + r * Math.cos(a), cy + r * Math.sin(a), size, (i % 2 === 0 ? 1 : -1) * 8, 0));
  }
  return out;
}

function row(src, xs, y, size, hues = null) {
  return xs.map((x, i) => item(src, x, y, size, (i % 2 === 0 ? 1 : -1) * 5, hues ? hues[i % hues.length] : 0));
}

// Goal arts: numerals centered (single glyph height 330 at 260,280) + objects around.
const goals = [
  { out: 'vig-goal-0.png', numeralParts: [np('n0', 260, 280, 330)], items: ring('sparkle', 8, 260, 280, 215, 62, -90) },
  { out: 'vig-goal-1.png', numeralParts: [np('n1', 260, 280, 330)], items: [item('sun', 402, 300, 138, 0)] },
  { out: 'vig-goal-2.png', numeralParts: [np('n2', 260, 280, 330)], items: [item('apple', 400, 232, 108, -8), item('apple', 428, 350, 100, 10)] },
  {
    out: 'vig-goal-3.png',
    numeralParts: [np('n3', 260, 280, 330)],
    items: [item('balloon', 348, 142, 116, -8), item('balloon', 428, 208, 100, 7, 140), item('balloon', 452, 300, 90, 12, 40)],
  },
  { out: 'vig-goal-4.png', numeralParts: [np('n4', 260, 280, 330)], items: row('block', [150, 218, 290, 358], 458, 96, [0, 45, 175, 290]) },
  { out: 'vig-goal-5.png', numeralParts: [np('n5', 260, 280, 330)], items: arcItems('star', 5, 260, 335, 245, -155, -25, 78) },
  {
    out: 'vig-goal-6.png',
    numeralParts: [np('n6', 260, 280, 330)],
    items: [...row('ball', [162, 260, 358], 442, 90, [0, 60, 120]), ...row('ball', [162, 260, 358], 504, 84, [180, 250, 310])],
  },
  { out: 'vig-goal-7.png', numeralParts: [np('n7', 260, 280, 330)], items: arcItems('flower', 7, 305, 300, 208, 112, 268, 70) },
  { out: 'vig-goal-8.png', numeralParts: [np('n0', 260, 268, 190), np('n0', 260, 378, 190)], items: ring('bubble', 8, 260, 300, 235, 62, -90, [1, 0.8, 1.15, 0.7, 0.95, 1.1, 0.75, 0.85]) },
  { out: 'vig-goal-9.png', numeralParts: [{ ...np('n6', 260, 280, 330), rot: 180 }], items: arcItems('dot', 9, 265, 300, 245, 32, 148, 32) },
];

// Sticker seals: white disc + navy ring; smaller numerals; objects on an inner ring.
function stickerItems(src, n, size, hues = null, startDeg = -90) {
  return ring(src, n, 260, 255, 150, size, startDeg, null, hues);
}

const stickers = [
  { out: 'vig-sticker-0.png', numeralParts: [np('n0', 260, 252, 205)], items: stickerItems('sparkle', 8, 40) },
  { out: 'vig-sticker-1.png', numeralParts: [np('n1', 260, 252, 205)], items: [ring('sun', 1, 260, 255, 150, 74, -50)[0]] },
  { out: 'vig-sticker-2.png', numeralParts: [np('n2', 260, 252, 205)], items: stickerItems('apple', 2, 66) },
  { out: 'vig-sticker-3.png', numeralParts: [np('n3', 260, 252, 205)], items: ring('balloon', 3, 260, 255, 152, 62, -90, null, [0, 140, 40]) },
  { out: 'vig-sticker-4.png', numeralParts: [np('n4', 260, 252, 205)], items: stickerItems('block', 4, 56, [0, 45, 175, 290]) },
  { out: 'vig-sticker-5.png', numeralParts: [np('n5', 260, 252, 205)], items: stickerItems('star', 5, 48) },
  { out: 'vig-sticker-6.png', numeralParts: [np('n6', 260, 252, 205)], items: stickerItems('ball', 6, 48, [0, 60, 120, 180, 250, 310]) },
  { out: 'vig-sticker-7.png', numeralParts: [np('n7', 260, 252, 205)], items: stickerItems('flower', 7, 44) },
  { out: 'vig-sticker-8.png', numeralParts: [np('n0', 260, 218, 128), np('n0', 260, 292, 128)], items: stickerItems('bubble', 8, 42) },
  { out: 'vig-sticker-9.png', numeralParts: [{ ...np('n6', 260, 252, 205), rot: 180 }], items: stickerItems('dot', 9, 26) },
];

const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage();
const results = await page.evaluate(
  async ({ parts, goals, stickers }) => {
    const loadImage = (b64) =>
      new Promise((ok, fail) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = fail;
        i.src = `data:image/png;base64,${b64}`;
      });

    const cache = new Map();
    const img = (key) => {
      if (!cache.has(key)) cache.set(key, loadImage(parts[key]));
      return cache.get(key);
    };
    await Promise.all(Object.values(parts).map(loadImage));

    async function compose(recipe, seal) {
      const canvas = document.createElement('canvas');
      canvas.width = 520;
      canvas.height = 520;
      const ctx = canvas.getContext('2d');
      if (seal) {
        ctx.beginPath();
        ctx.arc(260, 260, 210, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 16;
        ctx.strokeStyle = '#2e4a63';
        ctx.stroke();
      }
      for (const part of recipe.numeralParts) {
        const p = await img(part.src);
        const scale = part.h / p.height;
        ctx.save();
        ctx.translate(part.x, part.y);
        if (part.rot) ctx.rotate((part.rot * Math.PI) / 180);
        ctx.drawImage(p, (-p.width * scale) / 2, (-p.height * scale) / 2, p.width * scale, p.height * scale);
        ctx.restore();
      }
      for (const it of recipe.items) {
        const o = await img(it.src);
        const s = it.size / Math.max(o.width, o.height);
        ctx.save();
        ctx.translate(it.x, it.y);
        ctx.rotate(it.rot * (Math.PI / 180));
        if (it.hue) ctx.filter = `hue-rotate(${it.hue}deg)`;
        ctx.drawImage(o, (-o.width * s) / 2, (-o.height * s) / 2, o.width * s, o.height * s);
        ctx.restore();
      }
      return canvas.toDataURL('image/png');
    }

    const out = [];
    for (const g of goals) out.push({ out: g.out, data: await compose(g, false) });
    for (const s of stickers) out.push({ out: s.out, data: await compose(s, true) });
    return out;
  },
  { parts, goals, stickers },
);
for (const r of results) {
  writeFileSync(resolve(NUMS, r.out), Buffer.from(r.data.split(',')[1], 'base64'));
  console.log(`ok nums/${r.out}`);
}
await browser.close();
