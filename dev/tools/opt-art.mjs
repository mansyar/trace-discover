import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

// Downscale art-batch PNGs for the app bundle: backdrops -> JPEG q75,
// goal cutouts -> 256px PNG (alpha preserved). Reads dev/gen/*, writes public/art/*.
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const GEN = fileURLToPath(new URL('../gen', import.meta.url));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
} catch (e) {
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
      const scale = kind === 'bg' ? 1 : 256 / Math.max(bitmap.width, bitmap.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const url =
        kind === 'bg'
          ? canvas.toDataURL('image/jpeg', 0.75)
          : canvas.toDataURL('image/png');
      return { url, width: canvas.width, height: canvas.height };
    },
    {
      file: readFileSync(join(GEN, name)).toString('base64'),
      kind,
    },
  );

mkdirSync(join(ROOT, 'public/art/bg'), { recursive: true });
mkdirSync(join(ROOT, 'public/art/goal'), { recursive: true });
for (const theme of ['dino', 'construction', 'animals']) {
  const { url, width, height } = await convert(`bg-${theme}.png`, 'bg');
  writeFileSync(
    join(ROOT, `public/art/bg/${theme}.jpg`),
    Buffer.from(url.split(',')[1], 'base64'),
  );
  console.log(`bg/${theme}.jpg ${width}x${height}`);
}
for (const theme of ['dino', 'construction', 'animals']) {
  for (const n of ['1', '2', '3', '4', 'bonus']) {
    const src = `cut-goal-${theme}-${n}.png`;
    const { url, width, height } = await convert(src, 'goal');
    writeFileSync(
      join(ROOT, `public/art/goal/${theme}-${n}.png`),
      Buffer.from(url.split(',')[1], 'base64'),
    );
    console.log(`goal/${theme}-${n}.png ${width}x${height}`);
  }
}
await browser.close();
