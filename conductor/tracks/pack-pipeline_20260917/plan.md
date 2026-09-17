# Implementation Plan: Declarative pack pipeline — validated JSON level data + authoring tooling

**Track ID:** `pack-pipeline_20260917`
**Specification:** [./spec.md](./spec.md)
**Branch:** `track/pack-pipeline`
**Methodology:** `conductor/workflow.md` — TDD per task (failing tests first,
then implementation, then coverage verification), commit + git note per task,
7-char commit SHA recorded here. Every phase ends with its Phase Verification &
Checkpoint task.

**Delivery strategy:** format + parser first (the load-bearing contract), then
the Pre-writing port with byte-level parity, then tooling (CLI, harness), then
docs + acceptance. Gameplay parity is a hard constraint: `PRE_PACK` exports and
all existing tests stay untouched. All work stays local on `track/pack-pipeline`;
no push/PR/release; no new runtime dependency.

## Phase 1: Context & format foundation [checkpoint: ]

- [x] Task 1: Context docs resync (76b4569)
  - [x] `tech-stack.md`: declarative pack format note (JSON schema, shared parser,
        CLI, harness; `resolveJsonModule` addition)
  - [x] `product.md`: dated note — content authoring becomes pipeline work, not code
  - [x] Commit + git note
- [x] Task 2: Pack JSON schema documentation (7693a94)
  - [x] `src/packs/data/README.md`: field-by-field schema + fully worked level example
  - [x] Document authoring rules (430×860 field space, margin 24, ≥2 control points,
        duplicate-point rule, `goalArt` bundle-path rule, unlock parity)
  - [x] Commit + git note
- [x] Task: Schema + parser contract agreed with spec FR1/FR2 (self-check) — field
      name aligned to `bonusUnlocks`; final-threshold rule recorded in spec FR1
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Strict shared parser (`src/packs/json.ts`) [checkpoint: ]

- [ ] Task 1: Raw-JSON shape validation (TDD)
  - [ ] Red: unknown key rejected (e.g. `goals` for `goal`); invalid `stroke` value
        rejected; missing/empty id rejected; non-object pack/level rejected
  - [ ] Green: hand-rolled shape checks that narrow `unknown` → typed raw shapes
  - [ ] Verify coverage
  - [ ] Commit + git note
- [ ] Task 2: Geometry + pack-rule integration (TDD)
  - [ ] Red: `parsePackJson` reuses `validateLevel` (margin, finite, duplicates,
        min points) and `createPackEntry` (bonus/unlock parity); `goalArt` must be a
        `/art/goal/` bundle path with no traversal; error lists are per-level labeled
  - [ ] Green: compose `parsePackJson(raw): PackEntry` from the shared validators;
        throw clear load-time error on problems
  - [ ] Verify coverage
  - [ ] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Pre-writing port — byte-level parity [checkpoint: ]

- [ ] Task 1: `src/packs/data/pre.json` authored from current `pre.ts`
  - [ ] All 12 levels + 3 bonus circles + badge/menuFill/unlocks, control points
        and goals copied exactly
  - [ ] `tsconfig.json`: `resolveJsonModule` enabled; `pnpm check` green
  - [ ] Commit + git note
- [ ] Task 2: `pre.ts` becomes a thin loader (TDD)
  - [ ] Red: parity test — hardcoded coordinate table of the original 15 levels
        compared against the JSON-sourced `PRE_PACK` (ids, stroke patterns, goals,
        control points, order, unlocks); malformed fixture throws a labeled error
  - [ ] Green: rewrite `pre.ts` to import the JSON + `parsePackJson`; exports
        `PRE_PACK` / `PRE_LEVELS` unchanged
  - [ ] Verify coverage
  - [ ] Commit + git note
- [ ] Task 3: Full-suite regression pass
  - [ ] `CI=true pnpm check && CI=true pnpm test` — all pre-existing tests green
    without modification
  - [ ] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Dev CLI validator [checkpoint: ]

- [ ] Task 1: Problem-collector API (TDD)
  - [ ] Red: `collectPackProblems` returns path-labeled problems for bad packs
        (file → level id → problem), empty for good input
  - [ ] Green: export from the parser module; used by both runtime throw and CLI
  - [ ] Verify coverage
  - [ ] Commit + git note
- [ ] Task 2: `dev/tools/pack-validate.mjs` + `pnpm pack:check`
  - [ ] Validates every `src/packs/data/*.json` via Node 24 native TS type-stripping;
        prints per-file/per-level problems; exit non-zero on failure
  - [ ] Red/Green: test — good pack exits 0; fixture with a bad level exits non-zero
        and names the offending file/level
  - [ ] Wire `pack:check` into the CI workflow alongside existing checks
  - [ ] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5: Visual authoring harness [checkpoint: ]

- [ ] Task 1: Dev pack preview (`dev/harness/`)
  - [ ] Renders a chosen JSON pack's level with field coordinates, margin gutters,
        start/goal markers, and checkpoint circles
  - [ ] `dev/README.md` runbook entry (how to open, URL params, what you see)
  - [ ] Manual visual spot-check of all 15 pre levels at 430×860
  - [ ] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 6: Acceptance — parity, QA, docs [checkpoint: ]

- [ ] Task 1: Docs + notes finalize
  - [ ] `tech-stack.md` + `product.md` dated notes verified; `dev/README.md` complete
  - [ ] Commit + git note
- [ ] Task 2: End-to-end acceptance evidence
  - [ ] `pnpm pack:check`, `pnpm budget`, `pnpm build` green
  - [ ] Pre-pack QA flow unchanged (`dev/qa/qa-pre-pack.mjs` + `qa-app.mjs` spot run)
  - [ ] Harness screenshots of pre levels 1 / 7 / 12 + one bonus (evidence in `dev/qa/out/`)
  - [ ] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
