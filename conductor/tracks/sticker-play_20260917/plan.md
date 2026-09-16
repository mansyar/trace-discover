# Implementation Plan: Sticker Play — interactive sticker rewards

**Track ID:** `sticker-play_20260917`
**Specification:** [./spec.md](./spec.md)
**Branch:** `track/sticker-play`
**Methodology:** `conductor/workflow.md` — TDD per task (failing tests first,
then implementation, then coverage verification), commit + git note per task,
7-char commit SHA recorded here. Every phase ends with its Phase Verification &
Checkpoint task.

**Delivery strategy:** docs + persistence first, then the pure board logic
(layout → state machine), the canvas rendering + shell wiring (board, pop
moment, shelf pulse), the pentatonic ladder audio, then QA probes + preview
tooling, and finally device tuning → acceptance → docs finalize. All work
stays local on `track/sticker-play` (push/PR/release is an owner decision
after acceptance). Owner gates: letters-board single-screen fit (fallback:
two pages), ear approval of the note ladder, and the device sign-off.

## Phase 1: Context docs resync + save foundation [checkpoint: ecfe4cc]

- [x] Task 1: Context docs resync (9d28a51)
  - [x] product.md: reward-loop wording + sticker board in core features,
        dated note (previous tracks' style)
  - [x] tech-stack.md: additive `stickerIntroSeen`, board screen + pentatonic
        ladder mapping note, dated note
  - [x] product-guidelines.md: check — no change expected (child-surface rules
        unchanged)
  - [x] README: check — no change expected
  - [x] Commit + git note
- [x] Task 2: `stickerIntroSeen` save field (TDD) (ecfe4cc)
  - [x] Red: `loadSave` absent/non-boolean → false; roundtrip setter; v1–v3
        fixtures unchanged; reset preserves name + flag
  - [x] Green: `src/save/store.ts` sanitizer (+ additive field);
        `src/app/app.ts` reset preserves
  - [x] Verify coverage on new logic
  - [x] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Board logic — layout, hit tests, state machine (pure)

- [ ] Task 1: Board layout module (TDD)
  - [ ] Red: per-pack grid fits 430×860 field bounds (pre 15 / nums 10 /
        letters 29 / name 1); cells ≈96 units where count allows, letters
        densest-fit (~74); earned/ghost states from save; hit tests (cell →
        levelId, home, miss); shelf band hit rect excludes home + pager
        corner zones
  - [ ] Green: new pure `src/ui/stickerBoard.ts`
  - [ ] Verify coverage
  - [ ] Commit + git note
- [ ] Task 2: App state machine (TDD)
  - [ ] Red: `sticker-open` (pack exists && ≥1 sticker) → board screen;
        `sticker-close` → pack; `sticker-tap` only on earned stickers (drives
        moment state); open sets the intro flag once; pulse predicate (flag
        unseen && ≥1 sticker)
  - [ ] Green: `src/app/app.ts` (new screen variant + events) + predicate
        helper
  - [ ] Verify coverage
  - [ ] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Rendering + shell wiring — board, pop moment, shelf pulse

- [ ] Task 1: Board rendering
  - [ ] Draw board: skin backdrop, filled sticker art (earned) / ghosted
        slots, home button in pack style; reuse existing art + particle
        modules; no new assets
  - [ ] Screenshot evidence (harness, seeded save; visually confirmed)
  - [ ] Commit + git note
- [ ] Task 2: Pop moment + sparkle animation
  - [ ] rAF spring pop to ~400 units (squash & stretch, overshoot), sparkle
        burst, settle ≤ ~1.5s; rapid re-tap restarts; one note at a time
  - [ ] Screenshots (mid-pop frames)
  - [ ] Commit + git note
- [ ] Task 3: Shell wiring (`src/main.ts`)
  - [ ] Shelf band tap opens the board (control corners keep precedence);
        board pointer handling (cells → moment + note); shelf pulse while the
        intro is unseen; `targets()` gains shelf band + board targets
  - [ ] Screenshots (pulse state, board open, pop)
  - [ ] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Pentatonic ladder audio

- [ ] Task 1: Note mapping + playback (TDD)
  - [ ] Red: sticker index → scale degree (C D E G A) with rising octave
        cycle; stable per sticker; active skin's instrument; volume/mute
        respected
  - [ ] Green: mapping helper + existing synth/player wiring
  - [ ] Verify coverage
  - [ ] Commit + git note
- [ ] Task 2: Ear tuning pass — final mapping recorded (owner listen approval
      gate)
  - [ ] Commit + git note (if adjusted)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5: QA evidence + tooling

- [ ] Task 1: `dev/screens.ts` preview `?screen=board` (seeded) + new
      `dev/qa/qa-sticker-play.mjs` (pulse → shelf tap → board → sticker tap →
      moment state + note asserted → home → reload → pulse gone → fresh-save
      inert → letters fit → screenshots)
  - [ ] Commit + git note
- [ ] Task 2: Probe audit — shelf-region touches in `qa-name`, `qa-pre-pack`,
      `qa-menu-pack`; update for the new hit area
  - [ ] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 6: Device tuning, acceptance, docs finalize

- [ ] Task 1: Device pass Android + iPad — tap targets land, pop feel, ladder
      musical, letters-board fit; tune cell sizes + record values (STOP +
      owner fallback decision → two-page letters board if cells fail tuning)
- [ ] Task 2: Acceptance session (owner): zero-text audit; hostile fixtures;
      `qa-offline` cold start unchanged; perf spot-check; sign-off; docs
      finalize (tuned values recorded, dev/README QA table row, dated notes)
  - [ ] Commit + git note
- [ ] Task 3: Final gates `pnpm check && pnpm test` + coverage; `pnpm budget`;
      dist record; review summary
  - [ ] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
