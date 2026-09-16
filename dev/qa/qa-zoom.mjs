import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

// Generic magnified screenshot crop: render a PNG at `scale`, scroll to
// (scrollX, scrollY), capture a w x h viewport. For inspecting small UI
// details (skin button face icons) at real rendering scale.
// usage: node dev/qa/qa-zoom.mjs <src.png> <out.png> [scale] [scrollX] [scrollY] [w] [h]
const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

async function launch() {
  for (const exe of EDGE_PATHS) {
    if (fs.existsSync(exe)) {
      return chromium.launch({ executablePath: exe });
    }
  }
  return chromium.launch({ channel: 'msedge' });
}

(async () => {
  const src = process.argv[2];
  const out = process.argv[3];
  if (!src || !out) {
    console.error('usage: node dev/qa/qa-zoom.mjs <src.png> <out.png> [scale] [scrollX] [scrollY] [w] [h]');
    process.exit(1);
  }
  const scale = Number(process.argv[4] ?? 4);
  const scrollX = Number(process.argv[5] ?? 0);
  const scrollY = Number(process.argv[6] ?? 0);
  const w = Number(process.argv[7] ?? 480);
  const h = Number(process.argv[8] ?? 480);
  const abs = path.resolve(src).replace(/\\/g, '/');

  let browser = null;
  try {
    browser = await launch();
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    // The PNG opens directly as the document; measure it there.
    await page.goto(`file:///${abs}`, { waitUntil: 'load' });
    const size = await page.evaluate(() => {
      const img = document.querySelector('img');
      if (!img) return null;
      return { width: img.naturalWidth, height: img.naturalHeight };
    });
    if (!size) {
      throw new Error('source image did not load');
    }
    await page.addStyleTag({
      content: `body{margin:0} img{width:${size.width * scale}px;height:${size.height * scale}px}`,
    });
    await page.evaluate(([x, y]) => window.scrollTo(x, y), [scrollX, scrollY]);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await page.screenshot({ path: out });
    console.log(`wrote ${out} (${size.width}x${size.height} @${scale}x, scroll ${scrollX},${scrollY})`);
  } finally {
    await browser?.close();
  }
})().catch((error) => {
  console.error('zoom failed:', error);
  process.exitCode = 1;
});
