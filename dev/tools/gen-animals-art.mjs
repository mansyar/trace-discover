// tools/gen-animals-art.mjs — animals reward-art raws: 8 mini-habitat goal
// scenes (animal visible at the goal, spec-locked) + the paw-print badge.
// Stickers reuse the Phase 1 reference cutouts; the card is composed from
// cutouts (animals-compose.mjs). Resumable: skips raws already on disk and
// stops the batch after 3 consecutive failures. usage: node dev/tools/gen-animals-art.mjs
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.resolve(HERE, '..', 'art-src', 'animals', 'raw');
fs.mkdirSync(RAW, { recursive: true });

const SUFFIX =
  "cute kawaii children's illustration for toddlers, thick dark navy blue outlines, flat pastel colors, simple rounded shapes, all elements touching each other, centered and filling the frame, plain pure white background, no text, no letters, no shadow";

const JOBS = [
  ['goal-fish', 'a happy little fish swimming in a small round pond with one lily pad'],
  ['goal-ladybug', 'a happy ladybug sitting on a big green leaf with two tiny flowers'],
  ['goal-duck', 'a happy duckling standing at the edge of a small pond with three reeds'],
  ['goal-turtle', 'a happy turtle sitting on a small grassy mound with one tiny bush'],
  ['goal-bunny', 'a happy bunny sitting on grass with two carrots'],
  ['goal-cat', 'a cheerful little cat sitting on a soft round striped cushion'],
  ['goal-butterfly', 'a happy butterfly above two big flowers'],
  ['goal-elephant', 'a happy baby elephant standing on a grassy mound with one little palm leaf'],
  [
    'badge',
    'a round craft badge medallion with a cute paw print in the center, coral cream and navy blue colors, scalloped edge',
  ],
];

let consecutiveFailures = 0;
for (const [name, subject] of JOBS) {
  const out = path.join(RAW, `${name}.png`);
  if (fs.existsSync(out)) {
    console.log(`skip ${name} (exists)`);
    continue;
  }
  const result = spawnSync(
    'node',
    [
      path.join(HERE, 'gen.mjs'),
      '--prompt',
      `${subject}, ${SUFFIX}`,
      '--out',
      `art-src/animals/raw/${name}.png`,
    ],
    { stdio: 'inherit' },
  );
  if (result.status === 0 && fs.existsSync(out)) {
    consecutiveFailures = 0;
    console.log(`ok ${name}`);
  } else {
    consecutiveFailures++;
    console.error(`fail ${name}`);
    if (consecutiveFailures >= 3) {
      console.error('stopping after 3 consecutive failures');
      process.exit(1);
    }
  }
}
console.log('gen-animals-art complete');
