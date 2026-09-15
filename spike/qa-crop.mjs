import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Zoom a 2x crop of the parked-mascot region out of a burst frame.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

(async () => {
  const src = process.argv[2] ?? path.join(HERE, 'qa', 'blinkseq', 'f15.png');
  const out = process.argv[3] ?? path.join(HERE, 'qa', 'blink-zoom.png');
  let browser = null;
  for (const exe of EDGE_PATHS) {
    if (fs.existsSync(exe)) {
      browser = await chromium.launch({ executablePath: exe });
      break;
    }
  }
  browser ??= await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 480, height: 360 } });
  await page.goto(`file:///${src.replace(/\\/g, '/')}`, { waitUntil: 'load' });
  await page.addStyleTag({
    content: 'body{margin:0} img{width:860px;height:1800px}',
  });
  // Mascot sits ~x150-290, y700-830 in the 430x900 frame; 2x => x300-580, y1400-1660.
  await page.evaluate(() => window.scrollTo(250, 1360));
  await page.screenshot({ path: out });
  console.log(`wrote ${out}`);
  await browser.close();
})().catch((error) => {
  console.error('crop failed:', error);
  process.exitCode = 1;
});
