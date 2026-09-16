// One-shot: renders the star-on-path icon SVG headlessly and saves PNGs to public/icons/.
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const CREAM = '#f6e3b8';
const NAVY = '#2e4a63';
const GOLD = '#e8c15a';

function star(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 10; i += 1) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + Math.cos(a) * rad).toFixed(1)},${(cy + Math.sin(a) * rad).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${GOLD}" stroke="${NAVY}" stroke-width="14" stroke-linejoin="round"/>`;
}

// Dotted trail sweeping under the star, like a traced path.
const trail = `<path d="M 60 400 C 150 320, 200 460, 300 380 S 430 300, 452 180" fill="none" stroke="${NAVY}" stroke-width="16" stroke-linecap="round" stroke-dasharray="1 30"/>`;

function svg(size, padStar) {
  // padStar scales the composition into the maskable safe zone when true.
  const inner = `${trail}${star(256, 250, 120)}
    <circle cx="222" cy="238" r="11" fill="${NAVY}"/><circle cx="290" cy="238" r="11" fill="${NAVY}"/>
    <path d="M 228 276 Q 256 296 284 276" fill="none" stroke="${NAVY}" stroke-width="11" stroke-linecap="round"/>`;
  const body = padStar
    ? `<g transform="translate(256 256) scale(0.66) translate(-256 -256)">${inner}</g>`
    : inner;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><rect width="512" height="512" fill="${CREAM}"/>${body}</svg>`;
}

const targets = [
  { file: 'icon-512.png', size: 512, pad: false },
  { file: 'icon-192.png', size: 192, pad: false },
  { file: 'apple-180.png', size: 180, pad: false },
  { file: 'maskable-512.png', size: 512, pad: true },
];

const browser = await chromium.launch({ channel: 'msedge', headless: true });
for (const t of targets) {
  const page = await browser.newPage({ viewport: { width: t.size, height: t.size } });
  await page.setContent(
    `<!doctype html><html><body style="margin:0">${svg(t.size, t.pad)}</body></html>`,
  );
  const bytes = await page.screenshot({ clip: { height: t.size, width: t.size, x: 0, y: 0 } });
  writeFileSync(new URL(`../../public/icons/${t.file}`, import.meta.url), bytes);
  console.log(`${t.file}: ${bytes.length} bytes`);
  await page.close();
}
await browser.close();
