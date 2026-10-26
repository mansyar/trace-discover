# Implementation Plan: Tablet fit — fill the canvas on iPads and Android tablets

**Track ID:** `tablet-fit_20261006`
**Specification:** [./spec.md](./spec.md)
**Branch:** `track/tablet-fit`
**Methodology:** `conductor/workflow.md` — TDD per task (failing tests first,
then implementation, then coverage verification), commit + git note per task,
7-char commit SHA recorded here. Every phase is accepted by the Conductor
orchestrator after independent verification; its evidence is recorded in
`./verification/phase-<n>.md`.

**Delivery strategy:** foundation first (tech-stack decision recorded → space
table + selection rule → reflow plumbing), then level composition, backdrop fit,
child surfaces, parent surfaces, and finally the QA matrix, device pass and
docs. Phone parity is a hard constraint (portrait *and* landscape must match the
v1.7.0 baseline); every tablet-space screen is screenshot-approved per the
established art-review loop. All work stays local on `track/tablet-fit`; no
push/PR/release; no new deps and no new shipped assets.

**Format migration (2026-10-26):** this plan was authored under the Conductor
1.x flow (checkpoint inside the phase heading, "Phase Verification &
Checkpoint" as an inline task). It was migrated in place to the 2.0 shape —
phase Goal / Depends on / Covers / Touches / Verification / Status, stable task
IDs and a per-phase evidence path — without changing any recorded work,
checkpoint or commit SHA. The inline verification task is now the phase's
`Verification` field plus its evidence file; nothing else was removed.

## Phase 1: Design-space foundation — documented decision, space table, reflow plumbing

- **Goal:** record the six-space decision before code, then land the space
  table, the nearest-anchor selection rule and the reflow plumbing every later
  phase builds on.
- **Depends on:** none
- **Covers:** FR1, FR2, AC2
- **Touches:** `src/field.ts`, `src/field.test.ts`, `src/shell/**`,
  `src/main.ts`, `conductor/tech-stack.md`, `conductor/product.md`,
  `dev/README.md`
- **Verification:** `CI=true pnpm check && CI=true pnpm test`
- **Status:** verified

- [x] **P1.T1: Context docs resync before implementation** (Tech Stack is Deliberate) (654ee40)
  - [x] `tech-stack.md`: replace the two-space statement with the six-space
        table, the nearest-anchor selection rule, and the backdrop
        cover-crop/anchor policy
  - [x] `product.md`: tablet play + dated note (house style)
  - [x] `dev/README.md`: QA table row reserved for `qa-tablet`
  - [x] Commit + git note
- [x] **P1.T2: Space table + selection rule (TDD)** (cf2479d)
  - [x] Red: `fieldSpaceFor(viewport)` — exact-anchor ratios pick their own
        space with zero bars (1024×1366 → 4:3, 800×1280 → 16:10, 430×860 →
        phone); Android 3:2 lands on the nearest anchor; square stays portrait;
        ties resolve to the narrower space; phone viewports return the existing
        spaces byte-for-byte
  - [x] Green: design-space constants + pure selector; `orientationFor` policy
        unchanged
  - [x] Verify coverage on new logic
  - [x] Commit + git note
- [x] **P1.T3: Reflow plumbing across spaces (TDD)** (e0da9a4)
  - [x] Red: resize/rotate between any two spaces re-selects and rebuilds
        field rect, backing store, input mapping, character canvas and name
        input; additive `window.__app` space probe; existing probes unchanged
  - [x] Green: wire the selector through boot/resize and `rebuildViews()`
  - [x] Verify coverage
  - [x] Commit + git note
- [x] **P1.T4: Reflow sweep on the dev server** — rotate across phone/16:10/4:3
      in splash, menu, pack and level; confirm instant re-lay, no flicker

**Result:** verified
**Checkpoint:** e0da9a4
**Evidence:** conductor/tracks/tablet-fit_20261006/verification/phase-1.md

## Phase 2: Level composition and progress-preserving reflow across spaces

- **Goal:** every level composes into the active space's box — including word
  rows — and a mid-stroke rotation across spaces keeps the run and its progress.
- **Depends on:** Phase 1
- **Covers:** FR3, AC3, AC4
- **Touches:** `src/packs/**`, `src/app/session.ts`, `src/app/runPlan.ts`,
  `src/app/render.ts`, `src/app/*.test.ts`, `dev/qa/**`,
  `conductor/tech-stack.md`
- **Verification:** `CI=true pnpm check && CI=true pnpm test` plus the live
  rotation/row probes under `dev/qa/`
- **Status:** verified

- [x] **P2.T1: Projection generalization for tablet boxes (TDD)** (174c10a)
  - [x] Red: single glyphs fit-and-center in each new space (scale ≤ 1.0,
        margins honored); word rows (My Name, `ABC`/`MOM`/`ZOO`) recompose in
        the wider boxes; phone outputs deep-equal today's composition
  - [x] Green: extend the projection layer; wire session/pack consumers
  - [x] Verify coverage
  - [x] Commit + git note
- [x] **P2.T2: Session/trail reflow across any two spaces (TDD)** (7ae2a6e)
  - [x] Red: mid-stroke switch between phone and tablet spaces preserves stroke
        index + proportional position; in-flight stroke cancels cleanly;
        repeated switches stable; success/tableau unaffected
  - [x] Green: session rebuild path driven by the selected space — `reflow`
        takes the new space's parks and re-seats the waiting mascot, and
        `reflowRun` passes `parksFor(space)`, the same resolver `startRun` uses
  - [x] Re-seat evidence (live browser pass, measured off `#char`): a mid-stroke
        phone-landscape → tablet-portrait rotation keeps the run and moves the
        mascot park from (0.5000, 0.7209) to (0.5000, 0.7558) — the tablet
        space's authored fraction — with the trail re-laid to the tablet centre;
        rotating back restores the wide park and the run resumes to success
  - [x] Verify coverage (session.ts 98.3/93.58/100/98.29; global
        76.97/79.5/91.51/76.56, up from 76.61/79.26/91.28/76.23)
  - [x] Commit + git note
- [x] **P2.T3: Mid-trace tablet rotation evidence** — screenshots at 4:3 and
      16:10 in both orientations → owner sanity check (6bcb70d) — evidence
      captured by `dev/qa/qa-tablet-rotate.mjs`: 31 live assertions across the
      four rotations (space re-selected, level kept, stroke index kept, progress
      0.500 → 0.500, run completes, 0 page errors); 8 before/after shots,
      close-ups and a gallery in `dev/qa/out/tablet-rotate/`; the additive
      `window.__app.progress()` probe it needed is reused by the Phase 6 matrix;
      owner approved 2026-10-26
- [x] **P2.T4: Word rows recompose into the active space's box (TDD)** (abe9674) — decided
      2026-10-06
  - [x] Red: box selection for a `FieldSpace` (space-aware replacements for
        `NAME_BOX` / `WIDE_WORD_BOX`); a 5-letter name reaches the scale cap and
        a 7-letter name stays above 0.8 in a tablet-portrait box (today it is
        below 0.5 there); phone portrait and phone landscape rows deep-equal
        today's composition
  - [x] Green: space-aware boxes; `buildNameLevel` / `namePackFor` /
        `bonusRunLevel` / `appPacks` take the space; menu-card minis keep their
        current box (cosmetic only, noted)
  - [x] No engine retune: the composer caps scale at a single letter's authored
        size, so every row glyph stays at or below the geometry the tolerance
        (430 × 0.12 = 51.6 units) and the 600 units/s advance cap were
        calibrated against — see spec FR3 and the tech-stack note of 2026-10-06
  - [x] Trail-guide thickness measured against the phone reference, requested
        2026-10-07 (f150a89): `dev/qa/qa-tablet-trail.mjs` renders the 7-letter
        row in all six spaces and measures the guide from the trail canvas — the
        ribbon renders 64.0–64.5 units everywhere (the authored style, no
        per-space retune), finger-scale on every device (~51–65 px), and per
        letter the tablet rows (0.188–0.249) sit inside the shipped
        landscape-phone band (0.228) with more dots per row (6 → 14–19). No
        thicker trail, larger dots or wider tip; the one disproportionate guide
        is the pre-existing portrait-phone long name (0.508), out of scope here.
        Recorded in `tech-stack.md` (2026-10-07). No code change.
  - [x] Row band placement inside the larger tablet boxes: screenshots at 4:3
        and 16:10 in both orientations → owner approval — evidence captured by
        `dev/qa/qa-tablet-rows.mjs` (the menu pager spots are now exposed by
        `targets()`, so the paginated runtime name card can be driven): 155 live
        assertions pass with 0 failures, 16 labelled shots + gallery in
        `dev/qa/out/tablet-rows/`; owner approved 2026-10-26
  - [x] Verify coverage
  - [x] Commit + git note

**Result:** verified
**Checkpoint:** 6bcb70d
**Evidence:** conductor/tracks/tablet-fit_20261006/verification/phase-2.md

## Phase 3: Backdrop and art fit — cover-crop with a fixed anchor

- **Goal:** backdrops, the success wash and the particle fields cover the field
  at every space under one documented anchor policy, approved per skin.
- **Depends on:** Phase 2
- **Covers:** FR4, AC5
- **Touches:** `src/app/render.ts`, `src/app/art.ts`, `src/render/**`,
  `src/ui/success.ts`, `dev/qa/**`, `conductor/tech-stack.md`
- **Verification:** `CI=true pnpm check && CI=true pnpm test` plus the per-skin
  tablet-aspect screenshot sweep
- **Status:** verified

- [x] **P3.T1: Cover-crop and anchor math (TDD)** (a8e4bdc)
  - [x] Red: scale/offset for an image covering a field of any new aspect;
        anchor holds the ground line and horizon; phone fields produce today's
        geometry exactly; degenerate (missing image) still falls back to paint
  - [x] Green: implement the pure fit module and wire the renderer —
        `src/render/backdropFit.ts` (`coverFit`, `BACKDROP_ANCHOR` = the image
        centre where the square art composes its horizon/ground band);
        `drawBackdrop` uses it and `drawDuskPlaceholder` now fills the active
        space instead of a 430×860 corner while a backdrop decodes
  - [x] Verify coverage (`backdropFit.ts` 100/100/100/100; global
        79.07/81.04/92.25/78.67; 870 tests)
  - [x] Commit + git note
- [x] **P3.T2: Per-skin backdrop approval** (5535afc) — tablet-aspect screenshots for all
      six skins → owner approval (falls back to a single re-render if one crops
      badly); evidence captured by `dev/qa/qa-tablet-backdrops.mjs`: 122 live
      assertions, 0 failures — every edge of every space is backdrop and 8 points
      per space match the documented crop of the same 1024² image (worst Δ 19.7);
      40 shots + gallery in `dev/qa/out/tablet-backdrops/`. One finding: the
      shipped `public/art/bg/animals.webp` carries an opaque grey band across its
      top ~28% on every screen (pre-existing, visible on phones too). Owner
      decision 2026-10-26: **accept the fit, re-render separately** — filed as art
      debt in issue [#22](https://github.com/mansyar/trace-discover/issues/22),
      out of scope here because the band is source pixels no crop can remove; the
      anchor policy and every other skin's fit are unaffected
  - [x] Commit + git note
- [x] **P3.T3: Success wash, confetti and particles cover every new space**
      (screenshots → owner approval) — wash reaches all six sample points on all
      four tablet spaces and the burst confetti spans all four quadrants on each;
      owner approved 2026-10-26 (4:3 landscape success shot reviewed)
  - [x] Commit + git note

**Result:** verified
**Checkpoint:** 5535afc
**Evidence:** conductor/tracks/tablet-fit_20261006/verification/phase-3.md

## Phase 4: Child surfaces at tablet spaces (screenshot-approved)

- **Goal:** every child-facing screen recomposes in-bounds at all four tablet
  spaces with the 90 px design target floor held.
- **Depends on:** Phase 3
- **Covers:** FR5, AC1, AC3
- **Touches:** `src/ui/**`, `src/app/render.ts`, `src/app/menuArt.ts`,
  `src/app/app.ts`, `dev/qa/**`
- **Verification:** `CI=true pnpm check && CI=true pnpm test` plus the
  per-screen tablet screenshot matrix
- **Status:** pending

- [ ] **P4.T1: Menu + skin button + gate corner + mascot park at every new
      space**; screenshots → owner approval
  - [ ] Commit + git note
- [ ] **P4.T2: Pack screens** — per-pack grids, pagers, sticker shelves, badge
      seal and home recompose in-bounds at every new space; screenshots → owner
      approval
  - [ ] Commit + git note
- [ ] **P4.T3: Sticker board, success, badge and splash at every new space**
      (target floors held); screenshots → owner approval
  - [ ] Commit + git note

## Phase 5: Parent surfaces at tablet spaces

- **Goal:** the parent zone, name overlay and install panel are usable at tablet
  sizes, with the keyboard never covering the field.
- **Depends on:** Phase 4
- **Covers:** FR6, AC7
- **Touches:** `src/ui/parent.ts`, `src/ui/parentZone.ts`, `src/ui/install.ts`,
  `src/input/**`, `src/style.css`, `index.html`, `dev/qa/**`
- **Verification:** `CI=true pnpm check && CI=true pnpm test` plus the parent
  surface screenshot matrix
- **Status:** pending

- [ ] **P5.T1: Parent zone** — nine controls + trophies recompose with target
      floors; screenshots → owner approval
  - [ ] Commit + git note
- [ ] **P5.T2: Name overlay + install panel** — DOM input placement, keyboard
      safety, iOS no-zoom at tablet sizes; screenshots → owner approval
  - [ ] Commit + git note

## Phase 6: QA matrix, device pass, docs, acceptance

- **Goal:** the canonical tablet QA matrix is green, the phone baseline is
  unchanged, the docs match, and the owner has confirmed the device pass.
- **Depends on:** Phase 5
- **Covers:** FR7, FR8, AC8, AC9
- **Touches:** `dev/qa/**`, `dev/README.md`, `conductor/**`, `package.json`
- **Verification:** `CI=true pnpm check && CI=true pnpm test && pnpm budget` plus
  `qa-tablet` and `qa-landscape`
- **Status:** pending

- [ ] **P6.T1: `dev/qa/qa-tablet.mjs` canonical matrix** — 4:3 + 16:10 ×
      portrait/landscape per screen; rotate mid-trace/mid-menu with state +
      progress assertions; field-fill (bar tolerance) and target-size
      assertions; screenshots
- [ ] **P6.T2: Regression sweep** — `qa-landscape` still green, zero-text audit,
      offline cold start unchanged, perf spot-check, `pnpm budget` record
- [ ] **P6.T3: Device pass** — iPad + Android tablet fill acceptance, phone
      regression (portrait + landscape vs v1.7.0 baseline); owner confirms
      (STOP + owner decision if a target floor cannot hold)
- [ ] **P6.T4: Docs finalize** (`product.md` dated note, `tech-stack.md`,
      `dev/README.md` probe table); final gates `pnpm check && pnpm test`;
      coverage; dist record

## Phase R1: Review Fixes

- **Goal:** close the findings raised by the track's first review round.
- **Depends on:** Phase 2 (findings touched level/mascot code)
- **Covers:** AC9
- **Touches:** `src/app/session.ts`, `src/app/session.test.ts`,
  `src/packs/**`, `dev/qa/**`
- **Verification:** `CI=true pnpm check && CI=true pnpm test`
- **Status:** verified

- [x] **PR1.T1: Apply review suggestions** e1dd3b2
  - [x] Medium — in-level mascot parks were authored in phone field units, so on
        every tablet space the guide waited on top of the traced letters and the
        success park landed mid-field. `parksFor(space)` (session.ts) now resolves
        the authored park through the same field fraction, so both phone
        references keep their shipped points byte-identical while a tablet space
        keeps the relative spot (centred, under the row band); guards added in
        `session.test.ts` and measured live from `.char-canvas` in `qa-tablet-rows`
  - [x] Low — `projectRunLevel`'s doc comment described the opposite of the
        tablet/name paths it implements (rewritten)
  - [x] Low — vacuous assertion in `wordSpace.test.ts` (compared a value with
        itself) replaced with a real landscape-box guard
  - [x] Low — duplicate phone row-box branches reviewed and kept deliberately:
        both modules already branch to the named authored boxes for the phone
        spaces and call `wordRowBox` for everything else, and the parity is
        test-locked; no churn for zero behavioural gain

**Result:** verified
**Checkpoint:** 66248ec
**Evidence:** conductor/tracks/tablet-fit_20261006/verification/phase-R1.md
