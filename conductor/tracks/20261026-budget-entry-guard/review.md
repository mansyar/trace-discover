# Review: The payload budget's entry ceiling no longer measures anything

- **Track:** `20261026-budget-entry-guard`
- **Type:** `bug`
- **Branch:** `fix/20261026-budget-entry-guard`
- **Range:** `5e37a98..fa84cd3` (round 1 over `5e37a98..ce4a1c8`; round 2 over the `R1` delta `7725fbd..fa84cd3`)
- **Date:** `2026-10-26`
- **Verdict:** `PASS`

## Summary

The fix does what the spec asks: the entry ceiling bounds shipped files again
(197 / 200 on the real tree), the precache count is printed but cannot gate, and
the guard is provable from fixtures without a build. Volume was small — 290
insertions and 81 deletions across two files — so the whole diff was reviewed in
one pass. Three findings, none blocking by severity: one Medium in the new
`--dist` flag, and two Low covering the remaining CLI surface that FR-4 and
NFR-3 name but no test exercises. `review.strict` is on, so all three are fixed
in Phase R1 rather than deferred.

**Reviewer note.** This host exposes no read-only reviewer subagent (only a web
researcher), so the review was a read-only pass by the primary agent against the
same brief a reviewer would receive. That is weaker evidence than a second
agent; it is disclosed here and in the phase evidence so the PR does not claim
an independent review.

**Round 2.** All three findings are fixed in `fa84cd3` and proven by five new
CLI tests (15 in the suite, up from 10): both `--dist` rejections, the mixed
pass/fail report, a `--total` breach and a non-integer ceiling value. Nothing in
round 1 survives, no new finding was introduced by the delta, and the gate is
green at 67 files / 933 tests with coverage unchanged at 82.12 / 83.33 / 93.7 /
81.79. FR-4 and NFR-3 move from `partial` to `covered`.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `CI=true pnpm test` | pass | 67 files / 928 tests |
| coverage | `CI=true pnpm test --coverage` | pass | 82.12 / 83.33 / 93.7 / 81.79 against 72 / 76 / 88 / 72 |
| lint | `pnpm exec biome check .` | pass | 143 files |
| format | `pnpm exec biome format .` | pass | 143 files, no fixes |
| typecheck | `pnpm exec tsc --noEmit` | pass | clean |
| build | `pnpm build` | pass | `sw.js` + `workbox-e4022e15.js`, 10 precache entries |
| budget | `pnpm budget` | pass | `entries 197 / 200 - PASS`, 5,564,592 / 6,000,000 B |
| data | `pnpm pack:check` | pass | all pack JSON |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1, P1.T2 | real-tree run (`197 / 200`) + `dist-budget.test.ts` boundary and CLI breach tests | covered |
| FR-2 | P1.T2.2 | `dist-budget.test.ts` "never gates on the precache manifest" and "prints the precache count as information even when it is large" | covered |
| FR-3 | P1.T5.1 | `dev/tools/dist-budget.mjs` ceiling comment, read in this review | covered |
| FR-4 | P1.T3 | `--entries`, `--dist` and `--total` CLI tests, plus the two `--dist` rejections | covered |
| FR-5 | P1.T1 | exported `measureDist` exercised by every unit test | covered |
| NFR-1 | P1.T1 | import list unchanged, both lockfiles untouched | covered |
| NFR-2 | whole phase | `git diff --name-only 5e37a98..HEAD -- . ':!conductor'` → two `dev/tools/` files; dist total identical | covered |
| NFR-3 | P1.T3.1 | exit 0 / 1 / 1-missing-dir / 1-bad-flag tested, each with its message | covered |
| NFR-4 | whole phase | measured 0.107–0.118 s end to end, three runs | covered |
| AC-1 | P1.T2 | `node dev/tools/dist-budget.mjs` → `entries 197 / 200 - PASS` | covered |
| AC-2 | P1.T2 | `--entries 196` → exit 1, `FAIL entries 197 > 196 shipped files` | covered |
| AC-3 | P1.T2.2 | informational line on every run; 300-entry manifest passes | covered |
| AC-4 | P1.T5.1 | `CEIL_ENTRIES = 200` with the 2026-10-26 history entry | covered |
| AC-5 | P1.T4 | fixture trees 199/200/201 through the real CLI | covered |
| AC-6 | P1.T4 | gate run reports 67 files / 928 tests without a build | covered |

## Findings

### Critical

- none

### High

- none

### Medium

