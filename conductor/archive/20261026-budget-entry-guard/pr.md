## Summary

`pnpm budget` guards the offline bundle with a byte ceiling (6,000,000 B) and an entry ceiling (200). The byte ceiling worked; the entry ceiling compared the service worker's **precache manifest** — 10 entries — against a ceiling that had been raised to 200 for a **177-file** art batch. Every file that left the precache when `art/` and `rive/` moved to the runtime cache (`globIgnores`, 2026-09-24) became invisible to it, leaving roughly 190 slots of the ceiling unreachable. The ceiling now bounds **shipped files in `dist/`** again — 197 / 200 measured on this branch — and the precache count is still printed, explicitly labelled informational and unable to gate. No app, asset or output change: the rebuilt tree is the same 197 files and 5,564,592 B.

## Track

- **ID:** `20261026-budget-entry-guard`
- **Type:** `bug`
- **Spec:** [`conductor/archive/20261026-budget-entry-guard/spec.md`](conductor/archive/20261026-budget-entry-guard/spec.md)
- **Plan:** [`conductor/archive/20261026-budget-entry-guard/plan.md`](conductor/archive/20261026-budget-entry-guard/plan.md)
- **Review:** [`conductor/archive/20261026-budget-entry-guard/review.md`](conductor/archive/20261026-budget-entry-guard/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Re-point the entry ceiling at the shipped tree | The guard bounds shipped files, the precache count stays informational, and fixtures prove both directions | verified | `e71495a` | Executed by the primary (no code-editing subagent in this host); the old divergence note was replaced by the labelled informational line |
| R1: Review Fixes | Resolve F1–F3 from review round 1 | verified | `fa84cd3` | A bare `--dist` no longer measures the working directory; each ceiling reports on its own line; `--total` and the bad-flag path are now tested |

## Requirements

- [x] `FR-1` — the guarded entry metric is the non-worker file count, and the run fails above the ceiling (`dev/tools/dist-budget.test.ts`)
- [x] `FR-2` — the precache count still prints, labelled informational, and never gates (`dev/tools/dist-budget.test.ts`)
- [x] `FR-3` — the ceiling stays 200 with a comment recording 197 / 200 at `5e37a98` (`dev/tools/dist-budget.mjs`)
- [x] `FR-4` — `--entries` and `--dist` override, `--total` keeps its meaning, each with validation (`dev/tools/dist-budget.test.ts`)
- [x] `FR-5` — the measurement is an exported pure function, so tests need no build (`dev/tools/dist-budget.mjs`)
- [x] `NFR-1` — no new dependency, no build step; still a plain `node` script after `pnpm build`
- [x] `NFR-2` — `src/`, `vite.config.ts` and `public/` untouched; dist total unchanged at 5,564,592 B
- [x] `NFR-3` — exit codes keep their meaning, with messages for a missing directory, a bad flag and a bad `--dist`
- [x] `NFR-4` — 0.107–0.118 s end to end on the 199-file tree
- [x] `AC-1` — the current tree reports `entries 197 / 200` and exits 0
- [x] `AC-2` — `--entries 196` exits 1 with `FAIL entries 197 > 196 shipped files`
- [x] `AC-3` — the precache count prints on every run and cannot fail a run (a 300-entry manifest passes)
- [x] `AC-4` — the ceiling constant is 200 with the dated measurement and the re-anchor rule beside it
- [x] `AC-5` — fixtures give 199/200 → 0, 201/200 → 1, 201/250 → 0 through the real CLI
- [x] `AC-6` — the suite runs inside `pnpm test` (66 → 67 files) without a build

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| static | `CI=true pnpm check` | pass | Biome clean on 143 files, `tsc --noEmit` clean |
| data | `pnpm pack:check` | pass | all pack JSON validates |
| unit + coverage | `CI=true pnpm test --coverage` | pass | **67 files / 933 tests**; 82.12 / 83.33 / 93.7 / 81.79 against 72 / 76 / 88 / 72 |
| build | `pnpm build` | pass | `sw.js` + `workbox-*.js`, 10 precache entries |
| budget | `pnpm budget` | pass | `entries 197 / 200 - PASS`, 5,564,592 / 6,000,000 B |
| behavior | `node dev/tools/dist-budget.mjs --entries 196` | exit 1 | `total … - PASS` plus `FAIL entries 197 > 196 shipped files` |

Gate evidence: [`conductor/archive/20261026-budget-entry-guard/verification/integrated.md`](conductor/archive/20261026-budget-entry-guard/verification/integrated.md). The new suite is [`dev/tools/dist-budget.test.ts`](dev/tools/dist-budget.test.ts) — 15 tests covering the measurement, the ceilings and every CLI exit path.

## Review

- **Verdict:** `PASS`
- **Rounds:** 2
- **Fixed:** 3 findings (1 Medium, 2 Low) in `fa84cd3`
- **Accepted/deferred:** 0

## Deviations and risks

- **No phase subagent or independent reviewer exists in this host** (only a web researcher), so the primary wrote the phase and reviewed it read-only. The report says so explicitly rather than claiming an independent review; a human glance at the diff is the compensating control.
- **Output lines changed**: the `files:` summary now reads `shipped` / `worker files` / `precache entries`, and the old "precache count differs" note is gone — divergence is the normal case, and FR-2's labelled informational line replaces it. Group, subgroup and total lines keep their shape.
- **Ceiling left at 200 deliberately.** No re-anchor: the point of the track was to make the existing ceiling bind the right quantity, not to change the budget.
- **Risk:** low. Dev tooling only, no runtime code, no dependency, no asset, byte total identical.

## Follow-ups

- The `maxEntries: 250` cap on the runtime content cache is still unrelated to any guard (187 art+Rive entries sit 63 below it). The spec records it as a deferred question; it wants its own track, ideally together with gating `qa-offline` in CI. Not filed as an issue from this track.

## Rollback

```bash
# Squash commit
git revert --no-edit <squash-commit>
```

No migration, flag or data rollback: reverting restores the precache-manifest reading of the entry ceiling. The ceilings themselves are unchanged in both directions.
