// tools/opt-pre.mjs — Phase 4 optimizer: pre-writing rewards + star backdrop
// + badge + card art into public/. Backdrops -> JPEG q75, rewards -> 256px PNG
// goal + 128px PNG sticker, badge/card -> 256px PNG. usage: node dev/tools/opt-pre.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const GEN = fileURLToPath(new URL('../gen', import.meta.url));

let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
} catch {
  browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
  });
}
const page = await browser.newPage();
await page.goto('about:blank');

const convert = (name, kind) =>
  page.evaluate(
    async ({ file, kind }) => {
      const bytes = await (
        await fetch(`data:application/octet-stream;base64,${file}`)
      ).arrayBuffer();
      const blob = new Blob([bytes], { type: 'image/png' });
      const bitmap = await createImageBitmap(blob);
      const max = kind === 'sticker' ? 128 : kind === 'bg' ? Math.max(bitmap.width, bitmap.height) : 256;
      const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const url = kind === 'bg' ? canvas.toDataURL('image/jpeg', 0.75) : canvas.toDataURL('image/png');
      return { url, width: canvas.width, height: canvas.height };
    },
    { file: readFileSync(join(GEN, name)).toString('base64'), kind },
  );

mkdirSync(join(ROOT, 'public/art/bg'), { recursive: true });
mkdirSync(join(ROOT, 'public/art/goal'), { recursive: true });
mkdirSync(join(ROOT, 'public/art/sticker'), { recursive: true });
mkdirSync(join(ROOT, 'public/art/pack'), { recursive: true });

const jobs = [
  { src: 'bg-star.png', out: join(ROOT, 'public/art/bg/star.jpg'), kind: 'bg' },
  { src: 'cut-pre-badge.png', out: join(ROOT, 'public/art/pack/pre-badge.png'), kind: 'badge' },
  { src: 'pre-card.png', out: join(ROOT, 'public/art/pack/card-pre.png'), kind: 'card' },
];
const ids = [
  ...Array.from({ length: 12 }, (_, i) => `pre-${i + 1}`),
  'pre-bonus-1',
  'pre-bonus-2',
  'pre-bonus-3',
];
for (const id of ids) {
  jobs.push({ src: `cut-${id}.png`, out: join(ROOT, `public/art/goal/${id}.png`), kind: 'goal' });
  jobs.push({ src: `cut-${id}.png`, out: join(ROOT, `public/art/sticker/${id}.png`), kind: 'sticker' });
}

for (const job of jobs) {
  const { url, width, height } = await convert(job.src, job.kind);
  writeFileSync(job.out, Buffer.from(url.split(',')[1], 'base64'));
  console.log(`${job.out} ${width}x${height} ${Buffer.from(url.split(',')[1], 'base64').length}B`);
}
await browser.close();
