# Plan: PWA precache headroom and runtime asset strategy

**Track ID:** `pwa-asset-strategy_20260924`
**Branch:** `track/pwa-asset-strategy`
**Spec:** [spec.md](./spec.md)
**Status:** new
**Created:** 2026-09-24

---

## Phase 1 — Baseline and cache contract

- [x] Task: Capture the current production and test baseline
  - [x] Build from the track base commit with `pnpm build`.
  - [x] Record total dist bytes, filesystem files, precache entries, generated service-worker manifest entries, and category totals.
  - [x] Record the current `pnpm budget` result and confirm the unchanged 6,000,000-byte / 200-entry ceilings.
  - [x] Run `CI=true pnpm check` and `CI=true pnpm test` to establish the pre-change baseline.

  **Baseline evidence (2026-09-24):** Fresh `pnpm build` passed. `pnpm budget` reported 199 dist files, 197 precache entries, 5,555,072 total bytes, and `sw.js` reporting the same 197 entries. Category totals: Rive 2,575,533 B; art 1,793,002 B (goal 855,212 B; sticker 446,716 B; pack 251,844 B; backgrounds 179,790 B; faces 59,440 B); generated assets 1,124,099 B; root 32,415 B; icons 30,023 B. Both fixed ceilings passed: 5,555,072 / 6,000,000 B and 197 / 200 entries. `CI=true pnpm check` passed; `CI=true pnpm test` passed with 59 test files and 754 tests.

- [ ] Task: Define and test the critical/content cache contract
  - [ ] Add failing tests for the classification of critical boot resources versus shipped content resources.
  - [ ] Add failing tests proving every shipped pack and skin asset is included in the content warm-up set.
  - [ ] Add failing tests for idempotent warm-up behavior and partial-failure recovery.
  - [ ] Add a negative test proving critical boot resources cannot be omitted from the precache set.
  - [ ] Run the focused tests and confirm the expected RED state before implementation.

- [ ] Task: Record the deliberate PWA strategy in the tech-stack document
  - [ ] Add a dated entry describing the split precache/content boundary, first-load warm-up guarantee, cache invalidation/update policy, and unchanged offline guarantees.
  - [ ] Keep the decision within the existing Vite/`vite-plugin-pwa`/Workbox architecture with no new runtime dependency.

- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] Verify that the baseline is recorded before implementation.
  - [ ] Verify the proposed strategy is documented before production code changes.
  - [ ] Run the required phase tests and checkpoint the phase according to the workflow.

---

## Phase 2 — Split precache and content warm-up implementation

- [ ] Task: Implement the critical precache policy
  - [ ] Update `vite.config.ts` so the Workbox precache glob includes the app shell, HTML, JavaScript, CSS, WASM, manifest, icons, and other boot-critical files.
  - [ ] Exclude only explicitly classified shipped content resources from precache.
  - [ ] Add a maintainable classification mechanism with comments or constants explaining each resource class.

- [ ] Task: Implement the content runtime-cache policy
  - [ ] Add the minimal Workbox runtime caching rules needed for the classified content assets.
  - [ ] Ensure the cache policy cannot serve stale content across a new service-worker release.
  - [ ] Keep update activation waiting-only and preserve the existing first-install `clientsClaim` behavior.
  - [ ] Do not add loading UI, error UI, update prompts, analytics, or network services.

- [ ] Task: Implement the first-session content warm-up
  - [ ] Add a pure, testable content-asset URL inventory covering all shipped goal art, sticker art, pack cards, badges, backdrops, and Rive characters.
  - [ ] Warm content after the first successful online boot using a non-blocking background schedule.
  - [ ] Make warm-up requests bounded and idempotent so they do not block first input or duplicate work.
  - [ ] Make partial warm-up failure safe: continue normal online play, retain successfully cached assets, and retry safely on a later boot.
  - [ ] Avoid requiring a child to open each pack before the app can become wholly offline-capable.

