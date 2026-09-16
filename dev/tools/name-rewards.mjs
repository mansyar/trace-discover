// tools/name-rewards.mjs — My Name minipack finals: turns the clean cutouts
// into the shipped shapes: sticker seal (white disc + navy ring + star,
// composed at 520 and downscaled to 160) and pack badge (400), matching the
// letters-track conventions. Reads art-src/name/clean, writes WebP (payload-diet
// policy, quality 0.85) into public/art.
// usage (any cwd): node dev/tools/name-rewards.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NAME = path.resolve(HERE, '..', 'art-src', 'name');
const CLEAN = path.join(NAME, 'clean');

const b64 = (name) => 'data:image/png;base64,' + fs.readFileSync(path.join(CLEAN, name)).toString('base64');

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
  return page.evaluate(
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
      if (kind === 'badge') {
        const size = 400;
        const { c, g } = scaled(size);
        g.drawImage(images[0], 0, 0, size, size);
        return c.toDataURL('image/webp', 0.85);
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
        return small.toDataURL('image/webp', 0.85);
      }
      throw new Error(`unknown kind ${kind}`);
    },
    { kind, imgs },
  );
}

const jobs = [
  { out: path.resolve(HERE, '..', '..', 'public/art/sticker/name-1.webp'), kind: 'sticker', src: ['star.png'] },
  { out: path.resolve(HERE, '..', '..', 'public/art/pack/name-badge.webp'), kind: 'badge', src: ['badge.png'] },
];

for (const job of jobs) {
  const data = await compose(job.kind, job.src);
  fs.writeFileSync(job.out, Buffer.from(data.split(',')[1], 'base64'));
  console.log(`ok ${path.relative(path.resolve(HERE, '..', '..'), job.out)}`);
}
await browser.close();
