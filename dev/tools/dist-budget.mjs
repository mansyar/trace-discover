import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Dist size budget guard for the $0 payload lane.
// Ceilings derive from the measured post-payload-diet build, re-anchored on
// deliberate additions. History (byte total / shipped files):
//   2026-09-17 - post-diet build: 4,161,522 B / 133 entries -> 4.50 MB / 150
//   2026-09-17 - post-merge (PR #7 teddy): 4,641,746 B / 136 entries
//     (teddy.riv 445,653 B + skin art) -> 5.00 MB / 150
//   2026-09-18 - shapes pack art batch: 4,913,865 B / 156 entries
//     (8 goal + 8 sticker + card + badge WebPs, ~243 KB) -> 5.00 MB / 170
//     (shapes-pack_20260918; entry ceiling raised deliberately, size kept)
//   2026-09-18 - sixth skin (trex, track trex-skin_20260917): 5,224,739 B /
//     141 entries (trex.riv 463,868 B + playroom backdrop + face) -> 5.60 MB / 150
//   2026-09-18 - merged re-anchor (shapes art + trex skin in one build):
//     5,415,327 B / 159 entries -> 5.60 MB / 170 (both raises kept)
//   2026-09-19 - animals pack art batch (animal-outlines_20260919; 8 goal
//     habitats + 8 sticker seals swapped over the placeholders + card + paw
//     badge): 5,630,227 B / 177 entries -> 6.00 MB / 200 (deliberate
//     re-anchor, fresh measurements; +215 KB / +18 entries over baseline)
//   2026-09-24 - payload-headroom_20260924 foreground WebP diet: 5,555,072 B
//     / 197 entries -> 6.00 MB / 200 (no re-anchor; 341,168 B saved by
//     re-encoding 169 goal/sticker/pack WebPs; 3 entry slots remain)
//   2026-10-26 - track 20261026-budget-entry-guard: the entry ceiling had been
//     comparing the precache manifest, which dropped to 10 when art and rive
//     left the precache (payload-headroom), against a ceiling anchored on
//     shipped files. It now bounds shipped files again. Measured at 5e37a98:
//     197 / 200 shipped, 10 precache entries, 5,564,592 / 6,000,000 B.
// See conductor/archive/payload-diet_20260916/measurements.md for the diet
// figures. A re-introduced lossless art batch (+5 MB) or a new pack's raw art
// batch trips it immediately. Raise ceilings deliberately, with fresh
// measurements.
// Usage: node dev/tools/dist-budget.mjs [--total <bytes>] [--entries <n>] [--dist <dir>]
const CEIL_TOTAL_BYTES = 6_000_000;
const CEIL_ENTRIES = 200;
// Workbox runtime + generated service worker: precached shell plumbing, never
// part of the shipped content count.
const NOT_SHIPPED = /^(sw\.js|workbox-.*\.js)$/;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DIST = path.resolve(HERE, '..', '..', 'dist');

/**
 * Precache entries listed by the generated service worker, or `null` when the
 * build has none. Informational only: art and rive are warmed into the runtime
 * cache after boot, so this number tracks the shell, not the content.
 */
export function precacheEntryCount(dir) {
  const swPath = path.join(dir, 'sw.js');
  if (!fs.existsSync(swPath)) {
    return null;
  }
  const matches = fs.readFileSync(swPath, 'utf8').match(/url:"/g);
  return matches ? matches.length : 0;
}

/**
 * Measures a built dist tree: byte total, group/subgroup sizes, the shipped
 * (non-worker) file count the entry ceiling bounds, and the informational
 * precache count. Throws when the directory is absent so the CLI can point at
 * `pnpm build`.
 */
export function measureDist(dir) {
  if (!fs.existsSync(dir)) {
    throw new Error(`dist-budget: ${dir} not found - run \`pnpm build\` first`);
  }
  const groups = new Map();
  const artSub = new Map();
  let totalBytes = 0;
  let fileCount = 0;
  let shippedEntries = 0;

  const walk = (current) => {
    for (const dirent of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, dirent.name);
      if (dirent.isDirectory()) {
        walk(full);
        continue;
      }
      const rel = path.relative(dir, full).split(path.sep).join('/');
      const bytes = fs.statSync(full).size;
      const top = rel.includes('/') ? rel.split('/')[0] : '(root)';
      groups.set(top, (groups.get(top) ?? 0) + bytes);
      if (top === 'art') {
        const sub = rel.split('/')[1] ?? 'art';
        artSub.set(sub, (artSub.get(sub) ?? 0) + bytes);
      }
      totalBytes += bytes;
      fileCount += 1;
      if (!NOT_SHIPPED.test(path.basename(rel))) {
        shippedEntries += 1;
      }
    }
  };
  walk(dir);

  return {
    dir,
    totalBytes,
    fileCount,
    shippedEntries,
    precacheEntries: precacheEntryCount(dir),
    groups,
    artSub,
  };
}

