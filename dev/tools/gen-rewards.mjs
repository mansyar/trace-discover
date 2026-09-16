// tools/gen-rewards.mjs — Phase 4 art batch: generates every new raw in one
// resumable run. Existing raws are skipped, so a quota-interrupted batch can
// simply be re-run. usage: node dev/tools/gen-rewards.mjs
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SUFFIX =
  "cute kawaii children's illustration sticker, thick dark navy blue outlines, flat pastel colors, simple white highlight shapes, centered on pure white background, no text, no shadow";

const JOBS = [
  { out: 'pre-1', prompt: 'a short pink wax crayon with a blue paper sleeve, art supply for kids' },
  { out: 'pre-2', prompt: 'a shallow puddle of water with gentle circular ripples, soft blue' },
  { out: 'pre-3', prompt: 'a small rainbow arc, half circle with three pastel bands' },
  { out: 'pre-4', prompt: 'a chunky little lightning bolt, rounded corners, soft yellow' },
  { out: 'pre-5', prompt: 'a friendly yellow pencil with a pink eraser' },
  { out: 'pre-6', prompt: 'two rolling waves with white foam curls' },
  { out: 'pre-7', prompt: 'a rainbow with two small clouds at its feet' },
  { out: 'pre-8', prompt: 'a soft grey-blue storm cloud with one warm yellow lightning bolt' },
  { out: 'pre-9', prompt: 'a wide straight little road, grey tarmac with a white dashed center line' },
  { out: 'pre-10', prompt: 'a big curling ocean wave, soft blue and teal, white foam' },
  { out: 'pre-11', prompt: 'a grand full rainbow with a small sun and two clouds' },
  { out: 'pre-12', prompt: 'a big double lightning bolt, yellow and orange crossed' },
  { out: 'pre-bonus-1', prompt: 'a striped beach ball, pastel red white and blue' },
  { out: 'pre-bonus-2', prompt: 'a smiling sun with scalloped rays, warm yellow' },
  { out: 'pre-bonus-3', prompt: 'a gold medal with red ribbon and a star stamp' },
  {
    out: 'pre-badge',
    prompt:
      'a round golden achievement badge with a bold wavy crayon trail and a small crayon crossing it, shiny',
  },
  {
    out: 'pre-card',
    prompt:
      'a bold wavy crayon line with guide dots from left to right, a small yellow pencil at the start, playful',
  },
  {
    out: 'bg-star',
    prompt:
      "gentle starry dusk sky, soft indigo and violet gradient, big friendly pale moon up high, scattered small golden stars, dreamy calm pastel children's book background, no characters, no text, no shadow",
  },
];

let failed = 0;
let consecutive = 0;
const DEV = fileURLToPath(new URL('..', import.meta.url));
for (const job of JOBS) {
  const file = `${DEV}/gen/${job.out}.png`;
  if (existsSync(file)) {
    console.log(`skip gen/${job.out}.png (exists)`);
    continue;
  }
  const prompt = job.out === 'bg-star' ? job.prompt : `${job.prompt}, ${SUFFIX}`;
  const args = [`${DEV}/tools/gen.mjs`, '--prompt', prompt, '--out', file];
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
