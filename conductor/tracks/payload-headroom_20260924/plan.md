# Plan: Payload headroom and asset diet

**Track ID:** `payload-headroom_20260924`
**Branch:** `track/payload-headroom`
**Spec:** [spec.md](./spec.md)
**Status:** complete
**Created:** 2026-09-24

**Owner-approved closeout amendment (2026-09-24):** The original exploratory target was 250 KB of size headroom and 20 precache-entry slots. The measured result is 444,928 B of size headroom and 3 entry slots (197 / 200). The owner accepted the measured entry result for this asset-only chore; reducing the remaining 17 entries is deferred to a separate PWA/asset-strategy track. The 6.00 MB / 200-entry ceilings remain unchanged.

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

  **Selected candidates (2026-09-24):** re-encode the 169 `public/art/{goal,sticker,pack}/**/*.webp` files at WebP quality 0.80 with unchanged dimensions, alpha, filenames, and URLs. Keep backgrounds at their existing q0.80 policy, faces at q0.85, and do not touch Rive/WASM or generated code. Do not remove any shipped asset. Representative q80 probes saved 10–20% per large goal/sticker/pack asset; the 1,894,940 B foreground set therefore has an estimated 190–380 KB savings range, with the exact full-stage measurement required before installation. The q80 floor is the first safe candidate; q75 remains available only if visual review and measured results justify it.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [x] Run the phase's focused tests and record the inventory command and output.
  - [x] Confirm the selected candidates satisfy the spec's fixed-ceiling and safe-asset boundaries.

  **Phase evidence (2026-09-24):** `CI=true pnpm test -- dev/tools/asset-inventory.test.ts` passed with 751 tests; the real-build inventory assertion passed at 5,896,240 B / 197 entries with `unreferencedDist: []` and `publicOnly: []`. Selected candidates remain q0.80 foreground WebP only, with no Rive/runtime/URL/removal scope. Awaiting owner manual-verification confirmation before checkpointing.

## Phase 2 — Safe asset optimization and budget re-measurement

- [x] Task: Write failing tests for new optimization behavior
  - [x] If a new optimizer or asset-pipeline change is required, write focused tests for deterministic output, allowed format/dimension behavior, and preservation of required URLs before implementation.
  - [x] Add a negative test proving required offline assets cannot be removed by the optimization process.
  - [x] Run the focused tests and confirm RED for the intended unimplemented behavior. **RED confirmed:** missing `dev/tools/webp-diet.mjs`; 751 existing tests passed.
- [x] Task: Implement the approved safe optimizations
  - [x] Apply the documented re-encoding/metadata/dimension optimizations only to the selected candidates.
  - [x] Remove a shipped file only when the inventory evidence proves it is unused by runtime, PWA, dev harness, QA, and approved source assets. **No files removed:** inventory found no unreferenced dist or public-only assets.
  - [x] Keep source/approval artifacts and the current public asset URLs stable unless the spec explicitly permits a reviewed replacement. **Verified:** 169 WebP paths, dimensions, alpha channels, and URLs preserved.
  - [x] Run the focused tests and confirm GREEN. **GREEN confirmed:** 754 tests passed with `CI=true pnpm test -- dev/tools/webp-diet.test.ts`.
- [x] Task: Re-measure the production build
  - [x] Build with `pnpm build` and run `pnpm budget`.
  - [x] Record absolute bytes, precache entries, category deltas, and remaining headroom against the unchanged 6.00 MB / 200-entry ceilings.
  - [x] If either target is missed, stop before unrelated changes and record the exact shortfall for a separate owner decision; do not re-anchor the ceilings in this track. **Shortfall:** 5,555,072 B / 6,000,000 B gives 444,928 B size headroom, but 197 / 200 entries gives only 3 entry slots; target requires 20, a 17-entry shortfall.

  **Measured result (2026-09-24):** q0.75 foreground candidates reduced `public/art` from 2,134,170 B to 1,793,002 B (−341,168 B). Final dist: 5,555,072 B; categories: Rive 2,575,533 B, art 1,793,002 B (goal 855,212 B; sticker 446,716 B; pack 251,844 B; bg 179,790 B; face 59,440 B), assets 1,124,099 B, root 32,415 B, icons 30,023 B. `pnpm budget` passed both fixed ceilings.
- [x] Task: Review the optimized assets
  - [x] Inspect representative optimized assets for visual parity, alpha handling, dimensions, and file integrity.
  - [x] Confirm approved source assets remain available for future regeneration and review.
  - [x] Document every changed shipped file and its reason in the plan. **Review:** q0.75 side-by-side review passed for representative goal, sticker, and pack assets, including the highest-difference `sticker/pre-bonus-3.webp` sample. Changed set: 169 files under `public/art/{goal,sticker,pack}/`; all changed to reviewed q0.75 WebP candidates with stable paths.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [x] Run the phase tests and production build evidence. **PASS:** `CI=true pnpm check`, coverage (73.62 / 77.75 / 89.79 / 73.17), `pnpm pack:check`, build, budget, and inventory assertion all pass; 754 tests pass.
  - [x] Confirm the measured result either meets 250 KB / 20 entries or is explicitly documented as blocked. **Original target outcome:** size target met (444,928 B headroom); entry target missed by 17 (3 slots available vs 20 required). The owner-approved closeout accepts the measured 3-slot result and defers the remaining 17-entry reduction to a separate PWA/asset-strategy track; no ceiling re-anchor or scope expansion occurred.

