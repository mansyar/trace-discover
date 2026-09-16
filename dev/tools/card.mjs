// Composites the pack menu card art ("1 2 3" row) from the numeral cutouts.
// Reads spike/nums/clean-numeral-{1,2,3}.png, writes spike/nums/clean-card.png.
// Usage: node spike/tools/card.mjs   (then copy to public/art/pack/card.png)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NUMS = path.resolve(HERE, '..', 'nums');

async function launch() {
  try {
    return await chromium.launch({ channel: 'msedge' });
  } catch {
    const exe = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    if (fs.existsSync(exe)) {
      return chromium.launch({ executablePath: exe });
    }
    throw new Error('Edge not found');
  }
}

const read = (name) => fs.readFileSync(path.join(NUMS, name)).toString('base64');

const browser = await launch();
try {
  const page = await browser.newPage();
  const result = await page.evaluate(
    async ({ a, b, c }) => {
      const load = (b64) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = `data:image/png;base64,${b64}`;
        });
      const [i1, i2, i3] = await Promise.all([load(a), load(b), load(c)]);
      const height = 260;
      const gap = 34;
      const pad = 26;
      const widths = [i1, i2, i3].map((img) => (img.width / img.height) * height);
      const width = Math.round(widths.reduce((sum, w) => sum + w, 0) + gap * 2 + pad * 2);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height + pad * 2;
      const ctx = canvas.getContext('2d');
      let x = pad;
      for (const [img, w] of [
        [i1, widths[0]],
        [i2, widths[1]],
        [i3, widths[2]],
      ]) {
        ctx.drawImage(img, x, pad, w, height);
        x += w + gap;
      }
      return canvas.toDataURL('image/png').split(',')[1];
    },
    {
      a: read('clean-numeral-1.png'),
      b: read('clean-numeral-2.png'),
      c: read('clean-numeral-3.png'),
    },
  );
  fs.writeFileSync(path.join(NUMS, 'clean-card.png'), Buffer.from(result, 'base64'));
  console.log('ok nums/clean-card.png');
} finally {
  await browser.close();
}
