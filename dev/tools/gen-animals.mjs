// tools/gen-animals.mjs — animals-pack reference batch: generates every raw in
// one resumable run. Existing raws are skipped, so a quota-interrupted batch
// can simply be re-run. References are side-view full-body silhouettes; the
// contour tracer (trace-contour.mjs) turns their outlines into tracing paths.
// usage (any cwd): node dev/tools/gen-animals.mjs
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)); // dev/tools

const SUFFIX =
  "cute kawaii children's illustration sticker, thick dark navy blue outlines, flat pastel colors, full body in side view, facing right, standing on a plain pure white background, no text, no shadow";

const JOBS = [
  { out: 'fish', prompt: 'a cute smiling fish with a rounded teardrop body and one big tail fin' },
  { out: 'ladybug', prompt: 'a cute little ladybug with a big round dome shell and a small head' },
  { out: 'duck', prompt: 'a cute yellow duckling bird with a round body, small orange beak, and a little wing' },
  { out: 'turtle', prompt: 'a cute standing turtle with a domed shell, a small head, and four stubby legs' },
  { out: 'bunny', prompt: 'a cute sitting bunny rabbit with two long upright ears and a round body' },
  { out: 'cat', prompt: 'a cute sitting cat with two triangular ears, a rounded body, and a curled tail' },
  { out: 'butterfly', prompt: 'a cute butterfly seen from above with four symmetric spread wings, two big upper wings and two small lower wings, a slim body in the middle, no face' },
  { out: 'elephant', prompt: 'a cute standing elephant with a big rounded body and a long trunk curling down' },
];

let failed = 0;
let consecutive = 0;
for (const job of JOBS) {
  const rel = `art-src/animals/raw/${job.out}.png`;
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
