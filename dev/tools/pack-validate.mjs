// `pnpm pack:check` — validates every pack JSON file in `src/packs/data/`
// through the same parser the app loads at runtime. Must run under Vitest
// (Node's native TS type-stripping cannot resolve the repo's extensionless
// imports). Exits non-zero with per-file/per-level problems on failure.
import { spawnSync } from 'node:child_process';

const result = spawnSync(
  process.execPath,
  ['./node_modules/vitest/vitest.mjs', 'run', 'dev/tools/pack-validate.test.ts'],
  { stdio: 'inherit' },
);

process.exit(result.status ?? 1);
