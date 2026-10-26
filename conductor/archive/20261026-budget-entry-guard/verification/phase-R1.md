# Phase R1 verification — Review Fixes

- **Track:** 20261026-budget-entry-guard — The payload budget's entry ceiling no longer measures anything
- **Phase:** R1 — Review Fixes
- **Date:** 2026-10-26
- **Branch:** `fix/20261026-budget-entry-guard`
- **Base:** `7725fbd`
- **Head:** `fa84cd3`
- **Result:** verified

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| unit (targeted) | `pnpm exec vitest run dev/tools/dist-budget.test.ts` | 0 | 15 tests passed (10 → 15) |
| budget (real tree) | `node dev/tools/dist-budget.mjs` | 0 | `entries 197 / 200 - PASS`, total 5,564,592 / 6,000,000 B |
| budget (mixed case) | `node dev/tools/dist-budget.mjs --entries 196` | 1 | `total … - PASS` **and** `FAIL entries 197 > 196 shipped files` |
| static | `CI=true pnpm check` | 0 | Biome clean on 143 files, `tsc --noEmit` clean |
| data | `pnpm pack:check` | 0 | Pack JSON clean |
| unit + coverage | `CI=true pnpm test --coverage` | 0 | 67 files / **933 tests**; coverage unchanged at 82.12 / 83.33 / 93.7 / 81.79 |
| build | `pnpm build` | 0 | PWA build clean |
| budget (gate) | `pnpm budget` | 0 | `entries 197 / 200 - PASS` |

## Findings resolved

| ID | Severity | Fix | Test |
| --- | --- | --- | --- |
| F1 | Medium | `distDir(argv)` requires a value, rejects a `--` token, and rejects a path that exists but is not a directory — all with `dist-budget: --dist needs a directory` and exit 1. A missing path still reports the `pnpm build` hint, so NFR-3 keeps its wording. | "rejects a bare --dist instead of measuring the working directory" (exit 1, no stdout measurement) and "rejects a --dist value that is a file" |
| F2 | Low | `budgetFailures` now returns a message per ceiling (`null` where it holds); `main` reports each ceiling on its own line and exits 1 on either. | "reports the byte ceiling independently of a breached entry count" (mixed pass/fail) |
| F3 | Low | `--total` and the non-integer flag path are now covered. | "fails the byte ceiling through --total" and "rejects a non-integer ceiling value" |

## Evidence paths

- Commit `fa84cd3` — the fix commit.
- `dev/tools/dist-budget.mjs` — `distDir()`, the per-ceiling `budgetFailures()` shape.
- `dev/tools/dist-budget.test.ts` — 15 tests.

## Deviations

- None beyond Phase 1's recorded host limitation: the primary executed this phase
  because no code-editing subagent exists here.

## Notes

- The `--dist` file-path rejection was added beyond the literal finding text; F1
  named the raw `ENOTDIR` fall-through, so rejecting a non-directory path is the
  documented half of the same root cause rather than new scope.
- `budgetFailures` is not part of the spec's contract (FR-5 names only the
  measurement), so its return shape could change without touching a requirement;
  the three original assertions were updated to the new shape and keep their
  meaning.
