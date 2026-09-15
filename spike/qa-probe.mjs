import { chromium } from 'playwright-core';

// Probe: why does success:next not navigate in the production app?
const PORT = 5176;
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
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
page.on('pageerror', (err) => console.log('PAGEERROR:', String(err).slice(0, 300)));
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('CONSOLE-ERR:', msg.text().slice(0, 300));
});

const tapTarget = async (id) => {
  const pt = await page.evaluate((targetId) => {
    const hit = window.__app.targets().find((t) => t.id === targetId);
    if (!hit) return null;
    const f = window.__app.field();
    return {
      x: f.x + (hit.x / 430) * f.width,
      y: f.y + (hit.y / 860) * f.height,
    };
  }, id);
  console.log(`tap ${id}:`, JSON.stringify(pt));
  if (!pt) throw new Error(`target missing: ${id}`);
  await page.mouse.click(pt.x, pt.y);
  await wait(400);
};

await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__app && window.__app.screen, null, { timeout: 30000 });
await wait(800);
await tapTarget('splash');
await tapTarget('theme:dino');
await tapTarget('level:dino-1');
console.log('screen:', JSON.stringify(await page.evaluate(() => window.__app.screen())));

// Trace dino-1.
await page.waitForFunction(() => window.__app.path().length > 10, null, { timeout: 30000 });
const trace = await page.evaluate(() => {
  const field = window.__app.field();
  const path = window.__app.path();
  const pts = path.filter((_, i) => i % 4 === 0);
  pts.push(path[path.length - 1]);
  return { field, pts };
});
const toClient = (p) => ({
  x: trace.field.x + (p.x / 430) * trace.field.width,
  y: trace.field.y + (p.y / 860) * trace.field.height,
});
const first = toClient(trace.pts[0]);
await page.mouse.move(first.x, first.y);
await page.mouse.down();
for (const p of trace.pts.slice(1)) {
  const c = toClient(p);
  await page.mouse.move(c.x, c.y, { steps: 2 });
  await wait(60);
}
const goal = toClient(trace.pts[trace.pts.length - 1]);
for (let i = 0; i < 6; i += 1) {
  await page.mouse.move(goal.x, goal.y);
  await wait(120);
}
await page.mouse.up();
await page.waitForFunction(() => window.__app.success(), null, { timeout: 30000 });
await wait(1500);
console.log('success screen:', JSON.stringify(await page.evaluate(() => window.__app.screen())));
console.log('targets:', JSON.stringify(await page.evaluate(() => window.__app.targets())));
await tapTarget('success:next');
console.log('after next:', JSON.stringify(await page.evaluate(() => window.__app.screen())));
await browser.close();
