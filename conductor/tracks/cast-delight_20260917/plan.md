# Implementation Plan: Cast Delight — character presence pass

**Track ID:** `cast-delight_20260917`
**Specification:** [./spec.md](./spec.md)
**Branch:** `track/cast-delight`
**Methodology:** `conductor/workflow.md` — TDD per task (failing tests first,
then implementation, then coverage verification), commit + git note per task,
7-char commit SHA recorded here. Every phase ends with its Phase Verification &
Checkpoint task.

**Delivery strategy:** docs + character contract first; then the app-side
delight core (hit region → tap reaction → entrance, TDD, with harness preview
tooling for tuning); then one upgrade task per cast in its own
`dev/characters` workspace (giggle + flourish + idle beat; star additionally
gets its blinkpatch; per-cast build, ≤ ~500 KB check, screenshot evidence,
owner tuning in-task); finally QA probes → device tuning → acceptance → docs
finalize. All work stays local on `track/cast-delight` (push/PR/release is an
owner decision after acceptance). Budget ceilings stay unchanged (5.00 MB /
150 entries). Owner gates: per-cast screenshot approval
(giggle/flourish/idle/entrance) + Android/iPad device pass; fallback decision
if a flourish is rejected (shared second variant or keep the current celebrate —
documented per cast). Coordination: the in-flight `parent-zone` track owns the
gate/zone files (`src/ui/parent*.ts`, `store.ts`, its probes) — this track
avoids them; if parent-zone lands first, expect small `main.ts` + probe merge
conflicts, resolved by preserving both behaviors.

## Phase 1: Context docs resync + character contract [checkpoint: 9d25aee]

- [x] Task 1: Docs resync (9d25aee)
  - [x] `tech-stack.md`: character contract (autoplay idle + `celebrate` +
        `giggle` triggers; blinkpatch parity; entrance / tap / celebration
        semantics; QA additions), dated note
  - [x] `product.md`: character-presence wording + dated note (entrances, tap
        reactions, per-cast flourishes, idle life)
  - [x] `product-guidelines.md`: motion/audio lines for tap reactions +
        entrance (minimal; only where wording requires)
  - [x] README: reviewed — no character-wording sync needed
  - [x] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: App-side delight core (TDD) [checkpoint: 1b5d757]

- [x] Task 1: Mascot hit region (TDD) (51a1b96)
  - [x] Red: hit/slop cases around the parked mascot; per-screen park metadata;
        invariants — the region never overlaps the parent-gate corner or pack
        cards (phone + iPad field bounds)
  - [x] Green: pure hit helper (e.g. `src/ui/mascot.ts`) + tests; shell passes
        the existing park point/scale used by `positionCharacter`
  - [x] Verify coverage; commit + git note
- [x] Task 2: Tap → giggle reaction (TDD + wiring) (3e60b47)
  - [x] Red: re-fire cooldown (single note; animation restarts); instrument
        note selection from the active skin; sparkle burst trigger;
        `fire('giggle')` false-safe when a cast lacks the trigger
  - [x] Green: helpers + `main.ts` `handlers.onDown` wiring for menu/pack only
        (existing hits keep precedence; nothing fires during levels)
  - [x] Screenshot evidence (tap → giggle frames via harness); verify coverage;
        commit + git note
- [x] Task 3: Level-start entrance (TDD + wiring) (033999f)
  - [x] Red: entrance timeline helper (eased hop-in from the near edge over
        ~600–900 ms; `settle` semantics; early input settles immediately;
        always ends at rest)
  - [x] Green: helper + `startRun`/render wiring (level screen only; trace
        input untouched)
  - [x] Screenshot evidence (entrance frames + settled state); verify coverage;
        commit + git note
- [x] Task 4: Harness preview controls (1b5d757)
  - [x] `dev/screens.ts`: fire giggle / replay entrance / settle controls for
        tuning (dev-only)
  - [x] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Cast upgrades — five workspaces [checkpoint: aee7dfc]

- [x] Task 1: Dino upgrade (`dev/characters/dino4`) (03a6f14)
  - [x] Author giggle reaction (short, on-brand), signature flourish (fits the
        ~2 s celebrate stage), idle beat (subtle); rebuild `dino.riv`;
        ≤ ~500 KB check
  - [x] Screenshot set (idle beat / giggle / flourish) → owner confirmation;
        tune in-task
  - [x] Commit + git note
- [x] Task 2: Star upgrade (`dev/characters/star`, + blinkpatch) (b72247f)
  - [x] Compose star blink overlay art; add the blinkpatch technique matching
        the other four casts
  - [x] Author giggle + flourish + idle beat; rebuild; size check
  - [x] Screenshots → owner confirmation; commit + git note
- [x] Task 3: Excavator upgrade (`dev/characters/excavator`) (3f225d3)
  - [x] Giggle + flourish + idle beat authored; rebuilt; ≤ ~500 KB check
  - [x] Screenshots → owner confirmation; commit + git note
- [x] Task 4: Lion upgrade (`dev/characters/lion`) (7318dc2)
  - [x] Giggle + flourish + idle beat authored; rebuilt; ≤ ~500 KB check
  - [x] Screenshots → owner confirmation; commit + git note
- [x] Task 5: Teddy upgrade (`dev/characters/teddy`) (aee7dfc)
  - [x] Giggle + flourish + idle beat authored; rebuilt; ≤ ~500 KB check
  - [x] Screenshots → owner confirmation; commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md) — full-set
      consistency review + per-cast sign-off

## Phase 4: QA evidence, device tuning, acceptance, docs finalize

- [x] Task 1: QA probes (bbf17fc)
  - [x] New `qa-cast.mjs`: tap → giggle; entrance + settle; star blink;
        per-cast flourish; throttle; no-interference (cards / skin button /
        gate)
  - [x] Audit level-opening probes for entrance settle waits; update affected
        baselines
  - [x] Commit + git note
- [x] Task 2: Zero-text audit; hostile-save fixtures regression; `qa-offline`
      cold start; perf spot-check (boot/input baselines) (107b0f3)
  - [x] Commit + git note
- [~] Task 3: Device pass Android + iPad - entrance feel, tap generosity,
      giggle responsiveness, flourish visibility; tune; STOP + owner fallback
      decision if a flourish fails device review
- [ ] Task 4: Acceptance session (owner): per-cast sign-offs; docs finalize
      (measured durations/sizes, dev/README QA table, dated notes)
  - [ ] Commit + git note
- [ ] Task 5: Final gates `CI=true pnpm check && CI=true pnpm test` + coverage;
      `pnpm budget`; dist + per-cast `.riv` sizes recorded
  - [ ] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
