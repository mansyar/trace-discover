// Throwaway: screenshot every animals-pack level via the pack preview harness
// so the blind-authored geometry can be eyeballed. Delete after use.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'out', 'animals');
mkdirSync(OUT, { recursive: true });

const LEVELS = [
  'animal-1',
  'animal-2',
  'animal-3',
  'animal-4',
  'animal-5',
  'animal-6',
  'animal-7',
  'animal-8',
];
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
for (const level of LEVELS) {
  await page.goto(`http://localhost:5199/dev/harness/pack.html?pack=animals&level=${level}`, {
    waitUntil: 'load',
  });
  await wait(1500);
  const errors = await page.evaluate(
    () =>
      document
        .getElementById('log')
        .textContent.split('\n')
        .filter((l) => /error|fail/i.test(l))
        .join(' ; ') || '(none)',
  );
  await page.screenshot({ path: join(OUT, `${level}.png`) });
  console.log(`${level}: errors ${errors}`);
}

// Landscape spot: the same levels in the wide design space.
const wide = await browser.newPage({ viewport: { width: 900, height: 470 } });
for (const level of ['animal-3', 'animal-6', 'animal-7']) {
  await wide.goto(`http://localhost:5199/dev/harness/pack.html?pack=animals&level=${level}`, {
    waitUntil: 'load',
  });
  await wait(1500);
  await wide.screenshot({ path: join(OUT, `${level}-wide.png`) });
  console.log(`${level} (wide): shot`);
}
await browser.close();
