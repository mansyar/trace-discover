# Implementation Plan: Menu capacity headroom — six-card dynamic-fit menu

**Track ID:** `menu-capacity_20260917`
**Specification:** [./spec.md](./spec.md)
**Branch:** `track/menu-capacity`
**Methodology:** `conductor/workflow.md` — TDD per task (failing tests first, then implementation, then coverage), commit + git note per task, 7-char commit SHA recorded here. Every phase ends with its Phase Verification & Checkpoint task.

**Delivery strategy:** docs of record first, then the pure layout math behind a count × orientation test matrix (the current 5-card overflow is the red case), then dots/art adaptation for grid-scaled cards, then the dev-only harness preview + QA screenshot matrix + docs/budget closeout. Fidelity is the hard constraint: 1–4 card rects stay visually identical; 2–6 fit at 90px+; 7+ degrades without overflow. All work stays local on `track/menu-capacity` — no push/PR/release. Any tech-stack deviation stops the line and updates `tech-stack.md` first (workflow rule 7).

## Phase 1: Context docs resync (docs before implementation) [checkpoint: db3a213]

- [x] Task 1: Tech-stack dated note [db3a213]
  - [ ] `conductor/tech-stack.md`: dated note — menu dynamic-fit capacity: 6 cards incl. My Name, columns-first growth (portrait 2-column grid at 5–6; landscape up to 3-column wrap), floors (90px hard minimum, test-locked), graceful degrade beyond capacity, dev harness synthetic-count preview
  - [ ] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Dynamic-fit layout math — count × orientation matrix (TDD) [checkpoint: 9a30ac5]

- [x] Task 1: Matrix tests red → dynamic-fit `menuLayout` green [1ceead5]
  - [x] Red: extend `src/ui/menu.test.ts` — 1–6 × portrait/landscape matrix (fit inside field, ≥ 90px dims, no card overlap, park/gate clearance, hit parity); fidelity lock — recorded rects for today's counts (3 packs; 4 with name) unchanged; confirm red at 5–6 against the current implementation (documents the overflow bug)
  - [x] Green: `src/ui/menu.ts` dynamic-fit — columns-first growth (portrait stack → centered 2-column grid; landscape row → 2-column → 3-column wrap), secondary shrink within floors, deterministic centering/last-row rules
  - [x] Verify coverage
  - [x] Commit + git note
- [x] Task 2: Capacity guard [9a30ac5]
  - [x] Test: registered static packs ≤ supported limit (menu capacity minus the runtime name card) — documents the supported count for future content tracks
  - [x] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Dots & art adaptation for grid-scaled cards (TDD) [checkpoint: 183b5d2]

- [x] Task 1: Dot/art tests red → adaptation green [1c25185]
  - [x] Red: tests in `src/ui/menu.test.ts` — max-dot case (letters, 29) at 5–6 card footprints: dot rows wrap, radius/spacing hold legibility floors, every dot inside the card; `menuCardArtMaxHeight` stays ≥ floor and clear of the dot strip at every count
  - [x] Green: adapt `menuDotPositions` / `dotsPerRow` / `menuCardArtMaxHeight` (scale within floors; no negative or overlapping art)
  - [x] Verify coverage
  - [x] Commit + git note
- [x] Task 2: Consumer regression (no edits to existing tests) [183b5d2]
  - [x] `CI=true pnpm check && CI=true pnpm test` — every pre-existing test green unmodified (`main.ts` / `render.ts` / `screens.ts` consume layout output unchanged in shape)
  - [x] Commit + git note (empty evidence commit permitted)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Harness preview, QA matrix & closeout [checkpoint: 4c4728e]

- [x] Task 1: Dev harness synthetic counts (dev-only) [ee731bc]
  - [x] `src/dev/screens.ts` + `dev/harness/screens.html`: parameter(s) for N synthetic cards (2–6) + orientation (e.g., `?menuCards=N`); render the screenshot matrix 3–6 × portrait/landscape incl. the name-card case; review screenshots; `dev/README.md` harness notes
  - [x] Commit + git note
- [x] Task 2: QA sweeps + evidence (fresh build) [e9663df]
  - [x] `pnpm build`; run `qa-screens`, `qa-landscape`, `qa-app` (spot); confirm no visual change at current counts + matrix reviewed; `pnpm budget` green; dist size + precache entries recorded vs master baseline (`fa84ee1`)
  - [x] Record exact commands + outcomes in the git note
  - [x] Commit + git note
- [x] Task 3: Docs finalize + acceptance checklist [4c4728e]
  - [x] `dev/README.md` final; tech-stack note final; spec acceptance criteria walked and recorded (incl. zero-text audit: no new UI text)
  - [x] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase: Review Fixes

- [x] Task: Apply review suggestions abdd783
