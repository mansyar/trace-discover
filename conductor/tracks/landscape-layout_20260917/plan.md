# Implementation Plan: Landscape layout — wide-field play for names, words, and the full app

**Track ID:** `landscape-layout_20260917`
**Specification:** [./spec.md](./spec.md)
**Branch:** `track/landscape-layout`
**Methodology:** `conductor/workflow.md` — TDD per task (failing tests first,
then implementation, then coverage verification), commit + git note per task,
7-char commit SHA recorded here. Every phase ends with its Phase Verification &
Checkpoint task.

**Delivery strategy:** foundations first (design spaces + reflow plumbing →
level composition/reflow → name/words → child shell → parent surfaces →
QA/device/acceptance). Portrait parity is a hard constraint; landscape screens
are screenshot-approved per the established art-review loop. Coordination: the
in-flight `track/parent-zone` should merge first (it reworks the parent screen
this track also re-lays); Phase 5 mirrors whichever design is canonical if not
merged. All work stays local on `track/landscape-layout`; no push/PR/release;
no new deps/assets.

## Phase 1: Orientation foundation — dual design spaces, reflow plumbing, layout rebuilds

- [x] Task 1: Context docs resync (1ee465c)
  - [x] product.md: landscape play + dated note (house style)
  - [x] tech-stack.md: dual design spaces (430×860 / 860×430), orientation
        policy, composition layer
  - [x] dev/README: QA table prep for the landscape probe
  - [x] Commit + git note
- [x] Task 2: Orientation policy + dual design spaces (TDD) (f34db07)
  - [x] Red: `orientationFor(viewport)` (width > height → landscape; square →
        portrait); field math both aspects incl. portrait baseline fixture;
        `__app.orientation()` contract
  - [x] Green: design-space constants; `resize()` uses the active space; probe
        hook
  - [x] Verify coverage on new logic
  - [x] Commit + git note
- [x] Task 3: Layout rebuilds — child surfaces (TDD) (e7ebab1)
  - [x] Red: menu/splash/skin/success/badge layouts produce in-bounds landscape
        arrangements (centered card row/wrap, gate zone, parks); portrait
        outputs equal current snapshots
  - [x] Green: boot-time layout constants become `rebuildViews()` recomputed on
        orientation change; render/input read current views
  - [x] Verify coverage
  - [x] Commit + git note
- [x] Task 4: Layout rebuilds — pack grids, pagers, sticker shelves (TDD) (5365bf4)
  - [x] Red: per-pack landscape configurations (letters/numbers/pre/name)
        in-bounds; page counts; shelf slots
  - [x] Green: landscape `PACK_GRID` configs; layouts/pagers/minis recompute;
        screenshot spot-check
  - [x] Verify coverage
  - [x] Commit + git note
- [x] Task 5: Reflow plumbing sweep — resize → field/backing store/input/
      character/name-input; rotate smoke on dev server (splash/menu/pack) (7f0677c)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Level composition + rotation reflow

- [ ] Task 1: Word-row composer generalization (TDD)
  - [ ] Red: `composeWordRow(glyphs, box, gap, cap)` — order, bounds, centering,
        scale cap, natural gaps
  - [ ] Green: extract from `name.ts`; portrait outputs byte-identical
        (fixture)
  - [ ] Verify coverage
  - [ ] Commit + git note
- [ ] Task 2: Level projection layer (TDD)
  - [ ] Red: `levelForOrientation(level, orientation)` — portrait identity
        (deep equality with authored levels); landscape: single glyphs
        uniformly fit/center (scale ≤ 1.0, margins honored)
  - [ ] Green: implement projection module; wire session/pack consumers
  - [ ] Verify coverage
  - [ ] Commit + git note
- [ ] Task 3: Session/trail reflow preserving progress (TDD)
  - [ ] Red: mid-stroke rotation → stroke index + proportional position
        preserved; in-flight stroke cancels cleanly; success/tableau
        unaffected; repeated rotates stable
  - [ ] Green: session rebuild path integrated into the resize hook
  - [ ] Verify coverage
  - [ ] Commit + git note
- [ ] Task 4: Mid-trace rotation evidence (scratch probe + screenshots) → owner
      sanity check
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: My Name + word bonuses in landscape (headline)

- [ ] Task 1: `buildNameLevel(name, orientation)` + orientation-aware
      `NAME_BOX` (TDD)
  - [ ] Red: portrait identity vs current tests; landscape — 5-letter scale
        ≥ 0.95, 7-letter ≥ 0.7, bounds in the wide box, centering, goal = last
        point, path visuals unclamped at full scale
  - [ ] Green: orientation param; wide box; session wiring via Phase 2 reflow
  - [ ] Verify coverage
  - [ ] Commit + git note
- [ ] Task 2: Bonus word recompose — ABC/MOM/ZOO (TDD)
  - [ ] Red: full-size landscape rows, bounds, goal, stroke order/count
        preserved; portrait identity
  - [ ] Green: landscape variants via the shared composer
  - [ ] Verify coverage
  - [ ] Commit + git note
- [ ] Task 3: Landscape name/word evidence — probe pass + screenshots (5+
      letter names at full size) → owner approval
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Child shell screens in landscape (screenshot-approved)

- [ ] Task 1: Menu wide — card row/wrap, name-card minis, gate zone, mascot
      park; screenshots → owner approval
- [ ] Task 2: Pack screens wide — per-pack grids, pagers, sticker shelves,
      badge seal, home; screenshots → owner approval
- [ ] Task 3: Success + badge + splash wide — buttons, confetti, parks;
      screenshots → owner approval
- [ ] Commit + git note (per task)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5: Parent surfaces in landscape

- [ ] Task 1: Parent zone wide recompose — nine controls + trophies, target
      floors, aligned with the parent-zone track's design; screenshots → owner
      approval
- [ ] Task 2: Name overlay + install panel wide — DOM input positioning,
      keyboard safety, iOS no-zoom; screenshots → owner approval
- [ ] Commit + git note (per task)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 6: QA matrix, device pass, docs, acceptance

- [ ] Task 1: `dev/qa/qa-landscape.mjs` canonical matrix — portrait baseline +
      landscape per screen; rotate mid-trace/mid-menu with state + progress
      assertions; target-size and field-aspect assertions; screenshots
- [ ] Task 2: Supersede `qa-viewport.mjs` — fix the stale `success:home → pack`
      assumption, fold checks into the new probe, update dev/README table
- [ ] Task 3: Zero-text audit; offline cold start unchanged; perf spot-check;
      `pnpm budget` record
- [ ] Task 4: Device pass Android + iPad — portrait regression + landscape
      acceptance; owner confirms a 5+ letter name traced unaided; tune
      caps/radii (STOP + owner decision if a target floor can't hold)
- [ ] Task 5: Docs finalize (product.md dated note, tech-stack.md, dev/README);
      final gates `pnpm check && pnpm test`; coverage; dist size record
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
