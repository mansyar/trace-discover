// `pnpm pack:check` — validates every pack JSON file in `src/packs/data/`
// through the same parser the app loads at runtime, so author-time and
// load-time validation can never drift. Runs as a Vitest suite (Node's native
// TS type-stripping cannot resolve the repo's extensionless imports); the
// command fails on any problem or on an empty pack directory.
import { readdirSync, readFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { collectPackProblems } from '../../src/packs/json';

/** Validates every `*.json` pack in a directory; returns problems per file. */
function validatePackDir(dir: string): string[] {
  const problems: string[] = [];
  const files = readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort();
  if (files.length === 0) {
    problems.push(`${dir}: no pack JSON files found`);
  }
  for (const file of files) {
    const path = join(dir, file);
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(path, 'utf8'));
    } catch (error) {
      problems.push(`${file}: invalid JSON — ${error instanceof Error ? error.message : error}`);
      continue;
    }
    for (const problem of collectPackProblems(raw)) {
      problems.push(`${file}: ${problem}`);
    }
  }
  return problems;
}

const PROBLEM_LEVEL = {
  goal: { x: 285, y: 430 },
  goalArt: '/art/goal/pre-1.webp',
  id: 'pre-1',
  stroke: 'line',
  strokes: [[{ x: 145, y: 430 }]],
};

const PROBLEM_PACK = {
  badgeId: 'pre-badge',
  id: 'pre',
  levels: [PROBLEM_LEVEL],
  menuFill: '#a8d8b9',
};

describe('pack:check', () => {
  it('passes on every shipped pack', () => {
    const dir = fileURLToPath(new URL('../../src/packs/data/', import.meta.url));
    expect(validatePackDir(dir)).toEqual([]);
  });

  it('fails loudly and names the offending file and level', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pack-check-'));
    try {
      writeFileSync(join(dir, 'broken.json'), JSON.stringify(PROBLEM_PACK));
      writeFileSync(join(dir, 'not-json.json'), '{ nope');
      const problems = validatePackDir(dir);
      expect(problems).toContain(
        "broken.json: pack level 0 ('pre-1'): stroke 0 needs at least 2 control points",
      );
      expect(problems.some((p) => p.startsWith('not-json.json: invalid JSON'))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
