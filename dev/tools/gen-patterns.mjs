// tools/gen-patterns.mjs — patterns-pack art batch: generates every new raw in
// one resumable run. Existing raws are skipped, so a quota-interrupted batch
// can simply be re-run. Object-per-motif mapping (spec FR6, locked at art
// review): pattern-1 yo-yo · pattern-2 hula hoop · pattern-3 jump rope (loops)
// · pattern-4 snail · pattern-5 pinwheel · pattern-6 rose (spirals) ·
// pattern-7 step ladder · pattern-8 slide steps · pattern-9 treehouse ladder
// (stairs). The playground & garden set doubles as the reward objects.
// usage (any cwd): node dev/tools/gen-patterns.mjs
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)); // dev/tools

const SUFFIX =
  "cute kawaii children's illustration sticker, thick dark navy blue outlines, flat pastel colors, simple white highlight shapes, centered on pure white background, no text, no shadow";

const JOBS = [
  // reward objects — one per level (spec FR6 mapping)
  { out: 'obj-yoyo', prompt: 'a round wooden spinning toy disc with a white string wound around its axle, pastel red and cream, flat disc shape' },
  { out: 'obj-hoop', prompt: 'a big striped toy ring standing upright with wide bands in pastel teal and yellow' },
  { out: 'obj-rope', prompt: 'a coiled jump rope with wooden handles in pastel blue with a soft heart-shaped loop' },
  { out: 'obj-snail', prompt: 'a cheerful garden snail with a round swirly spiral shell in pastel orange' },
  { out: 'obj-pinwheel', prompt: 'a paper pinwheel windmill toy on a stick with four pastel rainbow blades' },
  { out: 'obj-rose', prompt: 'a blooming pink garden flower with layered petals swirling into a round spiral and two green leaves' },
  { out: 'obj-ladder', prompt: 'a small wooden step ladder with wide flat rungs in pastel yellow' },
  { out: 'obj-slide', prompt: "a playground slide's step ladder side with wide flat steps in pastel green" },
  { out: 'obj-treehouse', prompt: 'a wooden treehouse ladder leaning on a branch, wide flat rungs, pastel brown and green' },
  // pack badge
  {
    out: 'badge',
    prompt:
      'a shiny round achievement badge with a thick navy blue border and a chunky navy blue loop, spiral, and zigzag stair shape in the center, small golden stars around the rim',
  },
];

let failed = 0;
let consecutive = 0;
for (const job of JOBS) {
  const rel = `art-src/patterns/raw/${job.out}.png`;
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
