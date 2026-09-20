// tools/patterns-sheet.mjs — one-off contact sheet for the patterns art batch
// (owner approval gate, teddy/shapes precedent). Reads art-src/patterns/out,
// writes contact-sheet.html + contact-sheet.png next to it.
// usage (any cwd): node dev/tools/patterns-sheet.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(HERE, '..', 'art-src', 'patterns');
const OUT = path.join(DIR, 'out');

const files = [];
for (let i = 1; i <= 9; i++) {
  files.push(['goal-' + i, fs.readFileSync(path.join(OUT, `goal-pattern-${i}.png`)).toString('base64')]);
}
for (let i = 1; i <= 9; i++) {
  files.push(['sticker-' + i, fs.readFileSync(path.join(OUT, `sticker-pattern-${i}.png`)).toString('base64')]);
}
files.push(['badge', fs.readFileSync(path.join(OUT, 'patterns-badge.png')).toString('base64')]);
files.push(['card', fs.readFileSync(path.join(OUT, 'card-patterns.png')).toString('base64')]);

const html =
  '<html><body style="margin:0;background:#f4efe6;font-family:monospace">' +
  '<div style="padding:8px;font-size:14px">Patterns pack art batch — contact sheet (owner approval gate)</div>' +
  files
    .map(([name, b64]) => {
      const src = 'data:image/png;base64,' + b64;
      const width = name === 'card' ? 300 : 130;
      return (
        '<div style="display:inline-block;margin:6px;text-align:center;vertical-align:top">' +
        `<div style="font-size:11px">${name}</div>` +
        `<img src="${src}" style="width:${width}px;background:#fff;border:1px solid #ccc"></div>`
      );
    })
    .join('') +
  '</body></html>';

const htmlPath = path.join(DIR, 'contact-sheet.html');
fs.writeFileSync(htmlPath, html);

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
const page = await browser.newPage({ viewport: { width: 1100, height: 1750 } });
const url = 'file:///' + htmlPath.split(path.sep).join('/');
await page.goto(url);
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: path.join(DIR, 'contact-sheet.png'), fullPage: true });
console.log(`sheet: ${path.join(DIR, 'contact-sheet.png')}`);
await browser.close();
