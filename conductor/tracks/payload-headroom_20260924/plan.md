# Plan: Payload headroom and asset diet

**Track ID:** `payload-headroom_20260924`
**Branch:** `track/payload-headroom`
**Spec:** [spec.md](./spec.md)
**Status:** new
**Created:** 2026-09-24

---

## Phase 1 — Baseline inventory and safe-candidate decision [checkpoint: 550d9d0]

- [x] Task: Capture the production baseline
  - [x] Build with `pnpm build` from the track base commit and record total dist bytes, precache entries, and category breakdown.
  - [x] Record the exact asset/file list contributing to the baseline, including Rive/WASM, raster art, generated JS/CSS, icons, and service-worker entries.
  - [x] Record the current `pnpm budget` result: 5,896,240 B / 6,000,000 B and 197 / 200 entries at track creation.

  **Evidence (2026-09-24):** `pnpm build && pnpm budget` passed. The build emitted 199 dist files, 197 precache entries, and `dist-budget: total 5896240 / 6000000 B - PASS`, `entries 197 / 200 - PASS`. Categories: Rive 2,575,533 B; art 2,134,170 B (goal 1,031,748 B; sticker 551,674 B; pack 311,518 B; bg 179,790 B; face 59,440 B); generated assets 1,124,099 B; root 32,415 B; icons 30,023 B. The exact file/size listing was captured from `find dist -type f -printf '%P %s\\n' | sort` and `find public -type f -printf '%P %s\\n' | sort`.
- [x] Task: Write failing tests for deterministic payload inventory
  - [x] Add a test for the inventory report's stable category totals and required fields before adding or changing any inventory tooling.
  - [x] Add a negative fixture proving missing or unreferenced shipped assets are reported rather than silently ignored.
  - [x] Run `CI=true pnpm test -- dev/tools/asset-inventory.test.ts` and confirm the new tests fail for the expected missing behavior. **RED confirmed:** missing `dev/tools/asset-inventory.mjs`; 748 existing tests passed.
- [x] Task: Implement or extend the dev-only inventory tool
  - [x] Add only the minimum deterministic reporting needed to produce the baseline categories and orphaned-asset evidence.
  - [x] Reuse existing project conventions and avoid production runtime dependencies.
  - [x] Run the focused inventory tests and confirm GREEN. **GREEN confirmed:** 751 tests passed; CLI reproduced 5,896,240 B / 197 entries with no unreferenced dist or public-only files.
- [x] Task: Select safe optimization candidates
  - [x] Rank candidates by measured savings, confidence of visual parity, and risk of breaking offline references.
  - [x] Exclude Rive behavior changes, runtime loading changes, required art, and unproven files.
  - [x] Document the selected candidates and expected headroom in this plan before modifying shipped assets.

  **Selected candidates (2026-09-24):** re-encode the 117 `public/art/{goal,sticker,pack}/**/*.webp` files at WebP quality 0.80 with unchanged dimensions, alpha, filenames, and URLs. Keep backgrounds at their existing q0.80 policy, faces at q0.85, and do not touch Rive/WASM or generated code. Do not remove any shipped asset. Representative q80 probes saved 10–20% per large goal/sticker/pack asset; the 1,894,940 B foreground set therefore has an estimated 190–380 KB savings range, with the exact full-stage measurement required before installation. The q80 floor is the first safe candidate; q75 remains available only if visual review and measured results justify it.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [x] Run the phase's focused tests and record the inventory command and output.
  - [x] Confirm the selected candidates satisfy the spec's fixed-ceiling and safe-asset boundaries.

  **Phase evidence (2026-09-24):** `CI=true pnpm test -- dev/tools/asset-inventory.test.ts` passed with 751 tests; the real-build inventory assertion passed at 5,896,240 B / 197 entries with `unreferencedDist: []` and `publicOnly: []`. Selected candidates remain q0.80 foreground WebP only, with no Rive/runtime/URL/removal scope. Awaiting owner manual-verification confirmation before checkpointing.

## Phase 2 — Safe asset optimization and budget re-measurement