/**
 * Failure message per ceiling, `null` where the ceiling holds, so each result can
 * be reported on its own line. The precache count is deliberately not a ceiling:
 * it describes the shell, and gating it would fail on a number that no longer
 * follows content.
 */
export function budgetFailures(measurement, ceilings) {
  return {
    entries:
      measurement.shippedEntries > ceilings.entries
        ? `dist-budget: FAIL entries ${measurement.shippedEntries} > ${ceilings.entries} shipped files`
        : null,
    totalBytes:
      measurement.totalBytes > ceilings.totalBytes
        ? `dist-budget: FAIL total ${measurement.totalBytes} > ${ceilings.totalBytes} B (over by ${
            measurement.totalBytes - ceilings.totalBytes
          })`
        : null,
  };
}

function argValue(argv, flag, fallback) {
  const i = argv.indexOf(flag);
  if (i === -1) {
    return fallback;
  }
  const value = Number.parseInt(argv[i + 1] ?? '', 10);
  if (!Number.isFinite(value)) {
    console.error(`dist-budget: ${flag} needs an integer value`);
    process.exit(1);
  }
  return value;
}

/**
 * The directory to measure: the default `dist/`, or a `--dist` value that must be
 * a directory. A bare flag would otherwise resolve to the working directory and
 * report a confident, wrong measurement.
 */
function distDir(argv) {
  const i = argv.indexOf('--dist');
  if (i === -1) {
    return DEFAULT_DIST;
  }
  const value = argv[i + 1];
  if (value === undefined || value.startsWith('--')) {
    console.error('dist-budget: --dist needs a directory');
    process.exit(1);
  }
  const dir = path.resolve(value);
  if (fs.existsSync(dir) && !fs.statSync(dir).isDirectory()) {
    console.error('dist-budget: --dist needs a directory');
    process.exit(1);
  }
  return dir;
}

function main() {
  const argv = process.argv.slice(2);
  const dir = distDir(argv);
  const ceilings = {
    entries: argValue(argv, '--entries', CEIL_ENTRIES),
    totalBytes: argValue(argv, '--total', CEIL_TOTAL_BYTES),
  };

  let measurement;
  try {
    measurement = measureDist(dir);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  const { artSub, fileCount, groups, precacheEntries, shippedEntries, totalBytes } = measurement;
  const mb = (n) => `${(n / 1e6).toFixed(2)} MB`;
  console.log(`dist-budget: ${path.relative(process.cwd(), dir)}`);
  console.log(
    `  files: ${fileCount} (shipped: ${shippedEntries}; worker files: ${
      fileCount - shippedEntries
    }; precache entries: ${precacheEntries ?? 'none'})`,
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

  // FR-2: the manifest count stays visible because the precache globs are a
  // deliberate design choice, but it never gates.
  console.log(
    precacheEntries === null
      ? 'dist-budget: precache entries: none (no sw.js in this build) - informational, does not gate'
      : `dist-budget: precache entries: ${precacheEntries} (informational; art and rive are warmed at runtime)`,
  );

  // Each ceiling reports independently: a breached entry count must not hide the
  // byte total's PASS line from a CI log.
  const failures = budgetFailures(measurement, ceilings);
  if (failures.totalBytes === null) {
    console.log(`dist-budget: total ${totalBytes} / ${ceilings.totalBytes} B - PASS`);
  } else {
    console.error(failures.totalBytes);
  }
  if (failures.entries === null) {
    console.log(`dist-budget: entries ${shippedEntries} / ${ceilings.entries} - PASS`);
  } else {
    console.error(failures.entries);
  }
  process.exit(failures.entries === null && failures.totalBytes === null ? 0 : 1);
}

const invokedPath = process.argv[1];
const isCli =
  invokedPath !== undefined &&
  (() => {
    try {
      return fs.realpathSync(invokedPath) === fs.realpathSync(fileURLToPath(import.meta.url));
    } catch {
      return false;
    }
  })();

if (isCli) {
  main();
}
