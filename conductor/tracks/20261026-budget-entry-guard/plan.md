# The payload budget's entry ceiling no longer measures anything — Implementation Plan

> **Branch:** `fix/20261026-budget-entry-guard`
> **Base:** `master` @ `5e37a98d9ffcd4be45688ae6a665b7811ad43c56`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Re-point the entry ceiling at the shipped tree

- **Goal:** `pnpm budget` reports the shipped non-worker file count as its
  guarded entry metric, fails above 200, keeps the precache count
  informational, and a Vitest suite proves both directions on fixtures.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-4, FR-5, NFR-1, NFR-2, NFR-3, NFR-4, AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- **Touches:** `dev/tools/dist-budget.mjs`, `dev/tools/dist-budget.test.ts`
- **Verification:** `CI=true pnpm check && pnpm pack:check && CI=true pnpm test --coverage && pnpm build && pnpm budget`
- **Status:** verified

**Result:** verified
**Checkpoint:** e71495a
**Evidence:** conductor/tracks/20261026-budget-entry-guard/verification/phase-1.md

- [x] **P1.T1: Extract the measurement into an exported pure function** — covers: FR-5
  - [x] **P1.T1.1: Move the walk and the group/subgroup tallies into `measureDist(dir)`, returning total bytes, file count, shipped count, precache count and the group maps, keeping the existing `sw.js` / `workbox-*` exclusion.**
  - [x] **P1.T1.2: Keep the printed summary (total, group sizes, art subgroups) the same shape so CI logs stay comparable.**
- [x] **P1.T2: Guard the shipped count instead of the precache count** — covers: FR-1, FR-2
  - [x] **P1.T2.1: Fail when shipped files exceed the entry ceiling.**
  - [x] **P1.T2.2: Print the precache count on its own informational line that cannot fail the run.**
  - [x] **P1.T2.3: Report 197/200 and the 10-entry precache on the current tree.**
- [x] **P1.T3: Add the CLI seams the tests need** — covers: FR-4
  - [x] **P1.T3.1: `--dist <path>` overrides the measured directory, and a missing directory keeps the "run `pnpm build` first" error.**
  - [x] **P1.T3.2: Keep `--total` and `--entries` semantics and their integer validation.**
- [x] **P1.T4: Prove both directions with a Vitest suite** — covers: FR-5, AC-5, AC-6
  - [x] **P1.T4.1: Fixture trees of 199 and 201 non-worker files (each with a `sw.js` listing 4 entries) assert pass and exit 1 respectively, through the same measurement the CLI uses.**
  - [x] **P1.T4.2: Assert a tree with no `sw.js` still counts shipped files, and that the precache count never gates.**
- [x] **P1.T5: Document the ceiling** — covers: FR-3
  - [x] **P1.T5.1: Record 197/200 at `5e37a98` and the rule that a raise needs fresh measurements, naming what the number now bounds.**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261026-budget-entry-guard/verification/phase-1.md
-->
