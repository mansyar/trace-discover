import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Contact sheet for art approvals: renders labeled images in a grid and
// screenshots it. Usage:
//   node dev/qa/qa-sheet.mjs out.png [--cols=3] [--title="…"] label=path …
// Paths are relative to this script's folder (dev/qa); the sheet is written relative to it too.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const out = args[0];
if (!out) {
  console.error('usage: node dev/qa/qa-sheet.mjs out.png [--cols=3] [--title="…"] label=path …');
  process.exit(2);
}
const colsArg = args.find((a) => a.startsWith('--cols='));
const cols = colsArg ? parseInt(colsArg.split('=')[1], 10) : 3;
const titleArg = args.find((a) => a.startsWith('--title='));
const title = titleArg ? titleArg.slice('--title='.length) : '';
const items = args
  .slice(1)
  .filter((a) => !a.startsWith('--'))
  .map((a) => {
    const eq = a.indexOf('=');
    return { label: a.slice(0, eq), file: a.slice(eq + 1) };
  });
const outPath = path.resolve(HERE, out);

let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
} catch {
  browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
  });
}
const rows = Math.ceil(items.length / cols);
const page = await browser.newPage({
  viewport: { width: cols * 340 + 40, height: rows * 400 + 140 },
});
const cells = items
  .map(({ label, file }) => {
    const b64 = fs.readFileSync(path.resolve(HERE, file)).toString('base64');
    return `<figure><img src="data:image/png;base64,${b64}"><figcaption>${label}</figcaption></figure>`;
  })
  .join('');
await page.setContent(`<!doctype html><style>
  body { background: #f6e3b8; font: 600 22px system-ui; color: #2e4a63; margin: 0; padding: 20px; display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 16px; }
  figure { margin: 0; background: #fff8e6; border: 4px solid #2e4a63; border-radius: 16px; padding: 10px; text-align: center; }
  img { width: 100%; border-radius: 10px; display: block; }
  figcaption { padding: 8px 0 4px; }
  h1 { grid-column: 1 / -1; font-size: 26px; margin: 0 0 6px; }
</style>${title ? `<h1>${title}</h1>` : ''}${cells}`);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(300);
await page.screenshot({ path: outPath, fullPage: true });
console.log(`ok ${out}`);
await browser.close();
