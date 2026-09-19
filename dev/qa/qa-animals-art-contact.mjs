// Throwaway: contact sheet of the composed animals finals (goals, stickers,
// card, badge) from dev/art-src/animals/out for the owner approval gate.
// usage: node dev/qa/qa-animals-art-contact.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ANIMALS = path.resolve(HERE, '..', 'art-src', 'animals', 'out');
const OUT = path.join(HERE, 'out');
fs.mkdirSync(OUT, { recursive: true });

const NAMES = ['fish', 'ladybug', 'duck', 'turtle', 'bunny', 'cat', 'butterfly', 'elephant'];
const items = [];
for (let i = 0; i < NAMES.length; i++) {
  items.push({ label: `goal ${i + 1} ${NAMES[i]}`, file: path.join(ANIMALS, `goal-animal-${i + 1}.png`) });
}
for (let i = 0; i < NAMES.length; i++) {
  items.push({ label: `sticker ${i + 1}`, file: path.join(ANIMALS, `sticker-animal-${i + 1}.png`) });
}
items.push({ label: 'badge', file: path.join(ANIMALS, 'animals-badge.png') });
items.push({ label: 'card', file: path.join(ANIMALS, 'card-animals.png') });

const urls = items.map(
  (item) => 'data:image/png;base64,' + fs.readFileSync(item.file).toString('base64'),
);

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
try {
  const page = await browser.newPage({ viewport: { width: 1680, height: 1200 } });
  const png = await page.evaluate(
    async ({ labels, imgs }) => {
      const load = (u) =>
        new Promise((ok, bad) => {
          const i = new Image();
          i.onload = () => ok(i);
          i.onerror = () => bad(new Error('img fail'));
          i.src = u;
        });
      const images = await Promise.all(imgs.map(load));
      const cols = 5;
      const cellW = 320;
      const cellH = 340;
      const rows = Math.ceil(images.length / cols);
      const c = document.createElement('canvas');
      c.width = cols * cellW;
      c.height = rows * cellH;
      const g = c.getContext('2d');
      g.fillStyle = '#faf7ef';
      g.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < images.length; i++) {
        const x = (i % cols) * cellW;
        const y = Math.floor(i / cols) * cellH;
        g.strokeStyle = '#d8d2c4';
        g.strokeRect(x + 8, y + 8, cellW - 16, cellH - 46);
        const img = images[i];
        const box = 260;
        const s = Math.min(box / img.width, box / img.height);
        g.imageSmoothingQuality = 'high';
        g.drawImage(
          img,
          x + cellW / 2 - (img.width * s) / 2,
          y + 14 + (box - img.height * s) / 2,
          img.width * s,
          img.height * s,
        );
        g.fillStyle = '#2e4a63';
        g.font = '18px sans-serif';
        g.textAlign = 'center';
        g.fillText(labels[i], x + cellW / 2, y + cellH - 16);
      }
      return c.toDataURL('image/png');
    },
    { labels: items.map((item) => item.label), imgs: urls },
  );
  fs.writeFileSync(path.join(OUT, 'animals-art-contact.png'), Buffer.from(png.split(',')[1], 'base64'));
  console.log(`wrote dev/qa/out/animals-art-contact.png (${items.length} items)`);
} finally {
  await browser.close();
}
