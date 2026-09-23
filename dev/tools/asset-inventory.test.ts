// Red-phase contract for the dev-only production asset inventory.
// The inventory must provide auditable per-file records and category totals
// without making assumptions about which shipped files are safe to remove.
import { describe, expect, it } from 'vitest';
import {
  findUnreferencedFiles,
  summarizeInventory,
  type InventoryFile,
} from './asset-inventory.mjs';

describe('asset inventory', () => {
  it('reports stable category totals, precache counts, and sorted file records', () => {
    const files: InventoryFile[] = [
      { bytes: 40, path: 'icons/icon-192.png' },
      { bytes: 20, path: 'rive/dino.riv' },
      { bytes: 30, path: 'assets/index.js' },
      { bytes: 10, path: 'art/goal/pre-1.webp' },
      { bytes: 5, path: 'index.html' },
      { bytes: 2, path: 'sw.js' },
    ];

    const report = summarizeInventory(files);

    expect(report).toMatchObject({
      art: { goal: 10 },
      categories: { art: 10, assets: 30, icons: 40, root: 7, rive: 20 },
      fileCount: 6,
      files: [
        { bytes: 10, category: 'art', path: 'art/goal/pre-1.webp', precached: true },
        { bytes: 30, category: 'assets', path: 'assets/index.js', precached: true },
        { bytes: 40, category: 'icons', path: 'icons/icon-192.png', precached: true },
        { bytes: 5, category: 'root', path: 'index.html', precached: true },
        { bytes: 20, category: 'rive', path: 'rive/dino.riv', precached: true },
        { bytes: 2, category: 'root', path: 'sw.js', precached: false },
      ],
      precacheEntries: 5,
      totalBytes: 107,
    });
  });

  it('reports files that are not present in the reference set', () => {
    const files: InventoryFile[] = [
      { bytes: 1, path: 'art/goal/orphan.webp' },
      { bytes: 2, path: 'art/goal/known.webp' },
    ];

    expect(findUnreferencedFiles(files, new Set(['art/goal/known.webp']))).toEqual([
      'art/goal/orphan.webp',
    ]);
  });

  it('does not precache the generated service worker runtime', () => {
    const report = summarizeInventory([
      { bytes: 1, path: 'sw.js' },
      { bytes: 2, path: 'workbox-runtime.js' },
      { bytes: 3, path: 'registerSW.js' },
    ]);

    expect(report.precacheEntries).toBe(1);
    expect(report.files.map((file) => [file.path, file.precached])).toEqual([
      ['registerSW.js', true],
      ['sw.js', false],
      ['workbox-runtime.js', false],
    ]);
  });
});
