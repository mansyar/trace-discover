# Implementation Plan: Parent Zone — one-finger gate, discovery hint, and zone finish

**Track ID:** `parent-zone_20260917`
**Specification:** [./spec.md](./spec.md)
**Branch:** `track/parent-zone`
**Methodology:** `conductor/workflow.md` — TDD per task (failing tests first,
then implementation, then coverage verification), commit + git note per task,
7-char commit SHA recorded here. Every phase ends with its Phase Verification &
Checkpoint task.

**Delivery strategy:** docs + persistence first, then the gate redesign (logic →
rendering → wiring), the one-time hint, the zone finish (section cards +
feedback), sound controls, install guide, and finally QA probes → device tuning
→ acceptance. All work stays local on `track/parent-zone` (push/PR/release is an
owner decision after acceptance). Two owner gates: hint copy + zone look
(screenshot approval), and a fallback decision (relaxed two-finger gate) if the
one-finger hold fails device tuning.

## Phase 1: Context docs resync + save foundation

- [ ] Task 1: Context docs resync
  - [ ] product.md: gate wording (two-finger gate → one-finger hold-to-open),
        parent feature list, dated note (previous tracks' style)
  - [ ] tech-stack.md: additive `settings.parentHintSeen`, one-finger gate
        semantics + tuned hold, platform/standalone detection note
  - [ ] README: sync only if wording touches the parent gate
  - [ ] Commit + git note
- [ ] Task 2: `parentHintSeen` save field (TDD)
  - [ ] Red: `loadSave` absent/non-boolean → `false`; roundtrip setter; v1–v3
        fixtures unchanged; reset preserves name + hint flag
  - [ ] Green: `src/save/store.ts` sanitizer + default; `src/app/app.ts` reset
        preserves
  - [ ] Verify coverage on new logic
  - [ ] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Gate redesign — one-finger hold, progress ring, open feedback

- [ ] Task 1: Gate logic (TDD)
  - [ ] Red: single qualifying pointer drives the hold; release before threshold
        drains/resets with no open; open fires once at threshold; progress 0→1
  - [ ] Green: `src/ui/parent.ts` (`PARENT_HOLD_MS` → ~2.5s target, progress
        helper, single-pointer semantics)
  - [ ] Verify coverage
  - [ ] Commit + git note
- [ ] Task 2: Ring + open feedback rendering
  - [ ] Corner arc that fills with the hold / drains on release + small sparkle
        burst on open (reuse particle helpers)
  - [ ] Screenshot evidence (harness)
  - [ ] Commit + git note
- [ ] Task 3: Shell wiring
  - [ ] `main.ts`: one-finger gate bookkeeping (≥1 pointer that started in the
        zone; up/cancel clears; resets off-menu); pop + burst on open;
        `targets()` `gate` id unchanged
  - [ ] Screenshots (mid-hold ring on a phone viewport)
  - [ ] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: One-time parent hint (discoverability)

- [ ] Task 1: Flag lifecycle (TDD)
  - [ ] Red: `parent-open` sets flag + persists immediately; reset preserves;
        hint predicate false after open, true when absent
  - [ ] Green: `src/app/app.ts`
  - [ ] Verify coverage
  - [ ] Commit + git note
- [ ] Task 2: Hint rendering + wiring
  - [ ] Menu hint near the gate corner (small parent-text card; non-blocking —
        not in `targets()`); copy placeholder pending owner screenshot approval
  - [ ] Screenshots: fresh save (hint) → after open + reload (gone)
  - [ ] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Zone finish — section cards + reactive feedback

- [ ] Task 1: Layout regroup (TDD)
  - [ ] Red: layout holds all nine actions in labeled sections (Sound / Play /
        Skin & Name / Data / Help); hit tests; no overlaps; phone + iPad bounds;
        trophies row display-only, repositioned
  - [ ] Green: `src/ui/parentZone.ts`
  - [ ] Verify coverage
  - [ ] Commit + git note
- [ ] Task 2: Card rendering + pressed/toggle feedback
  - [ ] `drawParent` restyle: card styling (white fill, navy outline, section
        labels), clear on/off states, pressed pulse, toggle animations; restart
        banner + install panel styling hooks
  - [ ] Screenshot set (all sections + states) → owner look approval
  - [ ] Commit + git note
- [ ] Task 3: Shell wiring for feedback (tap pulse timing; existing pop reused)
  - [ ] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5: Sound controls — pips, preview, auto-unmute

- [ ] Task 1: Logic (TDD)
  - [ ] Red: pips mapping (volume → 0–5); quieter/louder auto-unmutes; mute
        still toggles; preview note for the active instrument
  - [ ] Green: `src/ui/parent.ts` + `src/app/app.ts` + audio preview helper
        (reuse `synth.ts` presets)
  - [ ] Verify coverage
  - [ ] Commit + git note
- [ ] Task 2: Pips rendering + shell preview wiring
  - [ ] Pips row in the Sound card; preview note at the new level on each +/-;
        muted state dimmed
  - [ ] Screenshots (pips at min/mid/max + muted)
  - [ ] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 6: Install guide — platform-aware + installed detection

- [ ] Task 1: Detection (TDD)
  - [ ] Red: UA/display-mode inputs → variant (ios / android / generic /
        installed); iOS `navigator.standalone`; ambiguous → generic
  - [ ] Green: pure `src/ui/install.ts`
  - [ ] Verify coverage
  - [ ] Commit + git note
- [ ] Task 2: Panel rendering + shell wiring
  - [ ] Variant-aware steps + "All set" installed copy in finished card style;
        shell passes UA/matchMedia values
  - [ ] Screenshots (each variant, incl. simulated installed)
  - [ ] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 7: QA evidence, device tuning, acceptance, docs finalize

- [ ] Task 1: QA probe updates: single-pointer gate in `qa-name` /
      `qa-pre-pack` / `qa-teddy-screens`; `dev/screens.ts` `?screen=parent`; new
      `qa-parent-zone.mjs` (hint → hold → open → flag → reload → hint gone →
      sound → install variants → restart confirm → screenshots)
  - [ ] Commit + git note
- [ ] Task 2: Zero-text audit (hint = documented exception); hostile fixtures;
      `qa-offline` cold start unchanged; perf spot-check
  - [ ] Commit + git note
- [ ] Task 3: Device pass Android + iPad — one-handed gate feel, ring
      visibility, hint clarity, preview notes, install panel; tune hold within
      2.0–3.0s (STOP + owner fallback decision if one-finger fails)
- [ ] Task 4: Acceptance session (owner): sign-offs; docs finalize (final hold
      value, dev/README QA table, dated notes)
  - [ ] Commit + git note
- [ ] Task 5: Final gates `pnpm check && pnpm test` + coverage; `pnpm budget`;
      dist record; review summary
  - [ ] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
