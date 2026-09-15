import { chromium } from 'playwright-core';

const LEVELS = [
  'dino-1', 'dino-2', 'dino-3', 'dino-4', 'dino-bonus',
  'construction-1', 'construction-2', 'construction-3', 'construction-4', 'construction-bonus',
  'animals-1', 'animals-2', 'animals-3', 'animals-4', 'animals-bonus',
];
// Full simulated trace for every level: proves each one is finishable and lets
// the success tableau (mascot cheering spot vs buttons) be eyeballed per level.
const TRACE = new Set(LEVELS);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const logs = [];
let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
} catch (e) {
  browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
}

const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
for (const id of LEVELS) {
  await page.goto(`http://localhost:5174/play.html?level=${id}`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.getElementById('log').textContent.includes('play ready'),
    null, { timeout: 30000 },
  );
  await wait(800);
  const qa = await page.evaluate(() => ({ levelId: window.__qa.levelId, n: window.__qa.path.length }));
  if (qa.levelId !== id) {
    logs.push(`${id}: WRONG LEVEL (${qa.levelId})`);
    continue;
  }
  await page.screenshot({ path: `qa/${id}-rest.png` });
  const errs = await page.evaluate(() => document.getElementById('log').textContent.split('\n').filter((l) => /error|fail/i.test(l)).join(' ; ') || '(none)');
  logs.push(`${id}: rest ok (${qa.n} pts) errors: ${errs}`);

  if (TRACE.has(id)) {
    // Simulate a fingertip: press near the start star, walk the path, release.
    const trace = await page.evaluate(() => {
      const { field, path } = window.__qa;
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
    // Dwell on the goal so the capped frontier catches up, then release.
    const goal = toClient(trace.pts[trace.pts.length - 1]);
    for (let i = 0; i < 6; i += 1) {
      await page.mouse.move(goal.x, goal.y);
      await wait(120);
    }
    await page.mouse.up();
    try {
      await page.waitForFunction(() => window.__qa.isSuccess(), null, { timeout: 30000 });
      await wait(1500); // let the mascot glide to its cheering spot before judging
      await page.screenshot({ path: `qa/${id}-success.png` });
      logs.push(`${id}: TRACE SUCCESS`);
    } catch (e) {
      const state = await page.evaluate(() => document.getElementById('log').textContent.replace(/\n/g, ' | '));
      logs.push(`${id}: TRACE FAILED -- ${state}`);
      await page.screenshot({ path: `qa/${id}-stuck.png` });
    }
  }
}

console.log(logs.join('\n'));
await browser.close();
