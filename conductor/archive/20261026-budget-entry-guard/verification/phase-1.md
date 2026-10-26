# Phase 1 verification — Re-point the entry ceiling at the shipped tree

- **Track:** 20261026-budget-entry-guard — The payload budget's entry ceiling no longer measures anything
- **Phase:** 1 — Re-point the entry ceiling at the shipped tree
- **Date:** 2026-10-26
- **Branch:** `fix/20261026-budget-entry-guard`
- **Base:** `02b3d188af6bcc983b2e54ac9c40dd8481ce7f53`
- **Head:** `e71495a`
- **Result:** verified

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| unit (targeted) | `pnpm exec vitest run dev/tools/dist-budget.test.ts` | 0 | 10 tests passed |
| budget (real tree) | `node dev/tools/dist-budget.mjs` | 0 | `entries 197 / 200 - PASS`, `precache entries: 10`, total 5,564,592 / 6,000,000 B |
| budget (breach) | `node dev/tools/dist-budget.mjs --entries 196` | 1 | `FAIL entries 197 > 196 shipped files` |
| static | `CI=true pnpm check` | 0 | Biome clean on 143 files, `tsc --noEmit` clean |
| data | `pnpm pack:check` | 0 | Pack JSON validation clean |
| unit + coverage | `CI=true pnpm test --coverage` | 0 | **67 files / 928 tests** (was 66 / 918); coverage unchanged at 82.12 / 83.33 / 93.7 / 81.79 |
| build | `pnpm build` | 0 | PWA precache 10 entries (1144.72 KiB), `dist/sw.js` + `dist/workbox-e4022e15.js` generated |
| budget (gate) | `pnpm budget` | 0 | `entries 197 / 200 - PASS` on the fresh build; dist total unchanged at 5,564,592 B |

Phase verification command, run as written:
`CI=true pnpm check && pnpm pack:check && CI=true pnpm test --coverage && pnpm build && pnpm budget` — all five layers exited 0.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | The current tree reports `entries 197 / 200` and exits 0. | `node dev/tools/dist-budget.mjs` → `dist-budget: entries 197 / 200 - PASS`, exit 0; `pnpm budget` after a fresh build repeats it | met |
| AC-2 | `--entries 196` exits 1 with a message naming `197 > 196`. | stdout `files: 199 (shipped: 197; worker files: 2; precache entries: 10)`, stderr `dist-budget: FAIL entries 197 > 196 shipped files`, exit 1 | met |
| AC-3 | The precache count still prints on every run, labelled informational, and cannot fail a run. | `dist-budget: precache entries: 10 (informational; art and rive are warmed at runtime)`; `dist-budget.test.ts` → "never gates on the precache manifest" (300-entry manifest, 199 shipped, passes at both ceilings) and "prints the precache count as information even when it is large" (CLI exit 0) | met |
| AC-4 | The ceiling constant is 200 and its adjacent comment carries the 197 measurement and the re-anchor rule. | `dev/tools/dist-budget.mjs` — `CEIL_ENTRIES = 200` with the 2026-10-26 history entry recording 197 / 200 at `5e37a98` and the standing "raise ceilings deliberately, with fresh measurements" rule | met |
| AC-5 | Fixtures give 199/200 → 0, 201/200 → 1, and 201/250 → 0 via `--dist` and `--entries`. | `dist-budget.test.ts` — "passes at and below the entry ceiling", "fails above the entry ceiling with the shipped count in the message", "exits 1 when shipped files exceed the ceiling", "exits 0 when the override ceiling clears the shipped count" (spawns the real CLI against fixture trees) | met |
| AC-6 | `dev/tools/dist-budget.test.ts` runs inside `pnpm test` (66 → 67 files) without a build. | `CI=true pnpm test --coverage` → `Test Files 67 passed (67)`, `Tests 928 passed (928)`; the suite builds its own fixtures in `tmpdir` and needs no `dist/` | met |

Non-functional requirements:

| ID | Requirement | Evidence | Status |
| --- | --- | --- | --- |
| NFR-1 | No new dependency, no build step; plain script run after `pnpm build`. | `import` list unchanged (`node:fs`, `node:path`, `node:url`); `pnpm-lock.yaml` untouched | met |
| NFR-2 | `src/`, `vite.config.ts`, `public/` untouched; built output unchanged. | `git diff --name-only 02b3d18..HEAD` → only `dev/tools/dist-budget.mjs`, `dev/tools/dist-budget.test.ts`; `pnpm budget` total identical at 5,564,592 B after a rebuild | met |
| NFR-3 | Exit codes keep their meaning, with a clear "run `pnpm build` first" message. | 0 on pass; 1 on breach; 1 on missing directory (`dist-budget.test.ts` → "names the build step when the measured directory is missing"); 1 on a non-integer flag (unchanged `argValue`) | met |
| NFR-4 | The walk stays well under a second on the 199-file tree. | `node dev/tools/dist-budget.mjs` completes in the same interactive shell as before, with the walk limited to 199 `statSync` calls; the spawned CLI cases in the suite include process start-up and finish inside the 2.1 s suite | met |

## Evidence paths

- `dev/tools/dist-budget.mjs` — `measureDist()`, `budgetFailures()`, `precacheEntryCount()`, the `--dist` seam and the guarded entry check.
- `dev/tools/dist-budget.test.ts` — 10 tests: measurement separation, worker exclusion, no-manifest build, ceiling boundaries, manifest never gating, and three CLI exit-code cases.
- Commit `e71495a` — the phase implementation.

## Deviations

1. **Executor.** The primary wrote the code instead of a phase subagent. This host exposes no code-editing subagent (only a web researcher), so the skill's "unless a phase subagent is unavailable" fallback applied; the brief at `.conductor/runs/20261026-budget-entry-guard/phase-1-brief.md` was still written and followed, and the work stayed inside `Touches`.
2. **Output line.** The old `note - sw.js manifest count (10) differs from filesystem non-worker count (197)` line was removed; the divergence is now the normal case, and FR-2's labelled informational line replaces it. The `files:` summary now reads `shipped` / `worker files` / `precache entries` instead of `filesystem non-worker files` / `precache entries … from sw.js manifest`. The group, subgroup and total lines are unchanged in shape.
3. **Plan correction before the phase.** The phase's `Covers` omitted `NFR-1..4`; the primary added them in commit `02b3d18` (the same commit that marked the phase in progress) so the plan validates.

## Primary verification

- `CI=true pnpm check && pnpm pack:check && CI=true pnpm test --coverage && pnpm build && pnpm budget` — exit 0, run after commit `e71495a`: Biome + `tsc` clean on 143 files, pack data clean, 67 files / 928 tests with coverage thresholds met (82.12 / 83.33 / 93.7 / 81.79 against 72 / 76 / 88 / 72), build green, `entries 197 / 200 - PASS`.
- `git diff --name-only 02b3d18..HEAD` — only the two files in `Touches`; working tree clean apart from this evidence file.
- Disclosure: the primary executed the phase in this host (no code-editing subagent available), so this verification is a re-run by the author rather than an independent second agent. Called out so review can treat it accordingly.

## Notes

- One commit covers the whole phase, so the acceptance squash was a no-op: `e71495a` is already the single phase commit and its message is the phase goal.
- The ceiling stays 200 and the total stays 6,000,000 B — no re-anchor, as the spec requires.
- The 250 `maxEntries` runtime-cache relationship remains unguarded by design (spec, deferred question).
