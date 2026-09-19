// tools/trace-animals.mjs — traces every animals-pack reference cutout into
// field-space control points (trace-contour.mjs), then composes the levels of
// src/packs/data/animals.json (animal-1..8 in the locked spec order).
// Resumable: traces are regenerated on every run (cheap); the composed JSON is
// written only when every trace succeeds. Raw traces land in
// dev/art-src/animals/<name>.trace.json (intermediates).
// usage (any cwd): node dev/tools/trace-animals.mjs
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)); // dev/tools

// Locked spec order (simple -> detailed) with anatomy cuts (normalized
// anchors into the cutout): fish body+tail, ladybug dome+head, butterfly
// upper/lower wings (re-pins the spec's 3 strokes to 2 - see plan).
const JOBS = [
  { level: 'animal-1', animal: 'fish', cuts: [[0.29, 0.49], [0.29, 0.65]] },
  { level: 'animal-2', animal: 'ladybug', cuts: [[0.62, 0.17], [0.6, 0.82]] },
  { level: 'animal-3', animal: 'duck' },
  { level: 'animal-4', animal: 'turtle' },
  { level: 'animal-5', animal: 'bunny' },
  { level: 'animal-6', animal: 'cat' },
  { level: 'animal-7', animal: 'butterfly', cuts: [[0.29, 0.64], [0.72, 0.64]] },
  { level: 'animal-8', animal: 'elephant' },
];

let failed = false;
const traces = [];
for (const job of JOBS) {
  const ref = `art-src/animals/${job.animal}.png`;
  const out = `art-src/animals/${job.animal}.trace.json`;
  const args = [resolve(HERE, 'trace-contour.mjs'), resolve(HERE, '..', ref), '--out', resolve(HERE, '..', out)];
  for (const [x, y] of job.cuts ?? []) args.push('--cut', `${x},${y}`);
  const run = spawnSync('node', args, { stdio: 'inherit' });
  if (run.status !== 0) {
    failed = true;
    continue;
  }
  traces.push({ job, trace: JSON.parse(readFileSync(resolve(HERE, '..', out), 'utf8')) });
}
if (failed || traces.length !== JOBS.length) {
  console.error('trace batch incomplete - not composing animals.json');
  process.exit(1);
}

const levels = traces.map(({ job, trace }) => ({
  id: job.level,
  goalArt: `/art/goal/${job.level}.webp`,
  stroke: 'line',
  strokes: trace.strokes.map((s) => s.map((p) => ({ x: p.x, y: p.y }))),
  goal: (() => {
    const last = trace.strokes[trace.strokes.length - 1];
    const p = last[last.length - 1];
    return { x: p.x, y: p.y };
  })(),
}));

const pack = {
  id: 'animals',
  badgeId: 'animals-badge',
  menuFill: '#f4a6a0',
  levels,
};
const jsonPath = resolve(HERE, '..', '..', 'src', 'packs', 'data', 'animals.json');
writeFileSync(jsonPath, `${JSON.stringify(pack, null, 2)}\n`);
console.log(`composed ${levels.length} levels -> ${jsonPath}`);
