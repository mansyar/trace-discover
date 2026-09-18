import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Dist size budget guard for the $0 payload lane.
// Ceilings derive from the measured post-payload-diet build, re-anchored on
// deliberate additions. History:
//   2026-09-17 - post-diet build: 4,161,522 B / 133 entries -> 4.50 MB / 150
//   2026-09-17 - post-merge (PR #7 teddy): 4,641,746 B / 136 entries
//     (teddy.riv 445,653 B + skin art) -> 5.00 MB / 150
//   2026-09-18 - shapes pack art batch: 4,913,865 B / 156 entries
//     (8 goal + 8 sticker + card + badge WebPs, ~243 KB) -> 5.00 MB / 170
//     (shapes-pack_20260918; entry ceiling raised deliberately, size kept)
// See conductor/archive/payload-diet_20260916/measurements.md for the diet
// figures. A re-introduced lossless art batch (+5 MB) or a new pack's raw art
// batch trips it immediately. Raise ceilings deliberately, with fresh
// measurements.
// Usage: node dev/tools/dist-budget.mjs [--total <bytes>] [--entries <n>]
const CEIL_TOTAL_BYTES = 5_000_000;
const CEIL_ENTRIES = 170;
// Workbox runtime + generated service worker: never precached.
const NOT_PRECACHED = /^(sw\.js|workbox-.*\.js)$/;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(HERE, '..', '..', 'dist');

const argv = process.argv.slice(2);
function argValue(flag, fallback) {
  const i = argv.indexOf(flag);
  if (i === -1) return fallback;
  const value = Number.parseInt(argv[i + 1] ?? '', 10);
  if (!Number.isFinite(value)) {
    console.error(`dist-budget: ${flag} needs an integer value`);
    process.exit(1);
  }
  return value;
}
const ceilTotal = argValue('--total', CEIL_TOTAL_BYTES);
const ceilEntries = argValue('--entries', CEIL_ENTRIES);

if (!fs.existsSync(DIST)) {
  console.error('dist-budget: dist/ not found - run `pnpm build` first');
  process.exit(1);
}

const groups = new Map();
const artSub = new Map();
let totalBytes = 0;
let fileCount = 0;
let entries = 0;

function walk(dir) {
  for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      walk(full);
      continue;
    }
    const rel = path.relative(DIST, full).split(path.sep).join('/');
    const bytes = fs.statSync(full).size;
    const top = rel.includes('/') ? rel.split('/')[0] : '(root)';
    groups.set(top, (groups.get(top) ?? 0) + bytes);
    if (top === 'art') {
      const sub = rel.split('/')[1] ?? 'art';
      artSub.set(sub, (artSub.get(sub) ?? 0) + bytes);
    }
    totalBytes += bytes;
    fileCount += 1;
    if (!NOT_PRECACHED.test(path.basename(rel))) entries += 1;
  }
}
walk(DIST);

let swReported = null;
const swPath = path.join(DIST, 'sw.js');
if (fs.existsSync(swPath)) {
  const matches = fs.readFileSync(swPath, 'utf8').match(/url:"/g);
  swReported = matches ? matches.length : 0;
}

const mb = (n) => `${(n / 1e6).toFixed(2)} MB`;
console.log(`dist-budget: ${path.relative(process.cwd(), DIST)}`);
console.log(
  `  files: ${fileCount} (precache entries: ${entries}${
    swReported === null ? '' : `; sw.js reports ${swReported}`
  })`,
);
console.log(`  total: ${totalBytes} B (${mb(totalBytes)})`);
for (const [name, bytes] of [...groups.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`    ${name.padEnd(8)} ${String(bytes).padStart(9)} B`);
  if (name === 'art') {
    for (const [sub, subBytes] of [...artSub.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`      ${sub.padEnd(8)} ${String(subBytes).padStart(9)} B`);
    }
  }
}

let failed = false;
if (totalBytes > ceilTotal) {
  console.error(
    `dist-budget: FAIL total ${totalBytes} > ${ceilTotal} B (over by ${totalBytes - ceilTotal})`,
  );
  failed = true;
} else {
  console.log(`dist-budget: total ${totalBytes} / ${ceilTotal} B - PASS`);
}
if (entries > ceilEntries) {
  console.error(`dist-budget: FAIL entries ${entries} > ${ceilEntries}`);
  failed = true;
} else {
  console.log(`dist-budget: entries ${entries} / ${ceilEntries} - PASS`);
}
if (swReported !== null && swReported !== entries) {
  console.log(
    `dist-budget: note - sw.js manifest count (${swReported}) differs from filesystem count (${entries})`,
  );
}
process.exit(failed ? 1 : 0);
