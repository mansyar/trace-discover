// tools/animals-compose.mjs — animals-pack finals: turns the Phase 2 raws +
// Phase 1 reference cutouts into the shipped art. Goal scenes are cut out
// (clean/goal-*.png) and shipped at 256 transparent like the letters goals;
// stickers reuse the Phase 1 chibi cutouts in the house seal (white disc +
// navy ring, composed at 520 and downscaled to 160); the card is a row of
// three animal cutouts (fish, duck, butterfly) on transparent, mirroring the
// shapes card; the badge ships at 400. Reads art-src/animals (+raw), writes
// art-src/animals/out + public/art/{goal,sticker,pack}. Resumable per step.
// usage: node dev/tools/animals-compose.mjs
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ANIMALS = path.resolve(HERE, '..', 'art-src', 'animals');
const RAW = path.join(ANIMALS, 'raw');
const CLEAN = path.join(ANIMALS, 'clean');
const OUT = path.join(ANIMALS, 'out');
fs.mkdirSync(CLEAN, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const ANIMAL_NAMES = ['fish', 'ladybug', 'duck', 'turtle', 'bunny', 'cat', 'butterfly', 'elephant'];

// 1. cut out the goal scenes + badge raw (resumable)
for (const name of [...ANIMAL_NAMES.map((a) => `goal-${a}`), 'badge']) {
  const src = path.join(RAW, `${name}.png`);
  const dst = path.join(CLEAN, `${name}.png`);
  if (!fs.existsSync(src)) {
    throw new Error(`missing raw ${src}`);
  }
  if (fs.existsSync(dst)) {
    console.log(`skip cutout ${name} (exists)`);
    continue;
  }
  const result = spawnSync('node', [path.join(HERE, 'cutout.mjs'), src, dst], { stdio: 'inherit' });
  if (result.status !== 0 || !fs.existsSync(dst)) {
    throw new Error(`cutout failed for ${name}`);
  }
}

const jobs = [];
for (let i = 0; i < ANIMAL_NAMES.length; i++) {
  const level = `animal-${i + 1}`;
  jobs.push({ out: `goal-${level}.png`, kind: 'goal', src: [path.join(CLEAN, `goal-${ANIMAL_NAMES[i]}.png`)] });
  jobs.push({ out: `sticker-${level}.png`, kind: 'sticker', src: [path.join(ANIMALS, `${ANIMAL_NAMES[i]}.png`)] });
}
jobs.push({ out: 'animals-badge.png', kind: 'badge', src: [path.join(CLEAN, 'badge.png')] });
jobs.push({
  out: 'card-animals.png',
  kind: 'card',
  src: [
    path.join(ANIMALS, 'fish.png'),
    path.join(ANIMALS, 'duck.png'),
    path.join(ANIMALS, 'butterfly.png'),
  ],
});

const b64 = (file) => 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');

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

async function compose(kind, srcs) {
  const imgs = srcs.map(b64);
  const data = await page.evaluate(
    async ({ kind, imgs }) => {
      const load = (u) =>
        new Promise((ok, bad) => {
          const i = new Image();
          i.onload = () => ok(i);
          i.onerror = () => bad(new Error('img fail'));
          i.src = u;
        });
      const images = await Promise.all(imgs.map(load));
      const scaled = (size) => {
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const g = c.getContext('2d');
        g.imageSmoothingQuality = 'high';
        return { c, g };
      };
      if (kind === 'goal' || kind === 'badge') {
        const size = kind === 'goal' ? 256 : 400;
        const { c, g } = scaled(size);
        g.drawImage(images[0], 0, 0, size, size);
        return {
          png: c.toDataURL('image/png'),
          webp: c.toDataURL('image/webp', 0.85),
        };
      }
      if (kind === 'sticker') {
        const big = 520;
        const c = document.createElement('canvas');
        c.width = big;
        c.height = big;
        const g = c.getContext('2d');
        g.beginPath();
        g.arc(260, 260, 210, 0, Math.PI * 2);
        g.fillStyle = '#ffffff';
        g.fill();
        g.lineWidth = 16;
        g.strokeStyle = '#2e4a63';
        g.stroke();
        const o = images[0];
        const s = 300 / Math.max(o.width, o.height);
        g.imageSmoothingQuality = 'high';
        g.drawImage(o, 260 - (o.width * s) / 2, 252 - (o.height * s) / 2, o.width * s, o.height * s);
        const { c: small, g: sg } = scaled(160);
        sg.drawImage(c, 0, 0, 160, 160);
        return {
          png: small.toDataURL('image/png'),
          webp: small.toDataURL('image/webp', 0.85),
        };
      }
      if (kind === 'card') {
        const height = 260;
        const gap = 34;
        const pad = 26;
        const widths = images.map((img) => (img.width / img.height) * height);
        const width = Math.round(widths.reduce((sum, w) => sum + w, 0) + gap * 2 + pad * 2);
        const c = document.createElement('canvas');
        c.width = width;
        c.height = height + pad * 2;
        const g = c.getContext('2d');
        g.imageSmoothingQuality = 'high';
        let x = pad;
        for (let i = 0; i < images.length; i++) {
          g.drawImage(images[i], x, pad, widths[i], height);
          x += widths[i] + gap;
        }
        return {
          png: c.toDataURL('image/png'),
          webp: c.toDataURL('image/webp', 0.85),
        };
      }
      throw new Error(`unknown kind ${kind}`);
    },
    { kind, imgs },
  );
  return data;
}

const SHIPPED = path.resolve(HERE, '..', '..', 'public', 'art');
for (const d of ['goal', 'sticker', 'pack']) fs.mkdirSync(path.join(SHIPPED, d), { recursive: true });
const shippedPath = (out) => {
  const cls = out.startsWith('goal-') ? 'goal' : out.startsWith('sticker-') ? 'sticker' : 'pack';
  const name =
    cls === 'pack' ? out.replace(/\.png$/, '') : out.replace(/^(goal|sticker)-/, '').replace(/\.png$/, '');
  return { cls, path: path.join(SHIPPED, cls, `${name}.webp`) };
};
for (const job of jobs) {
  const data = await compose(job.kind, job.src);
  fs.writeFileSync(path.join(OUT, job.out), Buffer.from(data.png.split(',')[1], 'base64'));
  const shipped = shippedPath(job.out);
  fs.writeFileSync(shipped.path, Buffer.from(data.webp.split(',')[1], 'base64'));
  console.log(`ok art-src/animals/out/${job.out} + public/art/${shipped.cls}/${path.basename(shipped.path)}`);
}
await browser.close();
