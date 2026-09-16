# Implementation Plan: My Name — personalized name tracing

**Track ID:** `my-name_20260916`
**Specification:** [./spec.md](./spec.md)
**Branch:** `track/my-name`
**Methodology:** `conductor/workflow.md` — TDD per task (failing tests first,
then implementation, then coverage verification), commit + git note per task,
7-char commit SHA recorded here. Every phase ends with its Phase Verification &
Checkpoint task.

**Delivery strategy:** foundations first (persistence → composition → wiring →
parent editing → art → QA/device/acceptance). All work stays local on
`track/my-name`; no push/PR/release. No engine mechanics change (tolerance and
speed untouched).

## Phase 1: Context docs resync + name persistence foundation

- [x] Task 1: Context docs resync (1b72be6)
  - [ ] product.md: add My Name to core features + dated note (previous tracks'
        note style)
  - [ ] tech-stack.md: additive `name` save field, runtime name-pack
        composition, sticker/badge assets
  - [ ] README: fix stale "four characters × two packs" line → shipped state +
        My Name
  - [ ] Commit + git note
- [x] Task 2: Name sanitizer + save field (TDD) (dea5e5a)
  - [ ] Red: `sanitizeName` tests (uppercase, strip non-A–Z, clamp
        `MAX_NAME_LENGTH`, reject <2); `loadSave` hostile/absent-safe name +
        v1–v3 fixtures unchanged; `setName` roundtrip; reset-progress keeps
        name
  - [ ] Green: `src/save/store.ts` (`SaveData.name?`, `sanitizeName`,
        `setName`); `app.ts` reset preserves name
  - [ ] Verify coverage on new logic
  - [ ] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Name level composition (pure geometry + path thinning)

- [ ] Task 1: `buildNameLevel` (TDD)
  - [ ] Red: stroke count/order per letter; bounds inside field; centered
        advance; goal = last stroke end; long-name thinning scales
        ribbon/dots/tip with floor
  - [ ] Green: `src/packs/name.ts` (compose from `LETTER_LEVELS` geometry;
        `MAX_NAME_LENGTH = 7` pending device tune)
  - [ ] Verify coverage
  - [ ] Commit + git note
- [ ] Task 2: `namePackFor(name)` mini-pack descriptor + resolver (TDD)
  - [ ] Red: null when no/invalid name; entry `{id: 'name', badgeId:
        'name-badge', levels: ['name-1']}`; app resolves `packById(...) ??
        namePackFor(save.name)`; badge-tap safe for bonus-less pack
  - [ ] Green: implement
  - [ ] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: App wiring — menu, pack screen, rewards, level flow

- [ ] Task 1: Dynamic menu (TDD): 3→4 cards when set; name drawn as mini-glyph
      fallback; progress dot + gold star; gone on clear
- [ ] Task 2: Pack screen + flow (TDD): 1-level pack layout; open/replay/home;
      sticker `name-1`; badge ceremony via existing `pendingBadge`;
      `screenTargets` additions
- [ ] Task 3: Wiring sweep — audit every `PACKS`/`allPacks()` consumer (MENU
      constants, layouts, pagers, minis, render loops, dev harness/screens) for
      3-pack assumptions; name-change recompute path
- [ ] Commit + git note (per task)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Parent zone — name button + editing overlay (DOM input)

- [ ] Task 1: Layout + hit tests (TDD): `name` button (≥90 px) in parent-zone
      layout; overlay layout (field + Save/Clear/Cancel); `parent:name` target
- [ ] Task 2: State machine + input (TDD): events `name-set` / `name-clear` +
      `parent.showName`; sanitize on save; reject <2; Clear keeps overlay open;
      lazily-created DOM input positioned over field (resize/keyboard-safe, iOS
      no-zoom font, autocapitalize, maxlength)
- [ ] Commit + git note (per task)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5: Art — sticker + badge + menuFill (owner approval gate)

- [ ] Task 1: Sticker art → `public/art/sticker/name-1.png` (gold name-star),
      pipeline + optimize
- [ ] Task 2: Badge art → `public/art/pack/name-badge.png` (medal), pipeline +
      optimize
- [ ] Task 3: Screenshot set (menu/pack/level/success) → owner approval;
      confirm name `menuFill` pastel
- [ ] Task 4: Precache/size checkpoint (build; SW glob includes new files; dist
      recorded vs ≈9.3 MB current)
- [ ] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 6: QA evidence, device tuning, acceptance, docs finalize

- [ ] Task 1: `dev/qa/qa-name.mjs`: gate → set name → 4-card menu → pack →
      trace → sticker/badge → reload persistence → clear → 3 cards; screenshots
- [ ] Task 2: Zero-text audit; `qa-offline` cold start unchanged; hostile
      fixtures; perf spot-check
- [ ] Task 3: Device pass Android + iPad — keyboard overlay, tracing feel; tune
      thinning floor + `MAX_NAME_LENGTH` (≥5 gate; STOP + owner decision if it
      fails)
- [ ] Task 4: Acceptance session (owner): toddler traces name ≥1 time unaided;
      docs finalize (cap, dev/README QA table, dated notes)
- [ ] Task 5: Final gates `pnpm check && pnpm test`; dist size record; review
      summary
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
