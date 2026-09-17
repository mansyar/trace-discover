# Implementation Plan: Pack pipeline completion — Numbers & Letters as validated JSON data

**Track ID:** `pack-pipeline-2_20260917`
**Specification:** [./spec.md](./spec.md)
**Branch:** `track/pack-pipeline-2`
**Methodology:** `conductor/workflow.md` — TDD per task (failing tests first, then implementation, then coverage), commit + git note per task, 7-char commit SHA recorded here. Every phase ends with its Phase Verification & Checkpoint task.

**Delivery strategy:** freeze the pre-port truth first (committed fixtures captured from the current TypeScript), then port one pack at a time (Numbers → Letters) behind parity tests, then verify the (already generic) tooling, extend the preview sweep to all packs, and close with QA sweeps + docs + size deltas. Byte parity is the hard constraint — no geometry, id, goalArt, order, badge, menuFill, or unlock change; no consumer module is expected to change. All work stays local on `track/pack-pipeline-2` — no push/PR/release. Any tech-stack deviation stops the line and updates `tech-stack.md` first (workflow rule 7).

## Phase 1: Truth freeze — docs of record + parity fixtures [checkpoint: de9675e]

- [x] Task 1: Context docs resync (docs before implementation) [66a82e2]
  - [x] `conductor/tech-stack.md`: dated note — port target: all static packs declarative (`numbers.json`, `abc.json`; file name = pack id; Name stays runtime-composed; ports are parity-guarded)
  - [x] `conductor/product.md`: dated note — every static pack is pipeline work; My Name stays composed by design
  - [x] Commit + git note
- [x] Task 2: Freeze pre-port parity fixtures [1f7b866]
  - [x] One-off capture (temporary dev-time script) dumping current TypeScript exports into `src/packs/fixtures/numbers-parity.json` + `letters-parity.json`; capture source commit (`086f8c8`) recorded
  - [x] Verify contents: 10 numeral levels; 26 + 3 letter levels with derived goal/goalArt; pack identities + unlocks; spot-diff vs source
  - [x] Delete the capture script; commit fixtures + git note (provenance: what was frozen, from where, why)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Numbers port — byte-level parity (TDD) [checkpoint: ed0506d]

- [x] Task 1: Numbers parity + loader contract, then thin loader (TDD) [77f97ef]
  - [x] Red: `src/packs/numbers-parity.test.ts` — parity vs frozen fixture (ids, goals, goalArt, strokes, order); identity checks; loader contract via mocked malformed `./data/numbers.json` → labeled load error — confirm the contract test fails against the current inline `numbers.ts`
  - [x] Green: author `src/packs/data/numbers.json` (schema-identical to fixture); rewrite `numbers.ts` as a thin loader (Pre-writing pattern; `NUMERAL_LEVELS` / `NUMBERS_PACK` preserved); tests green
  - [x] Verify coverage
  - [x] Commit + git note
- [x] Task 2: Full-suite regression (no edits to existing tests) [ed0506d]
  - [x] `CI=true pnpm check && CI=true pnpm test` — every pre-existing test green unmodified
  - [x] Commit + git note (empty evidence commit permitted)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Letters port — byte-level parity (TDD) [checkpoint: 316095b]

- [x] Task 1: Letters parity + loader contract, then thin loader (TDD) [9b4259e]
  - [x] Red: `src/packs/letters-parity.test.ts` — parity vs frozen fixture for all 29 levels incl. derived goal/goalArt; identity + `bonusUnlocks [9,18,26]`; loader contract via mocked malformed `./data/abc.json` → labeled load error — confirm the contract test fails against the current inline `letters.ts`
  - [x] Green: author `src/packs/data/abc.json`; rewrite `letters.ts` as a thin loader (`LETTER_LEVELS`, `LETTER_BONUS_LEVELS`, `LETTERS_PACK` preserved; `letterLevel` / `letterGlyph` / `bonusRunLevel` keep behavior); tests green
  - [x] Verify coverage
  - [x] Commit + git note
- [x] Task 2: Regression + Name composition untouched [316095b]
  - [x] `CI=true pnpm check && CI=true pnpm test`; `name` tests green unmodified (glyph chain byte-identical)
  - [x] Commit + git note (empty evidence commit permitted)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Tooling, QA sweeps & acceptance

- [x] Task 1: Tooling verification + preview sweep extension (dev-only) [8075e90]
  - [x] `pnpm pack:check`: all three packs validated; labeled output recorded
  - [x] Extend `dev/qa/qa-pack-preview.mjs` (`--all`) to sweep every pack in `src/packs/data/` (numbers + abc); confirm harness default fallback after the glob grows; update `dev/README.md` runbook notes
  - [x] Commit + git note
- [~] Task 2: QA sweeps + evidence (fresh build)
  - [ ] `pnpm build`; run `qa-app`, `qa-numerals`, `qa-pack-app`, `qa-letters-sweep`, `qa-name` (spot), `qa-offline` (spot) + extended preview sweep; review screenshots
  - [ ] Record exact commands + outcomes in the git note
  - [ ] Commit + git note
- [x] Task 3: Docs finalize + size/budget deltas [6026825]
  - [x] `src/packs/data/README.md` + `dev/README.md` final; `tech-stack.md` / `product.md` notes finalized
  - [x] `pnpm budget` green; dist size + precache entries recorded vs pre-track master baseline
  - [x] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
