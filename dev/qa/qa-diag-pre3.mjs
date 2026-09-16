import { chromium } from 'playwright-core';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
} catch {
  browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
  });
}
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const pageErrors = [];
page.on('pageerror', (err) => pageErrors.push(String(err)));

await page.goto('http://localhost:5174/dev/harness/play.html?level=pre-3', { waitUntil: 'load' });
await page.waitForFunction(() => document.getElementById('log').textContent.includes('play ready'), null, {
  timeout: 30000,
});
await wait(800);

const trace = await page.evaluate(() => {
  const { field, path } = window.__qa;
  const pts = path.filter((_, i) => i % 4 === 0);
  pts.push(path[path.length - 1]);
  return { field, pts, count: path.length };
});
const toClient = (p) => ({
  x: trace.field.x + (p.x / 430) * trace.field.width,
  y: trace.field.y + (p.y / 860) * trace.field.height,
});

const fmt = (d) =>
  [
    `frontier=${Number(d.frontier).toFixed(2)}/${d.total !== undefined ? Number(d.total).toFixed(2) : '?'}`,
    `tracing=${d.tracing}`,
    d.nearestIndex !== undefined ? `nearest=#${d.nearestIndex} dist=${Number(d.nearestDistance).toFixed(2)}` : 'nearest=?',
    d.tipGap !== undefined ? `tipGap=${Number(d.tipGap).toFixed(2)}` : '',
    d.pointer ? `ptr=(${Number(d.pointer.x).toFixed(1)},${Number(d.pointer.y).toFixed(1)})` : 'ptr=null',
  ]
    .filter(Boolean)
    .join(' ');

const first = toClient(trace.pts[0]);
await page.mouse.move(first.x, first.y);
await page.mouse.down();
console.log(`path points=${trace.count} filtered=${trace.pts.length}`);
for (let i = 1; i < trace.pts.length; i += 1) {
  const p = trace.pts[i];
  const c = toClient(p);
  await page.mouse.move(c.x, c.y, { steps: 2 });
  await wait(80);
  console.log(`i=${i} ${fmt(await page.evaluate(() => window.__qa.debug()))}`);
}
const goal = toClient(trace.pts[trace.pts.length - 1]);
for (let i = 0; i < 5; i += 1) {
  await page.mouse.move(goal.x, goal.y);
  await wait(150);
  console.log(`dwell ${i} ${fmt(await page.evaluate(() => window.__qa.debug()))}`);
}
await page.mouse.up();
console.log('released');
console.log('log:', await page.evaluate(() => document.getElementById('log').textContent.replace(/\n/g, ' | ')));
console.log('pageerrors:', pageErrors.length ? pageErrors.join(' || ') : 'none');
await browser.close();