- **F1 — `--dist` with no value silently measures the current directory**
  - **File:** `dev/tools/dist-budget.mjs:146`
  - **What:** `path.resolve(argv[distFlag + 1] ?? '')` resolves a missing value
    to the process's working directory. Reproduced in a scratch directory with
    one 2-byte file: `node dev/tools/dist-budget.mjs --dist` printed
    `dist-budget: ` with `files: 1 … total: 2 B` and exited 0 — a bogus
    measurement presented as a passing budget. Run from the repository root it
    would walk `node_modules` and report a failure against the ceilings with no
    hint that the flag was malformed. A path that is a file rather than a
    directory falls through to a raw `ENOTDIR` message instead of the "run
    `pnpm build` first" hint.
  - **Why:** a mistyped or truncated flag produces a confident, wrong verdict
    instead of a usage error — the exact failure mode this track exists to
    remove from the guard.
  - **Fix:** require a value; reject a token starting with `--` and reject a path
    that is not a directory, both with `dist-budget: --dist needs a directory`
    on stderr and exit 1.
  - **Requirement:** FR-4, NFR-3
  - **Test gap:** add a CLI case asserting exit 1 and the message for a bare
    `--dist` on a small fixture.
  - **Status:** fixed in `fa84cd3` — `distDir()` rejects a missing value, a `--`
    token and a non-directory path; two tests cover the bare flag and a file.

### Low

- **F2 — a passing ceiling's PASS line disappears when the other ceiling fails**
  - **File:** `dev/tools/dist-budget.mjs:187`
  - **What:** the `if (failures.length === 0) { … } else { … }` shape prints both
    PASS lines only when nothing fails, so a run that breaches entries no longer
    reports the byte total against its ceiling — the pre-fix tool printed each
    ceiling independently. The header still carries the byte figure, so this is
    a diagnostics loss, not a wrong verdict.
  - **Why:** CI logs are the only trail for a budget failure; losing the passing
    line makes triage slightly slower and changes the output contract more than
    the spec's "keep the summary shape" implies.
  - **Fix:** evaluate each ceiling for output independently and derive the exit
    code from the union of failures.
  - **Requirement:** NFR-3
  - **Test gap:** assert that a tree over the entry ceiling but under the byte
    ceiling still prints `total … - PASS`.
  - **Status:** fixed in `fa84cd3` — `budgetFailures` returns one message per
    ceiling and `main` reports each independently; a mixed-case test asserts it.

- **F3 — `--total` and the non-integer flag path are named by the spec but unexercised**
  - **File:** `dev/tools/dist-budget.test.ts` (suite)
  - **What:** FR-4 says `--total` keeps its meaning and NFR-3 says a bad flag
    exits 1, but the suite only drives `--dist` and `--entries`. A regression in
    the `--total` override or in `argValue`'s validation would not be caught.
  - **Why:** the ceiling-override surface is small enough that an untested flag
    is likely to rot; the fix is two assertions.
  - **Fix:** add a CLI case where `--total` is breached on a fixture, and one
    where `--entries` receives a non-integer value and exits 1 with the usage
    message.
  - **Requirement:** FR-4, NFR-3
  - **Test gap:** the two cases above.
  - **Status:** fixed in `fa84cd3` — "fails the byte ceiling through --total"
    and "rejects a non-integer ceiling value".

## Overrides

- none

## Plan compliance

- One phase, five tasks, eleven items including sub-tasks — every one marked
  `[x]`, with `Result: verified`, `Checkpoint: e71495a` and an evidence path.
- The final code diff stays inside the union of `Touches`
  (`dev/tools/dist-budget.mjs`, `dev/tools/dist-budget.test.ts`); the
  `tech-stack.md` change is the documented post-phase sync, not code.
- The three recorded deviations in `verification/phase-1.md` (primary as
  executor, the reworded summary/informational lines, the `Covers` correction)
  were reviewed and accepted: the first is a host limitation, the second is the
  FR-2 contract, the third was necessary for the plan to validate.
- No task was dropped and no phase reports work it did not do.

## Out of scope

- The `maxEntries: 250` runtime content cache remains unguarded. The spec
  records it as a deferred question and this review does not reopen it; it
  belongs in its own track, ideally together with gating `qa-offline` in CI.

## Debt

- none — `review.strict: true`, so every in-scope finding is fixed in Phase R1.

## Doc sync

`pending` — the post-review sync follows the fix phase.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 1 | 2 | 0 |
| 2 | PASS | 0 | 0 | 0 | 0 | 3 |
