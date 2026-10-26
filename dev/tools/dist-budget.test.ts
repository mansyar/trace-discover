// Contract for the dist size guard (track 20261026-budget-entry-guard): the
// entry ceiling bounds shipped files, not the precache manifest. The manifest
// number stays visible but informational, because art and rive are warmed into
// the runtime cache and never appear in it.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { budgetFailures, measureDist, precacheEntryCount } from './dist-budget.mjs';

const TOOL = fileURLToPath(new URL('./dist-budget.mjs', import.meta.url));
const CEILINGS = { entries: 200, totalBytes: 6_000_000 };
const roots: string[] = [];

afterAll(() => {
  for (const root of roots) {
    rmSync(root, { force: true, recursive: true });
  }
});

/** A dist-shaped fixture: `shipped` content files plus an optional sw.js manifest. */
function fixture({ precache = null, shipped }: { precache?: number | null; shipped: number }) {
  const root = mkdtempSync(join(tmpdir(), 'dist-budget-'));
  roots.push(root);
  for (let i = 0; i < shipped; i += 1) {
    const rel = i % 6 === 0 ? 'rive' : i % 3 === 0 ? 'art/sticker' : 'art/goal';
    mkdirSync(join(root, rel), { recursive: true });
    writeFileSync(join(root, rel, `asset-${i}.webp`), 'x');
  }
  if (precache !== null) {
    const urls = Array.from(
      { length: precache },
      (_unused, i) => `{url:"shell-${i}.js",revision:"r"}`,
    ).join(',');
    writeFileSync(join(root, 'sw.js'), `precacheAndRoute([${urls}]);`);
  }
  return root;
}

function runTool(args: readonly string[]) {
  const result = spawnSync(process.execPath, [TOOL, ...args], { encoding: 'utf8' });
  return { status: result.status, stderr: result.stderr, stdout: result.stdout };
}

describe('dist budget measurement', () => {
  it('counts shipped files separately from the precache manifest', () => {
    const measured = measureDist(fixture({ precache: 4, shipped: 199 }));

    expect(measured.shippedEntries).toBe(199);
    expect(measured.precacheEntries).toBe(4);
    // The fixture's 199 content files plus the generated service worker.
    expect(measured.fileCount).toBe(200);
  });

  it('excludes the service worker and workbox runtime from shipped files', () => {
    const root = fixture({ precache: 2, shipped: 5 });
    writeFileSync(join(root, 'workbox-abc123.js'), 'x');

    expect(measureDist(root).shippedEntries).toBe(5);
    expect(measureDist(root).fileCount).toBe(7);
  });

  it('reports no precache manifest when the build has no service worker', () => {
    const root = fixture({ precache: null, shipped: 199 });

    expect(precacheEntryCount(root)).toBeNull();
    expect(measureDist(root).precacheEntries).toBeNull();
    expect(measureDist(root).shippedEntries).toBe(199);
  });
});

describe('dist budget guard', () => {
  it('passes at and below the entry ceiling', () => {
    expect(budgetFailures(measureDist(fixture({ shipped: 199 })), CEILINGS)).toEqual([]);
    expect(budgetFailures(measureDist(fixture({ shipped: 200 })), CEILINGS)).toEqual([]);
  });

  it('fails above the entry ceiling with the shipped count in the message', () => {
    const failures = budgetFailures(measureDist(fixture({ shipped: 201 })), CEILINGS);

    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('201 > 200');
  });

  it('never gates on the precache manifest', () => {
    const measured = measureDist(fixture({ precache: 300, shipped: 199 }));

    expect(measured.precacheEntries).toBe(300);
    expect(budgetFailures(measured, CEILINGS)).toEqual([]);
    expect(budgetFailures(measured, { entries: 250, totalBytes: 6_000_000 })).toEqual([]);
  });
});

describe('dist budget CLI', () => {
  it('exits 1 when shipped files exceed the ceiling', () => {
    const root = fixture({ precache: 4, shipped: 201 });
    const run = runTool(['--dist', root, '--entries', '200']);

    expect(run.status).toBe(1);
    expect(run.stderr).toContain('201 > 200');
  });

  it('exits 0 when the override ceiling clears the shipped count', () => {
    const root = fixture({ precache: 4, shipped: 201 });
    const run = runTool(['--dist', root, '--entries', '250']);

    expect(run.status).toBe(0);
    expect(run.stdout).toContain('entries 201 / 250 - PASS');
  });

  it('prints the precache count as information even when it is large', () => {
    const root = fixture({ precache: 300, shipped: 199 });
    const run = runTool(['--dist', root, '--entries', '200']);

    expect(run.status).toBe(0);
    expect(run.stdout).toContain('precache entries: 300');
    expect(run.stdout).toContain('informational');
    expect(run.stdout).toContain('entries 199 / 200 - PASS');
  });

  it('names the build step when the measured directory is missing', () => {
    const root = fixture({ shipped: 1 });
    const run = runTool(['--dist', join(root, 'missing')]);

    expect(run.status).toBe(1);
    expect(run.stderr).toContain('pnpm build');
  });
});