## Phase 3 — Regression, offline, and visual verification

- [x] Task: Run the complete automated quality gates
  - [x] Run `CI=true pnpm check`.
  - [x] Run `CI=true pnpm test --coverage` and confirm coverage thresholds remain green. **PASS:** 754 tests; coverage 73.62 / 77.75 / 89.79 / 73.17.
  - [x] Run `pnpm pack:check`.
  - [x] Run `pnpm build` and `pnpm budget` against the unchanged ceilings. **PASS:** 5,555,072 B / 6,000,000 B and 197 / 200 entries.
- [x] Task: Run production browser and offline QA
  - [x] Run the existing production smoke journey via `dev/qa/qa-smoke.mjs` with zero uncaught page errors. **PASS:** production smoke traced `pre-1` successfully.
  - [x] Run offline cold-start/pre-cache QA and confirm every required asset is available without network access. **PASS:** offline cold start and trace completed.
  - [x] Run representative pack-level QA for at least the pre-writing, letters, and patterns surfaces, plus the sticker board. **PASS:** Patterns 9/9, Letters 29/29, and Sticker Play completed with zero page errors.
- [x] Task: Perform visual regression review
  - [x] Review representative goal, sticker, and pack WebP candidates before installation. **PASS:** q0.75 side-by-side review included the highest-difference `sticker/pre-bonus-3.webp` sample.
  - [x] Confirm no visible cropping, transparency, color, scale, or canvas rendering regression was introduced. **PASS:** candidate dimensions, alpha channels, filenames, and URLs were preserved; production QA reported no page errors.
  - [x] Record any rejected candidate and the reason rather than shipping a questionable optimization. **q0.80 rejected:** saved only 187,928 B, below the target; q0.75 was selected only after review and measured 341,168 B savings.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [x] Record exact commands and outcomes for automated, browser, offline, and visual evidence. **PASS:** all related gates and QA journeys completed against the optimized production build.
  - [x] Attach the phase verification report according to workflow.md and checkpoint the phase.

**Phase 3 evidence (2026-09-24):** Automated gates passed with 754 tests; production smoke, offline cold start/trace, Patterns 9/9, Letters 29/29, and Sticker Play completed with zero page errors. Representative q0.75 WebP review passed for goal, sticker, and pack assets, including `sticker/pre-bonus-3.webp`. No child-facing or parent-facing surface regression was observed in the completed QA scope.

## Phase 4 — Documentation and closeout

- [x] Task: Resynchronize project documentation
  - [x] Update `dev/tools/dist-budget.mjs` history or its documented budget rationale if the measured baseline changes. **PASS:** record the optimized measurement without changing the 6.00 MB / 200-entry ceilings.
  - [x] Update `conductor/tech-stack.md` only if a deliberate technical approach or documented decision was introduced. **PASS:** documented the dev-only inventory/WebP-diet approach and the deferred PWA follow-up; no runtime stack change.
  - [x] Update the root/dev runbooks if asset commands, generated-file policy, or verification steps changed. **PASS:** documented the staged review/install workflow and verification commands.
  - [x] Record final measurements, optimization decisions, and any unresolved shortfall in this plan. **PASS:** final build is 5,555,072 B with 444,928 B size headroom and 3 / 200 entry slots; the 17-entry reduction is deferred.
- [x] Task: Final self-review against the specification
  - [x] Confirm no runtime code, pack content, save schema, Rive behavior, dependency, or PWA semantics changed unintentionally. **PASS:** only dev tooling, coverage configuration, 169 foreground WebPs, and Conductor/docs artifacts changed.
  - [x] Confirm the existing budget guard remains active locally and in CI. **PASS:** `pnpm budget` remains unchanged and passes.
  - [x] Confirm the final status is complete only if both original targets are met; otherwise mark the track blocked with evidence. **Original target was not fully met.** Owner-approved closeout scope completed the 250 KB size target, recorded the 3-slot entry result, and deferred the 17-entry shortfall to a separate PWA/asset-strategy track.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [x] Run the final documented quality gates after documentation changes. **PASS:** `pnpm check`, coverage, pack validation, build, budget, and inventory gates pass.
  - [x] Perform the workflow's verification/checkpoint protocol and record owner feedback. **PASS:** owner accepted the measured result and deferred the separate PWA follow-up.
  - [x] Commit the final closeout updates and attach the auditable summary.

**Phase 4 evidence (2026-09-24):** Documentation now records the unchanged 6.00 MB / 200-entry ceilings, the 5,555,072 B final build, the reviewed 169-file q0.75 foreground WebP diet, and the explicit 17-entry PWA follow-up. Product definition and product guidelines require no change because this track introduces no product, save, gameplay, branding, or tone change.
