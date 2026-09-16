// tools/gen-letters.mjs — Phase 4 letters art batch: generates every new raw in
// one resumable run. Existing raws are skipped, so a quota-interrupted batch can
// simply be re-run. usage (cwd spike): node tools/gen-letters.mjs
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const SUFFIX =
  "cute kawaii children's illustration sticker, thick dark navy blue outlines, flat pastel colors, simple white highlight shapes, centered on pure white background, no text, no shadow";

const LETTER_SUFFIX =
  "chunky puffy style, bright yellow with a dark blue outline, on a plain white background";

const JOBS = [
  // reward objects — one per letter (content.md object list)
  { out: 'obj-a', prompt: 'a shiny red apple with a small green leaf' },
  { out: 'obj-b', prompt: 'a colorful striped ball in pastel red, white, and blue' },
  { out: 'obj-c', prompt: 'a cute orange kitten sitting with a friendly face' },
  { out: 'obj-d', prompt: 'a cute yellow duckling standing' },
  { out: 'obj-e', prompt: 'a single smooth cream-colored egg' },
  { out: 'obj-f', prompt: 'a cute orange goldfish with flowing fins' },
  { out: 'obj-g', prompt: 'a bunch of purple grapes with a green leaf' },
  { out: 'obj-h', prompt: 'a soft yellow sun hat with a red ribbon band' },
  { out: 'obj-i', prompt: 'a strawberry ice cream cone with rainbow sprinkles' },
  { out: 'obj-j', prompt: 'a cute pink jellyfish with wavy tentacles' },
  { out: 'obj-k', prompt: 'a diamond-shaped kite in red and yellow with a long ribbon tail' },
  { out: 'obj-l', prompt: 'a cute red ladybug with black spots' },
  { out: 'obj-m', prompt: 'a smiling crescent moon, soft pale yellow with a sleepy happy face' },
  { out: 'obj-n', prompt: 'a cozy little bird nest with three small blue eggs' },
  { out: 'obj-o', prompt: 'a shiny orange fruit with a green leaf' },
  { out: 'obj-p', prompt: 'a cute baby penguin standing, black and white with an orange beak' },
  { out: 'obj-q', prompt: 'a friendly little queen with a golden crown and a pastel pink dress' },
  { out: 'obj-r', prompt: 'a red and white toy rocket ship with a round window' },
  { out: 'obj-s', prompt: 'a smiling sun with rounded petal-like rays, warm yellow' },
  { out: 'obj-t', prompt: 'a cute green turtle with a patterned shell' },
  { out: 'obj-u', prompt: 'an open red umbrella with white polka dots' },
  { out: 'obj-v', prompt: 'a pastel blue toy delivery van' },
  { out: 'obj-w', prompt: 'a friendly blue whale spouting a small water fountain' },
  { out: 'obj-x', prompt: 'a colorful toy xylophone with two mallets' },
  { out: 'obj-y', prompt: 'a red toy yo-yo with a string' },
  { out: 'obj-z', prompt: 'a cute baby zebra with black and white stripes' },
  // menu card letters (composited into "A B C" like the numerals' "1 2 3")
  { out: 'letter-a', prompt: "a big cartoon letter A for a children's alphabet", suffix: LETTER_SUFFIX },
  { out: 'letter-b', prompt: "a big cartoon letter B for a children's alphabet", suffix: LETTER_SUFFIX },
  { out: 'letter-c', prompt: "a big cartoon letter C for a children's alphabet", suffix: LETTER_SUFFIX },
  // bonus word scenes
  {
    out: 'bonus-1',
    prompt: 'a red apple, a colorful ball, and a cute orange kitten sitting together in a row as friends',
  },
  { out: 'bonus-2', prompt: 'a mother duck with two little ducklings following her, warm and loving' },
  { out: 'bonus-3', prompt: 'a friendly lion, a smiling elephant, and a playful monkey standing together' },
  // pack badge
  {
    out: 'badge',
    prompt:
      'a shiny round achievement badge with a thick navy blue border and the chunky letters ABC in navy blue in the center, small golden stars around the rim',
  },
];

let failed = 0;
let consecutive = 0;
for (const job of JOBS) {
  const file = `abc/raw/${job.out}.png`;
  if (existsSync(file)) {
    console.log(`skip ${file} (exists)`);
    continue;
  }
  const prompt = `${job.prompt}, ${job.suffix ?? SUFFIX}`;
  const args = ['tools/gen.mjs', '--prompt', prompt, '--out', file];
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
