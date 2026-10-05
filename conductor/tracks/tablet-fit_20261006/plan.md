# Implementation Plan: Tablet fit — fill the canvas on iPads and Android tablets

**Track ID:** `tablet-fit_20261006`
**Specification:** [./spec.md](./spec.md)
**Branch:** `track/tablet-fit`
**Methodology:** `conductor/workflow.md` — TDD per task (failing tests first,
then implementation, then coverage verification), commit + git note per task,
7-char commit SHA recorded here. Every phase ends with its Phase Verification &
Checkpoint task.

**Delivery strategy:** foundation first (tech-stack decision recorded → space
table + selection rule → reflow plumbing), then level composition, backdrop fit,
child surfaces, parent surfaces, and finally the QA matrix, device pass and
docs. Phone parity is a hard constraint (portrait *and* landscape must match the
v1.7.0 baseline); every tablet-space screen is screenshot-approved per the
established art-review loop. All work stays local on `track/tablet-fit`; no
push/PR/release; no new deps and no new shipped assets.

## Phase 1: Design-space foundation — documented decision, space table, reflow plumbing [checkpoint: e0da9a4]

- [x] Task 1: Context docs resync **before implementation** (Tech Stack is
      Deliberate) (654ee40)
  - [x] `tech-stack.md`: replace the two-space statement with the six-space
        table, the nearest-anchor selection rule, and the backdrop
        cover-crop/anchor policy
  - [x] `product.md`: tablet play + dated note (house style)
  - [x] `dev/README.md`: QA table row reserved for `qa-tablet`
  - [x] Commit + git note
- [x] Task 2: Space table + selection rule (TDD) (cf2479d)
  - [x] Red: `fieldSpaceFor(viewport)` — exact-anchor ratios pick their own
        space with zero bars (1024×1366 → 4:3, 800×1280 → 16:10, 430×860 →
        phone); Android 3:2 lands on the nearest anchor; square stays portrait;
        ties resolve to the narrower space; phone viewports return the existing
        spaces byte-for-byte
  - [x] Green: design-space constants + pure selector; `orientationFor` policy
        unchanged
  - [x] Verify coverage on new logic
  - [x] Commit + git note
- [x] Task 3: Reflow plumbing across spaces (TDD) (e0da9a4)
  - [x] Red: resize/rotate between any two spaces re-selects and rebuilds
        field rect, backing store, input mapping, character canvas and name
        input; additive `window.__app` space probe; existing probes unchanged
  - [x] Green: wire the selector through boot/resize and `rebuildViews()`
  - [x] Verify coverage
  - [x] Commit + git note
- [x] Task 4: Reflow sweep on the dev server — rotate across phone/16:10/4:3 in
      splash, menu, pack and level; confirm instant re-lay, no flicker
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Level composition and progress-preserving reflow across spaces

- [x] Task 1: Projection generalization for tablet boxes (TDD) (174c10a)
  - [x] Red: single glyphs fit-and-center in each new space (scale ≤ 1.0,
        margins honored); word rows (My Name, `ABC`/`MOM`/`ZOO`) recompose in
        the wider boxes; phone outputs deep-equal today's composition
  - [x] Green: extend the projection layer; wire session/pack consumers
  - [x] Verify coverage
  - [x] Commit + git note
- [ ] Task 2: Session/trail reflow across any two spaces (TDD)
  - [ ] Red: mid-stroke switch between phone and tablet spaces preserves stroke
        index + proportional position; in-flight stroke cancels cleanly;
        repeated switches stable; success/tableau unaffected
  - [ ] Green: session rebuild path driven by the selected space
  - [ ] Verify coverage
  - [ ] Commit + git note
- [ ] Task 3: Mid-trace tablet rotation evidence — screenshots at 4:3 and 16:10
      in both orientations → owner sanity check
- [ ] Task 4: Word rows recompose into the active space's box (TDD) — decided
      2026-10-06
  - [ ] Red: box selection for a `FieldSpace` (space-aware replacements for
        `NAME_BOX` / `WIDE_WORD_BOX`); a 5-letter name reaches the scale cap and
        a 7-letter name stays above 0.8 in a tablet-portrait box (today it is
        below 0.5 there); phone portrait and phone landscape rows deep-equal
        today's composition
  - [ ] Green: space-aware boxes; `buildNameLevel` / `namePackFor` /
        `bonusRunLevel` / `appPacks` take the space; menu-card minis keep their
        current box (cosmetic only, noted)
  - [ ] No engine retune: the composer caps scale at a single letter's authored
        size, so every row glyph stays at or below the geometry the tolerance
        (430 × 0.12 = 51.6 units) and the 600 units/s advance cap were
        calibrated against — see spec FR3 and the tech-stack note of 2026-10-06
  - [ ] Row band placement inside the larger tablet boxes: screenshots at 4:3
        and 16:10 in both orientations → owner approval
  - [ ] Verify coverage
  - [ ] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Backdrop and art fit — cover-crop with a fixed anchor

- [ ] Task 1: Cover-crop and anchor math (TDD)
  - [ ] Red: scale/offset for an image covering a field of any new aspect;
        anchor holds the ground line and horizon; phone fields produce today's
        geometry exactly; degenerate (missing image) still falls back to paint
  - [ ] Green: implement the pure fit module and wire the renderer
  - [ ] Verify coverage
  - [ ] Commit + git note
- [ ] Task 2: Per-skin backdrop approval — tablet-aspect screenshots for all six
      skins → owner approval (falls back to a single re-render if one crops
      badly)
  - [ ] Commit + git note
- [ ] Task 3: Success wash, confetti and particles cover every new space
      (screenshots → owner approval)
  - [ ] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Child surfaces at tablet spaces (screenshot-approved)

- [ ] Task 1: Menu + skin button + gate corner + mascot park at every new space;
      screenshots → owner approval
  - [ ] Commit + git note
- [ ] Task 2: Pack screens — per-pack grids, pagers, sticker shelves, badge seal
      and home recompose in-bounds at every new space; screenshots → owner
      approval
  - [ ] Commit + git note
- [ ] Task 3: Sticker board, success, badge and splash at every new space
      (target floors held); screenshots → owner approval
  - [ ] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5: Parent surfaces at tablet spaces

- [ ] Task 1: Parent zone — nine controls + trophies recompose with target
      floors; screenshots → owner approval
  - [ ] Commit + git note
- [ ] Task 2: Name overlay + install panel — DOM input placement, keyboard
      safety, iOS no-zoom at tablet sizes; screenshots → owner approval
  - [ ] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 6: QA matrix, device pass, docs, acceptance

- [ ] Task 1: `dev/qa/qa-tablet.mjs` canonical matrix — 4:3 + 16:10 ×
      portrait/landscape per screen; rotate mid-trace/mid-menu with state +
      progress assertions; field-fill (bar tolerance) and target-size
      assertions; screenshots
- [ ] Task 2: Regression sweep — `qa-landscape` still green, zero-text audit,
      offline cold start unchanged, perf spot-check, `pnpm budget` record
- [ ] Task 3: Device pass — iPad + Android tablet fill acceptance, phone
      regression (portrait + landscape vs v1.7.0 baseline); owner confirms
      (STOP + owner decision if a target floor cannot hold)
- [ ] Task 4: Docs finalize (`product.md` dated note, `tech-stack.md`,
      `dev/README.md` probe table); final gates `pnpm check && pnpm test`;
      coverage; dist record
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase: Review Fixes

- [ ] Task: Apply review suggestions
