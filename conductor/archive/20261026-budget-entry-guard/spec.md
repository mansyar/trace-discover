# The payload budget's entry ceiling no longer measures anything — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

`pnpm budget` guards the offline bundle with two ceilings: total bytes
(6,000,000 B) and entry count (200). The byte ceiling works. The entry ceiling
compares the service worker's **precache manifest** — 10 entries — against a
ceiling raised to 200 for a **177-file** art batch. Every file that has since
moved out of the precache (all of `art/**` and `rive/**`, by deliberate
`globIgnores`) is invisible to it. This track makes the ceiling bound the
shipped dist tree again: the set it was anchored on, the set that grows with
content, and the set the runtime content cache must hold. No app code, asset or
output changes.

## Problem / Motivation

Measured on `master` at `5e37a98`:

- `dist` holds **199** files: 181 `art/`, 6 `rive/`, 3 hashed `assets/`,
  4 `icons/`, 3 root (`index.html`, `manifest.webmanifest`, `registerSW.js`),
  plus `sw.js` and one `workbox-*.js`.
- **197** are non-worker files — what the app ships and caches.
- `pnpm budget` reports `entries 10 / 200 — PASS`; the 10 are `sw.js`'s
  precache manifest.
- Every anchor recorded in `dev/tools/dist-budget.mjs` is a count of shipped
  files: 150 post-diet, 170 for shapes ("156 entries"), 200 for animals
  ("177 entries"), and the payload-headroom note "3 entry slots remain" at 197.
- `vite.config.ts` explains the collapse: `globIgnores: ['**/art/**',
  '**/rive/**']` — "Keeping them out of the precache manifest is the entry-count
  reduction". Art and Rive are warmed into the runtime cache after boot instead.

So the ceiling carries roughly 190 slots of slack against the quantity it
bounds. A 20-file art or Rive batch plus the three remaining slots would exceed
200 shipped files and still pass CI.

Who feels it: the owner, whenever a pack's art batch lands — the next pack, a
replacement backdrop, a re-exported `.riv`. Total bytes still bound size
(5,564,592 / 6,000,000 B), so the failure mode is not a bloated download but an
unguarded file count. It matters because the runtime content cache holding art
caps at `maxEntries: 250`, which 187 art+Rive files sit 63 below;
`dev/qa/qa-offline.mjs` compares cached content against
`countShippedContentFiles()` and would notice an overflow, but it is not part of
the CI gate, so this tool is the pipeline's only automated count check.

## Goals & Success Metrics

- **Goal:** the entry ceiling fails the build when the shipped file count
  exceeds it.
- **Metric:** on the current tree `pnpm budget` reports 197 and passes;
  `--entries 196` exits 1; a 201-file fixture exits 1.

## Scope

### In Scope

- Which quantity the guarded entry metric measures in `dev/tools/dist-budget.mjs`.
- The informational precache line and the ceiling's documenting comment.
- A Vitest suite for the measurement under `dev/tools/`, plus the `--dist` seam
  it needs.

### Out of Scope

- Raising, lowering or re-anchoring 200.
- Guarding the 250 `maxEntries` runtime-cache cap, or adding the offline probe
  to CI.
- The precache globs, `vite.config.ts`, any app, asset or dist change.

## Bug Details

- **Reproduction steps:**
  1. `pnpm build`
  2. `pnpm budget` → `entries 10 / 200 - PASS`
  3. `find dist -type f ! -name 'sw.js' ! -name 'workbox-*.js' | wc -l` → `197`
- **Expected behavior:** the guarded entries number is 197, and a tree above 200
  fails.
- **Actual behavior:** it is 10, so about 190 slots of the ceiling are
  unreachable.
- **Root-cause hypothesis:** `entries` is assigned from the `url:"` matches in
  `dist/sw.js` whenever that file exists; `globIgnores` has since removed art and
  Rive from that manifest, so the number stopped tracking content.
- **Regression test:** a fixture dist with 201 shipped files whose `sw.js` lists
  4 entries must exit 1. Today the same tree exits 0 — that is the failing
  assertion the fix must flip.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | The guarded entry metric is the count of non-worker files in the measured dist directory; the run fails when it exceeds the entry ceiling. | must |
| FR-2 | The precache manifest count is still printed, explicitly labelled informational, and never fails the run. | must |
| FR-3 | The ceiling stays 200; its comment records 197/200 measured at `5e37a98` and that a raise needs fresh measurements. | must |
| FR-4 | `--entries` overrides the guarded ceiling and `--dist` overrides the measured directory, so a fixture can prove the guard trips; `--total` keeps its meaning. | must |
| FR-5 | The measurement is an exported pure function, so tests need no build and no real `dist/`. | should |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No new dependency, no TypeScript build step: `node dev/tools/dist-budget.mjs` stays a plain script that CI runs after `pnpm build`. |
| NFR-2 | `src/`, `vite.config.ts` and `public/` are untouched, and the built output is unchanged. |
| NFR-3 | Exit codes keep their meaning: 0 pass, 1 for a breached ceiling, 1 for a usage error, and a clear message naming `pnpm build` when the directory is missing. |
| NFR-4 | The walk stays well under a second on the 199-file tree. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | The current tree reports `entries 197 / 200` and exits 0. | FR-1 |
| AC-2 | `--entries 196` on the current tree exits 1 with a message naming `197 > 196`. | FR-1 |
| AC-3 | The precache count still prints on every run, labelled informational, and cannot fail a run. | FR-2 |
| AC-4 | The ceiling constant is 200 and its adjacent comment carries the 197 measurement and the re-anchor rule. | FR-3 |
| AC-5 | Fixtures give 199/200 → 0, 201/200 → 1, and 201/250 → 0 via `--dist` and `--entries`. | FR-4 |
| AC-6 | `dev/tools/dist-budget.test.ts` runs inside `pnpm test` (66 → 67 files) without a build. | FR-5 |

## Edge Cases

- No `sw.js` (a build with the PWA plugin off): the guarded metric is unaffected;
  the informational line says the manifest is absent.
- A worker file not matching `sw.js` or `workbox-*` counts as shipped — accepted
  and documented, since the exclusion regex is the existing contract.
- An empty dist directory reports 0 entries and passes the entry check; size
  remains the byte ceiling's job.
- Nested directories count per file, as today.
- `--dist` pointing at a missing directory gets the same clear error as a missing
  `dist/`.

## Dependencies

- **Tracks:** none.
- **External:** none.

## Open Questions & Assumptions

- **Assumption:** the ceiling stays at 200 rather than re-anchoring — the owner's
  decision when the track was created.
- **Assumption:** the precache count stays visible because `globIgnores` is a
  deliberate design choice worth seeing in the log.
- **Assumption:** the existing group-size summary prints unchanged; only the
  entry line's semantics move.
- **Question (deferred, not this track):** should the 250 `maxEntries`
  runtime-cache cap get its own guard, or should `qa-offline` join the CI gate?
  Recorded for a future track.

## References

- `dev/tools/dist-budget.mjs` — the ceiling history and the `swReported`
  assignment.
- `vite.config.ts` — `globIgnores` and runtime-cache `maxEntries: 250`.
- `conductor/product.md` — the recorded measurements (133 precache entries at
  v1.2.0, 10 at offline-resilience, 197 entries at patterns).
- `dev/qa/qa-offline.mjs:89-195` — the local-only content-completeness check.
