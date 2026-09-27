// Deterministic production asset inventory for the payload-headroom track.
// This is dev-only tooling. It reports the same top-level categories as
// dist-budget.mjs, preserves per-file evidence, and identifies dist files that
// are neither present in public/ nor recognized generated output.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NOT_PRECACHED = /^(sw\.js|workbox-.*\.js)$/;
const GENERATED_ROOT_FILES = new Set(['index.html', 'manifest.webmanifest', 'registerSW.js']);
const GENERATED_PREFIXES = ['assets/'];
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(HERE, '..', '..', 'dist');
const PUBLIC = path.resolve(HERE, '..', '..', 'public');

/**
 * @typedef {{ readonly bytes: number, readonly path: string }} InventoryFile
 * @typedef {{ readonly category: string, readonly path: string, readonly precached: boolean, readonly bytes: number }} InventoryRecord
 * @typedef {{ readonly category: string, readonly path: string, readonly precached: boolean, readonly artGroup?: string, readonly bytes: number }} InventoryClassification
 */

/**
 * Classifies one normalized dist-relative path.
 * @param {string} filePath
 * @returns {InventoryClassification}
 */
export function classifyInventoryPath(filePath) {
  const normalized = normalizePath(filePath);
  const segments = normalized.split('/');
  const category = segments.length > 1 ? segments[0] : 'root';
  const artGroup = category === 'art' ? segments[1] ?? 'art' : undefined;
  return {
    artGroup,
    bytes: 0,
    category,
    path: normalized,
    precached: !NOT_PRECACHED.test(path.basename(normalized)),
  };
}

/**
 * Summarizes inventory files with stable ordering and category totals.
 * @param {readonly InventoryFile[]} files
 * @returns {{
 *   readonly art: Readonly<Record<string, number>>,
 *   readonly categories: Readonly<Record<string, number>>,
 *   readonly fileCount: number,
 *   readonly files: readonly InventoryRecord[],
 *   readonly precacheEntries: number,
 *   readonly totalBytes: number,
 * }}
 */
export function summarizeInventory(files) {
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
  const categories = {};
  const art = {};
  const records = [];
  let totalBytes = 0;
  let precacheEntries = 0;

  for (const file of sorted) {
    const classification = classifyInventoryPath(file.path);
    const category = classification.category;
    const record = {
      bytes: file.bytes,
      category,
      path: classification.path,
      precached: classification.precached,
      ...(classification.artGroup ? { artGroup: classification.artGroup } : {}),
    };
    categories[category] = (categories[category] ?? 0) + file.bytes;
    if (classification.artGroup) {
      art[classification.artGroup] = (art[classification.artGroup] ?? 0) + file.bytes;
    }
    records.push(record);
    totalBytes += file.bytes;
    if (classification.precached) {
      precacheEntries += 1;
    }
  }

  return {
    art: sortRecord(art),
    categories: sortRecord(categories),
    fileCount: records.length,
    files: records,
    precacheEntries,
    totalBytes,
  };
}

/**
 * Returns sorted inventory paths absent from the supplied reference set.
 * @param {readonly InventoryFile[]} files
 * @param {ReadonlySet<string>} referencedPaths
 * @returns {string[]}
 */
export function findUnreferencedFiles(files, referencedPaths) {
  return files
    .map((file) => normalizePath(file.path))
    .filter((filePath) => !referencedPaths.has(filePath))
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Recursively reads a directory into normalized inventory records.
 * @param {string} root
 * @returns {InventoryFile[]}
 */
export function readInventoryFiles(root) {
  if (!fs.existsSync(root)) {
    return [];
  }
  const files = [];
  walk(root, root, files);
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Prints a complete JSON inventory for the current dist and public trees.
 * @returns {void}
 */
export function printInventory() {
  const distFiles = readInventoryFiles(DIST);
  const publicFiles = readInventoryFiles(PUBLIC);
  const distPaths = new Set(distFiles.map((file) => normalizePath(file.path)));
  const referencedPaths = new Set([
    ...distPaths,
    ...publicFiles.map((file) => normalizePath(file.path)),
  ]);
  const report = summarizeInventory(distFiles);
  const output = {
    ...report,
    publicOnly: findUnreferencedFiles(publicFiles, distPaths),
    unreferencedDist: findUnreferencedFiles(distFiles, referencedPaths).filter(
      (filePath) => !isGeneratedPath(filePath),
    ),
  };
  console.log(JSON.stringify(output, null, 2));
}

/**
 * @param {string} filePath
 * @returns {boolean}
 */
function isGeneratedPath(filePath) {
  return (
    GENERATED_ROOT_FILES.has(filePath) ||
    GENERATED_PREFIXES.some((prefix) => filePath.startsWith(prefix)) ||
    NOT_PRECACHED.test(path.basename(filePath))
  );
}

/**
 * @param {string} value
 * @returns {string}
 */
function normalizePath(value) {
  return value.split(path.sep).join('/').replace(/^\/+/, '');
}

/**
 * @param {Record<string, number>} values
 * @returns {Record<string, number>}
 */
function sortRecord(values) {
  return Object.fromEntries(Object.entries(values).sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * @param {string} directory
 * @param {string} root
 * @param {InventoryFile[]} files
 * @returns {void}
 */
function walk(directory, root, files) {
  for (const dirent of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, dirent.name);
    if (dirent.isDirectory()) {
      walk(fullPath, root, files);
      continue;
    }
    files.push({
      bytes: fs.statSync(fullPath).size,
      path: normalizePath(path.relative(root, fullPath)),
    });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  printInventory();
}