- [ ] Task: Verify GREEN and preserve existing behavior
  - [ ] Run the focused cache-policy and warm-up tests.
  - [ ] Run the full unit suite with `CI=true pnpm test`.
  - [ ] Run `CI=true pnpm check`.
  - [ ] Confirm no save schema, level geometry, pack catalog, audio, Rive trigger, or child-facing UI behavior changed unintentionally.

- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] Build and inspect the generated service worker.
  - [ ] Confirm the critical/content split is explicit and the warm-up contract is testable.
  - [ ] Run the phase’s automated checks and checkpoint the phase according to the workflow.

---

## Phase 3 — Build, budget, offline, and update verification

- [ ] Task: Validate the new production payload
  - [ ] Run `pnpm build`.
  - [ ] Run `pnpm budget`.
  - [ ] Confirm the build has no more than 180 precache entries.
  - [ ] Confirm the build remains at or below 6,000,000 bytes.
  - [ ] Record category totals and the exact entry-count reduction.

- [ ] Task: Extend or adjust production QA probes
  - [ ] Extend the offline probe to wait for and assert the all-content warm-up condition.
  - [ ] Prove offline cold start works after warm-up.
  - [ ] Prove navigation, levels, rewards, backdrops, sticker art, pack cards, badges, and all registered skin assets are available offline.
  - [ ] Assert zero uncaught page errors during warm-up and offline navigation.
  - [ ] Keep the probes compatible with the existing headless-Edge QA workflow.

- [ ] Task: Verify update lifecycle safety
  - [ ] Run the existing update lifecycle probe.
  - [ ] Confirm a downloaded update never takes over a running child session.
  - [ ] Confirm activation occurs on the next cold start.
  - [ ] Confirm content cached by the previous service worker is refreshed or safely superseded rather than served indefinitely.
  - [ ] Confirm a failed or partial update leaves the current app playable.

- [ ] Task: Run performance and compatibility checks
  - [ ] Run the production performance probe.
  - [ ] Confirm first input is not delayed by warm-up work.
  - [ ] Confirm boot, frame timing, and memory/resource behavior remain within the existing product budget.
  - [ ] Run representative portrait and landscape browser journeys.

- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] Record exact commands and outcomes for build, budget, coverage, smoke, offline, update, performance, portrait, and landscape checks.
  - [ ] Confirm all acceptance criteria from the approved specification are satisfied.
  - [ ] Perform the workflow’s manual-verification and checkpoint protocol.

---

## Phase 4 — Documentation, review, and closeout

- [ ] Task: Update project documentation
  - [ ] Add the deliberate PWA cache strategy and final measurements to `conductor/tech-stack.md`.
  - [ ] Update the relevant dev/runbook instructions for the new warm-up and verification commands.
  - [ ] Update this plan with final measurements, cache behavior, and any unresolved risk.
  - [ ] Leave product definition and product guidelines unchanged because this track has no child-facing product change.

- [ ] Task: Perform final self-review against the specification
  - [ ] Confirm the final build has at most 180 precache entries.
  - [ ] Confirm the final build remains at or below 6,000,000 bytes.
  - [ ] Confirm every shipped pack and skin is available offline after warm-up.
  - [ ] Confirm the update-on-next-launch and storage guarantees remain intact.
  - [ ] Confirm no unrelated untracked files were modified or staged.

- [ ] Task: Run the final quality gates
  - [ ] Run `CI=true pnpm check`.
  - [ ] Run `CI=true pnpm test --coverage`.
  - [ ] Run `pnpm pack:check`.
  - [ ] Run `pnpm build` and `pnpm budget`.
  - [ ] Run the final production smoke, offline, update, and performance probes.

- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] Record the final evidence and owner feedback.
  - [ ] Attach the required auditable verification report.
  - [ ] Commit the final closeout updates using the repository’s conductor plan-commit convention.
  - [ ] Mark the track complete only if the approved measurable outcomes pass.
