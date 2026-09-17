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

## Phase 1: Context docs resync + save foundation [checkpoint: 59fdd5f]

- [x] Task 1: Context docs resync (a93184d)
  - [x] product.md: gate wording (two-finger gate → one-finger hold-to-open),
        parent feature list, dated note (previous tracks' style)
  - [x] tech-stack.md: additive `settings.parentHintSeen`, one-finger gate
        semantics + tuned hold, platform/standalone detection note
  - [x] README: no gate wording found — unchanged
  - [x] product-guidelines.md: one-line gate phrase fix (owner-approved)
  - [x] Commit + git note
- [x] Task 2: `parentHintSeen` save field (TDD) (59fdd5f)
  - [x] Red: `loadSave` absent/non-boolean → `false`; roundtrip setter; v1–v3
        fixtures unchanged; reset preserves name + hint flag
  - [x] Green: `src/save/store.ts` sanitizer + default; `src/app/app.ts` reset
        preserves
  - [x] Verify coverage on new logic
  - [x] Commit + git note
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) (59fdd5f)

## Phase 2: Gate redesign — one-finger hold, progress ring, open feedback [checkpoint: eb22ea0]

- [x] Task 1: Gate logic (TDD) (b8c6c38)
  - [x] Red: release drains gradually (and resumes from the drained level) with
        no open; open fires once at threshold
  - [x] Green: `src/ui/parent.ts` (`PARENT_HOLD_MS` = 2500 target, drain at 5×
        fill rate, `holdProgress` helper; single-pointer shell semantics land
        in Task 3)
  - [x] Verify coverage (100% on parent.ts)
  - [x] Commit + git note
- [x] Task 2: Ring + open feedback rendering (c6d6e45)
  - [x] Corner arc that fills with the hold / drains on release + small sparkle
        burst on open (reuse particle helpers; `drawParticles` extracted)
  - [x] Screenshot evidence (harness; `qa-gate-ring.mjs` → out/menu-gate-ring.png,
        ring + burst visually confirmed)
  - [x] Commit + git note
- [x] Task 3: Shell wiring (eb22ea0)
  - [x] `main.ts`: one-finger gate bookkeeping (≥1 pointer that started in the
        zone; up/cancel clears; resets off-menu); pop + burst on open;
        `targets()` `gate` id unchanged
  - [x] Screenshots (mid-hold ring + opened zone; out/live-gate-*.png, visually
        confirmed)
  - [x] Commit + git note
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) (eb22ea0)

## Phase 3: One-time parent hint (discoverability) [checkpoint: a3e2550]

- [x] Task 1: Flag lifecycle (TDD) (8bc0123)
  - [x] Red: `parent-open` sets flag + predicate tests (reset-preserve already
        covered by the Phase 1 app test)
  - [x] Green: `src/app/app.ts` (`parent-open` marks the flag;
        `shouldShowParentHint`)
  - [x] Verify coverage (app.ts 97.4% stmts / 95.8% branch)
  - [x] Commit + git note
- [x] Task 2: Hint rendering + wiring (923dc4f)
  - [x] Menu hint near the gate corner (small parent-text card; non-blocking —
        not in `targets()`); copy "Hold here to open / Grown-ups" owner-approved;
        corner dot pulses while the hint is up (a3e2550)
  - [x] Screenshots: fresh save (hint + pulse) → after open + reload (gone)
  - [x] Commit + git note
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) (a3e2550)

## Phase 4: Zone finish — section cards + reactive feedback [checkpoint: 97e2788]

- [~] Task 1: Layout regroup (TDD)
  - [ ] Red: layout holds all nine actions in labeled sections (Sound / Play /
        Skin & Name / Data / Help); hit tests; no overlaps; phone + iPad bounds;
        trophies row display-only, repositioned
  - [ ] Green: `src/ui/parentZone.ts`
  - [ ] Verify coverage
  - [ ] Commit + git note
- [x] Task 2: Card rendering + pressed/toggle feedback (e3c1530)
  - [x] `drawParent` restyle: card styling (white fill, navy outline, section
        labels), clear on/off states, pressed pulse, toggle animations; restart
        banner + install panel styling hooks
  - [x] Screenshot set (all sections + states) → approved by owner
  - [x] Commit + git note
- [x] Task 3: Shell wiring for feedback (tap pulse timing; existing pop reused) (97e2788)
  - [x] Commit + git note
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) (97e2788)

## Phase 5: Sound controls — pips, preview, auto-unmute

- [x] Task 1: Logic (TDD) (ce287ab)
  - [x] Red: pips mapping (volume → 0–5); quieter/louder auto-unmutes; mute
        still toggles; preview note for the active instrument
  - [x] Green: `src/ui/parent.ts` (volumePips) + `src/app/app.ts` (step-to-unmute)
        + `src/audio/synth.ts` (playVolumePreview reusing presets)
  - [x] Verify coverage (parent.ts 100%; synth.ts 97.4%, app.ts 97.4%)
  - [x] Commit + git note
- [x] Task 2: Pips rendering + shell preview wiring (437965b)
  - [x] Pips row in the Sound card; preview note at the new level on each +/-;
        muted state dimmed
  - [x] Screenshots (pips at min/mid/max + muted; pixel-verified 5/3/0 fills)
  - [x] Commit + git note
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
