import { chromium } from 'playwright-core';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const logs = [];
let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
} catch (e) {
  browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
}

const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
await page.goto('http://localhost:8080/', { waitUntil: 'load' });
await page.waitForFunction(() => document.getElementById('log').textContent.includes('state machine inputs'), null, { timeout: 20000 });
logs.push('ready: ' + (await page.evaluate(() => document.getElementById('log').textContent.replace(/\n/g, ' | '))));
await page.screenshot({ path: 'web/pt1-rest.png' });

// FPS sample while idle (animation loop tick check)
const fps = await page.evaluate(() => new Promise((res) => {
  let n = 0; const t0 = performance.now();
  function f() { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res((n / 2).toFixed(1)); }
  requestAnimationFrame(f);
}));
logs.push('rAF fps (headless): ' + fps);

// Path 1: host JS -> celebrate.fire() via the page button
await page.click('#fireBtn');
await wait(400);
await page.screenshot({ path: 'web/pt2-celebrate.png' });
logs.push('after fire: ' + (await page.evaluate(() => document.getElementById('log').textContent.replace(/\n/g, ' | '))));

await wait(1800);
await page.screenshot({ path: 'web/pt3-idle-again.png' });

// Path 2: real pointer tap on the dino canvas center -> in-file StateMachineListener (head tap)
const box = await page.locator('#dino').boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
await wait(450);
await page.screenshot({ path: 'web/pt4-tap.png' });
logs.push('tap at: ' + JSON.stringify(box));

const errs = await page.evaluate(() => document.getElementById('log').textContent.split('\n').filter((l) => /error|fail/i.test(l)).join(' ; ') || '(none)');
logs.push('page errors: ' + errs);

console.log(logs.join('\n'));
await browser.close();