- [ ] Task: Write failing tests for new optimization behavior
  - [ ] If a new optimizer or asset-pipeline change is required, write focused tests for deterministic output, allowed format/dimension behavior, and preservation of required URLs before implementation.
  - [ ] Add a negative test proving required offline assets cannot be removed by the optimization process.
  - [ ] Run the focused tests and confirm RED for the intended unimplemented behavior.
- [ ] Task: Implement the approved safe optimizations
  - [ ] Apply the documented re-encoding/metadata/dimension optimizations only to the selected candidates.
  - [ ] Remove a shipped file only when the inventory evidence proves it is unused by runtime, PWA, dev harness, QA, and approved source assets.
  - [ ] Keep source/approval artifacts and the current public asset URLs stable unless the spec explicitly permits a reviewed replacement.
  - [ ] Run the focused tests and confirm GREEN.
- [ ] Task: Re-measure the production build
  - [ ] Build with `pnpm build` and run `pnpm budget`.
  - [ ] Record absolute bytes, precache entries, category deltas, and remaining headroom against the unchanged 6.00 MB / 200-entry ceilings.
  - [ ] If either target is missed, stop before unrelated changes and record the exact shortfall for a separate owner decision; do not re-anchor the ceilings in this track.
- [ ] Task: Review the optimized assets
  - [ ] Inspect representative optimized assets for visual parity, alpha handling, dimensions, and file integrity.
  - [ ] Confirm approved source assets remain available for future regeneration and review.
  - [ ] Document every changed shipped file and its reason in the plan.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] Run the phase tests and production build evidence.
  - [ ] Confirm the measured result either meets 250 KB / 20 entries or is explicitly documented as blocked.

## Phase 3 — Regression, offline, and visual verification

- [ ] Task: Run the complete automated quality gates
  - [ ] Run `CI=true pnpm check`.
  - [ ] Run `CI=true pnpm test --coverage` and confirm coverage thresholds remain green.
  - [ ] Run `pnpm pack:check`.
  - [ ] Run `pnpm build` and `pnpm budget` against the unchanged ceilings.
- [ ] Task: Run production browser and offline QA
  - [ ] Run the existing production smoke journey via `dev/qa/qa-smoke.mjs` with zero uncaught page errors.
  - [ ] Run offline cold-start/pre-cache QA and confirm every required asset is available without network access.
  - [ ] Run representative pack-level QA for at least the pre-writing, letters, and patterns surfaces, plus the sticker board.
- [ ] Task: Perform visual regression review
  - [ ] Review menu, pack, level, success, badge, sticker-board, and parent-zone screenshots/art before and after optimization.
  - [ ] Confirm no visible cropping, transparency, color, scale, or canvas rendering regression was introduced.
  - [ ] Record any rejected candidate and the reason rather than shipping a questionable optimization.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] Record exact commands and outcomes for automated, browser, offline, and visual evidence.
  - [ ] Attach the phase verification report according to workflow.md and checkpoint the phase.

## Phase 4 — Documentation and closeout

- [ ] Task: Resynchronize project documentation
  - [ ] Update `dev/tools/dist-budget.mjs` history or its documented budget rationale if the measured baseline changes.
  - [ ] Update `conductor/tech-stack.md` only if a deliberate technical approach or documented decision was introduced.
  - [ ] Update the root/dev runbooks if asset commands, generated-file policy, or verification steps changed.
  - [ ] Record final measurements, optimization decisions, and any unresolved shortfall in this plan.
- [ ] Task: Final self-review against the specification
  - [ ] Confirm no runtime code, pack content, save schema, Rive behavior, dependency, or PWA semantics changed unintentionally.
  - [ ] Confirm the existing budget guard remains active locally and in CI.
  - [ ] Confirm the final status is complete only if both headroom targets are met; otherwise mark the track blocked with evidence.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] Run the final documented quality gates after documentation changes.
  - [ ] Perform the workflow's verification/checkpoint protocol and record owner feedback.
  - [ ] Commit the final closeout updates and attach the auditable summary.
