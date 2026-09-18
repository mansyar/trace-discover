// tools/gen-shapes.mjs — shapes-pack art batch: generates every new raw in one
// resumable run. Existing raws are skipped, so a quota-interrupted batch can
// simply be re-run. Object-per-shape mapping (spec, locked):
// circle→ball · square→window · triangle→tent · oval→egg · diamond→kite ·
// heart→heart balloon · star→night-sky star · plus→airplane.
// usage (any cwd): node dev/tools/gen-shapes.mjs
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)); // dev/tools

const SUFFIX =
  "cute kawaii children's illustration sticker, thick dark navy blue outlines, flat pastel colors, simple white highlight shapes, centered on pure white background, no text, no shadow";

const JOBS = [
  // reward objects — one per shape (spec mapping)
  { out: 'obj-ball', prompt: 'a colorful striped toy ball in pastel red, white, and blue' },
  { out: 'obj-window', prompt: 'a cheerful round-paned house window with a white frame and a flower box' },
  { out: 'obj-tent', prompt: 'a cozy striped camping tent in soft teal with a warm glow inside' },
  { out: 'obj-egg', prompt: 'a single smooth cream-colored egg' },
  { out: 'obj-kite', prompt: 'a diamond-shaped kite in red and yellow with a long ribbon tail' },
  { out: 'obj-balloon', prompt: 'a shiny red heart-shaped balloon with a curly white string' },
  { out: 'obj-star', prompt: 'a chunky smiling golden star with soft rounded points' },
  { out: 'obj-plane', prompt: 'a cheerful toy airplane with rounded wings in sky blue and red' },
  // pack badge
  {
    out: 'badge',
    prompt:
      'a shiny round achievement badge with a thick navy blue border and a chunky navy blue circle, triangle, and square in the center, small golden stars around the rim',
  },
];

let failed = 0;
let consecutive = 0;
for (const job of JOBS) {
  const rel = `art-src/shapes/raw/${job.out}.png`;
  const file = resolve(HERE, '..', rel);
  if (existsSync(file)) {
    console.log(`skip ${file} (exists)`);
    continue;
  }
  const prompt = `${job.prompt}, ${job.suffix ?? SUFFIX}`;
  const args = [resolve(HERE, 'gen.mjs'), '--prompt', prompt, '--out', rel];
  const run = spawnSync('node', args, { stdio: 'inherit' });
  if (run.status !== 0) {
    consecutive++;
    failed = 1;
    console.log(`FAILED ${file} (consecutive: ${consecutive})`);
    if (consecutive >= 3) {
      console.log('3 consecutive failures - stopping (likely quota).');
      break;
    }
  } else {
    consecutive = 0;
  }
}
process.exit(failed);
