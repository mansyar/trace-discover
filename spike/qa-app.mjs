import { chromium } from 'playwright-core';

// Production app-loop QA: drives the real index.html from splash to badge to
// bonus for every theme, tracing each level with a simulated fingertip.
// Usage: `pnpm dev -- --port 5176` in one shell, then `node qa-app.mjs` here.
const PORT = 5176;
const THEMES = ['dino', 'construction', 'animals'];
const MAINS = ['1', '2', '3', '4'];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const logs = [];
const log = (line) => {
  logs.push(line);
  console.log(line);
};
const pageErrors = [];
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
page.on('pageerror', (err) => pageErrors.push(String(err)));

const screenOf = () =>
  page.evaluate(() => ({ name: window.__app.screen().name, ...(window.__app.screen() ?? {}) }));
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
  if (!pt) throw new Error(`target missing: ${id}`);
  await page.mouse.click(pt.x, pt.y);
  await wait(400);
};
const traceLevel = async (id) => {
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
  await wait(1800); // completion choreography + mascot glide to its cheering spot
  await page.screenshot({ path: `qa-app/${id}-success.png` });
};

await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__app && window.__app.screen, null, { timeout: 30000 });
await wait(800);
await page.screenshot({ path: 'qa-app/splash.png' });
await tapTarget('splash');
log(`splash -> ${(await screenOf()).name}`);
await page.screenshot({ path: 'qa-app/menu.png' });

for (const theme of THEMES) {
  await tapTarget(`theme:${theme}`);
  log(`${theme}: -> ${(await screenOf()).name}`);
  await page.screenshot({ path: `qa-app/theme-${theme}.png` });
  for (const n of MAINS) {
    const id = `${theme}-${n}`;
    const opened = await screenOf();
    if (opened.name !== 'level' || opened.levelId !== id) {
      if (opened.name === 'theme') {
        await tapTarget(`level:${id}`);
      } else {
        log(`${id}: DID NOT OPEN (${opened.name} ${opened.levelId ?? ''})`);
        continue;
      }
    }
    try {
      await traceLevel(id);
      log(`${id}: TRACE SUCCESS`);
    } catch (e) {
      log(`${id}: TRACE FAILED`);
      await page.screenshot({ path: `qa-app/${id}-stuck.png` });
    }
    await tapTarget('success:next');
    await wait(300);
  }
  const afterMains = await screenOf();
  log(`${theme}: after L4 next -> ${afterMains.name}`);
  await page.screenshot({ path: `qa-app/badge-${theme}.png` });
  await tapTarget(`bonus:${theme}`);
  try {
    await traceLevel(`${theme}-bonus`);
    log(`${theme}-bonus: TRACE SUCCESS`);
  } catch (e) {
    log(`${theme}-bonus: TRACE FAILED`);
    await page.screenshot({ path: `qa-app/${theme}-bonus-stuck.png` });
  }
  await tapTarget('success:home');
  await wait(300);
  log(`${theme}: home -> ${(await screenOf()).name}`);
  // Re-open the theme to capture filled sticker slots + badge.
  await tapTarget(`theme:${theme}`);
  await wait(400);
  await page.screenshot({ path: `qa-app/theme-${theme}-done.png` });
  await tapTarget('theme:home');
  await wait(300);
  log(`${theme}: back -> ${(await screenOf()).name}`);
}

const saved = await page.evaluate(() => localStorage.getItem('trace-discover-save-v1'));
log(`save: ${saved}`);
log(`page errors: ${pageErrors.length ? pageErrors.join(' ; ') : '(none)'}`);
await browser.close();
