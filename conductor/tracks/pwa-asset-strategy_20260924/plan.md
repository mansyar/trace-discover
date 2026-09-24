# Plan: PWA precache headroom and runtime asset strategy

**Track ID:** `pwa-asset-strategy_20260924`
**Branch:** `track/pwa-asset-strategy`
**Spec:** [spec.md](./spec.md)
**Status:** complete
**Created:** 2026-09-24

---

## Phase 1 — Baseline and cache contract [checkpoint: f48571e]

- [x] Task: Capture the current production and test baseline [26cfbe1]
  - [x] Build from the track base commit with `pnpm build`.
  - [x] Record total dist bytes, filesystem files, precache entries, generated service-worker manifest entries, and category totals.
  - [x] Record the current `pnpm budget` result and confirm the unchanged 6,000,000-byte / 200-entry ceilings.
  - [x] Run `CI=true pnpm check` and `CI=true pnpm test` to establish the pre-change baseline.

  **Baseline evidence (2026-09-24):** Fresh `pnpm build` passed. `pnpm budget` reported 199 dist files, 197 precache entries, 5,555,072 total bytes, and `sw.js` reporting the same 197 entries. Category totals: Rive 2,575,533 B; art 1,793,002 B (goal 855,212 B; sticker 446,716 B; pack 251,844 B; backgrounds 179,790 B; faces 59,440 B); generated assets 1,124,099 B; root 32,415 B; icons 30,023 B. Both fixed ceilings passed: 5,555,072 / 6,000,000 B and 197 / 200 entries. `CI=true pnpm check` passed; `CI=true pnpm test` passed with 59 test files and 754 tests.

- [x] Task: Define and test the critical/content cache contract
  - [x] Add failing tests for the classification of critical boot resources versus shipped content resources.
  - [x] Add failing tests proving every shipped pack and skin asset is included in the content warm-up set.
  - [x] Add failing tests for idempotent warm-up behavior and partial-failure recovery.
  - [x] Add a negative test proving critical boot resources cannot be omitted from the precache set.
  - [x] Run the focused tests and confirm the expected RED state before implementation.

  **Contract evidence (2026-09-24):** The initial focused run failed as intended because `src/pwa/contentCache.ts` did not exist; 754 existing tests passed and the new suite failed at the missing import. After the minimal implementation, the focused run passed with 60 test files and 758 tests. The suite covers critical/content/unclassified path classification, complete `art/` + `rive/` inventory, duplicate suppression, cache idempotence, and partial-failure recovery.

- [x] Task: Record the deliberate PWA strategy in the tech-stack document
  - [x] Add a dated entry describing the split precache/content boundary, first-load warm-up guarantee, cache invalidation/update policy, and unchanged offline guarantees.
  - [x] Keep the decision within the existing Vite/`vite-plugin-pwa`/Workbox architecture with no new runtime dependency.

  **Strategy evidence (2026-09-24):** `conductor/tech-stack.md` now records the critical/content split, background first-load warm-up, `NetworkFirst` runtime cache behavior, online refresh/offline fallback, and the unchanged waiting-service-worker guarantee. The entry is marked planned before Workbox wiring.

- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [x] Verify that the baseline is recorded before implementation.
  - [x] Verify the proposed strategy is documented before production code changes.
  - [x] Run the required phase tests and checkpoint the phase according to the workflow.

  **Phase 1 evidence (2026-09-24):** The RED run failed at the intended missing-module boundary with 754 existing tests passing. The GREEN contract run passed with 60 test files and 758 tests. `CI=true pnpm check` passed after the implementation and documentation updates. The deliberate strategy is documented in `conductor/tech-stack.md` before Vite/Workbox wiring.

---

## Phase 2 — Split precache and content warm-up implementation [checkpoint: ee5a1fe]

- [x] Task: Implement the critical precache policy
  - [x] Update `vite.config.ts` so the Workbox precache glob includes the app shell, HTML, JavaScript, CSS, WASM, manifest, icons, and other boot-critical files.
  - [x] Exclude only explicitly classified shipped content resources from precache.
  - [x] Add a maintainable classification mechanism with comments or constants explaining each resource class.

  **Precache evidence (2026-09-24):** `vite.config.ts` now keeps the existing critical extension set and adds explicit `globIgnores: ['**/art/**/*', '**/rive/**/*']`. `pnpm build && pnpm budget` passed with 10 generated service-worker precache entries, 5,555,589 B total, and the fixed 6,000,000 B / 200-entry ceilings. The budget tool now reports the generated SW manifest count rather than treating runtime-only files as precached.

- [x] Task: Implement the content runtime-cache policy
  - [x] Add the minimal Workbox runtime caching rules needed for the classified content assets.
  - [x] Ensure the cache policy cannot serve stale content across a new service-worker release.
  - [x] Keep update activation waiting-only and preserve the existing first-install `clientsClaim` behavior.
  - [x] Do not add loading UI, error UI, update prompts, analytics, or network services.

  **Runtime-cache evidence (2026-09-24):** `vite.config.ts` now registers a `NetworkFirst` rule for `/art/` and `/rive/` using the shared `trace-discover-content-v1` cache name, with a 3-second network timeout and 250-entry expiration. The generated `dist/sw.js` contains the rule; the existing `registerType: 'prompt'`, no-`skipWaiting`, and `clientsClaim` settings remain unchanged.

- [x] Task: Implement the first-session content warm-up
  - [x] Add a pure, testable content-asset URL inventory covering all shipped goal art, sticker art, pack cards, badges, backdrops, and Rive characters.
  - [x] Warm content after the first successful online boot using a non-blocking background schedule.
  - [x] Make warm-up requests bounded and idempotent so they do not block first input or duplicate work.
  - [x] Make partial warm-up failure safe: continue normal online play, retain successfully cached assets, and retry safely on a later boot.
  - [x] Avoid requiring a child to open each pack before the app can become wholly offline-capable.

  **Warm-up evidence (2026-09-24):** `src/pwa/contentCache.ts` derives the complete `art/` + `rive/` inventory from Vite public-asset globs, wraps the Cache API in an idempotent store, and schedules bounded background warming only when online. `src/main.ts` invokes it after boot and retries on the browser `online` event; no child-facing state or save behavior was added.

- [x] Task: Verify GREEN and preserve existing behavior
  - [x] Run the focused cache-policy and warm-up tests.
  - [x] Run the full unit suite with `CI=true pnpm test`.
  - [x] Run `CI=true pnpm check`.
  - [x] Confirm no save schema, level geometry, pack catalog, audio, Rive trigger, or child-facing UI behavior changed unintentionally.

  **GREEN evidence (2026-09-24):** Focused contract tests passed with 60 test files and 760 tests. Full `CI=true pnpm test` passed with 760 tests; `CI=true pnpm check` passed. The production build and budget gate passed with 10 precache entries and 5,555,589 B total.

- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [x] Build and inspect the generated service worker.
  - [x] Confirm the critical/content split is explicit and the warm-up contract is testable.
  - [x] Run the phase’s automated checks and checkpoint the phase according to the workflow.

  **Phase 2 evidence (2026-09-24):** Fresh build reported 10 SW precache entries and 5,555,589 B total; `pnpm budget` passed. Full tests and `CI=true pnpm check` passed. The generated SW contains the explicit `/art/` + `/rive/` `NetworkFirst` runtime route and the existing waiting-service-worker behavior.

---

## Phase 3 — Build, budget, offline, and update verification [checkpoint: e65315b]

- [x] Task: Validate the new production payload
  - [x] Run `pnpm build`.
  - [x] Run `pnpm budget`.
  - [x] Confirm the build has no more than 180 precache entries.
  - [x] Confirm the build remains at or below 6,000,000 bytes.
  - [x] Record category totals and the exact entry-count reduction.

  **Payload evidence (2026-09-24):** Fresh `pnpm build && pnpm budget` passed. The generated service worker reports 10 precache entries (187 fewer than the 197-entry baseline), with 199 dist files and 197 non-worker filesystem files. Total is 5,555,589 B, leaving 444,411 B under the 6,000,000 B ceiling. Categories: Rive 2,575,533 B; art 1,793,002 B; generated assets 1,131,315 B; icons 30,023 B; root 25,716 B.

- [x] Task: Extend or adjust production QA probes
  - [x] Extend the offline probe to wait for and assert the all-content warm-up condition.
  - [x] Prove offline cold start works after warm-up.
  - [x] Prove navigation, levels, rewards, backdrops, sticker art, pack cards, badges, and all registered skin assets are available offline.
  - [x] Assert zero uncaught page errors during warm-up and offline navigation.
  - [x] Keep the probes compatible with the existing headless-Edge QA workflow.

  **QA evidence (2026-09-24):** `qa-offline.mjs` waited for 187/187 content assets online, retained 187/187 after the offline cold reload, traced `pre-1` to success, and reported no page errors. The probe compares the runtime cache against all shipped `dist/art/` + `dist/rive/` files.

- [x] Task: Verify update lifecycle safety
  - [x] Run the existing update lifecycle probe.
  - [x] Confirm a downloaded update never takes over a running child session.
  - [x] Confirm activation occurs on the next cold start.
  - [x] Confirm content cached by the previous service worker is refreshed or safely superseded rather than served indefinitely.
  - [x] Confirm a failed or partial update leaves the current app playable.

  **Update evidence (2026-09-24):** `qa-update.mjs` passed all checks: the waiting worker did not claim or reload the running page, the synthetic content asset refreshed online through the runtime cache, the next cold start served vB, the updated content remained available offline, and no page errors occurred.

- [x] Task: Run performance and compatibility checks
  - [x] Run the production performance probe.
  - [x] Confirm first input is not delayed by warm-up work.
  - [x] Confirm boot, frame timing, and memory/resource behavior remain within the existing product budget.
  - [x] Run representative portrait and landscape browser journeys.

  **Performance evidence (2026-09-24):** `qa-smoke.mjs` passed with `pre-1` success and no page errors. `qa-perf.mjs` reported 130 ms cold boot, 2.4 ms input-to-next-frame, and 4.30 ms frame p95. `qa-landscape.mjs` passed the full portrait/landscape/rotation/tablet matrix with zero page errors.

- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [x] Record exact commands and outcomes for build, budget, coverage, smoke, offline, update, performance, portrait, and landscape checks.
  - [x] Confirm all acceptance criteria from the approved specification are satisfied.
  - [x] Perform the workflow’s manual-verification and checkpoint protocol.

  **Phase 3 evidence (2026-09-24):** Build/budget, `qa-offline`, `qa-update`, `qa-smoke`, `qa-perf`, and `qa-landscape` passed. The build remains under 6,000,000 B with 10 generated precache entries; whole-app offline content coverage is 187/187; update lifecycle and performance/compatibility checks are green. `CI=true pnpm check` and `pnpm pack:check` also passed after the QA changes.

---

## Phase 4 — Documentation, review, and closeout

- [x] Task: Update project documentation
  - [x] Add the deliberate PWA cache strategy and final measurements to `conductor/tech-stack.md`.
  - [x] Update the relevant dev/runbook instructions for the new warm-up and verification commands.
  - [x] Update this plan with final measurements, cache behavior, and any unresolved risk.
  - [x] Leave product definition and product guidelines unchanged because this track has no child-facing product change.

  **Documentation evidence (2026-09-24):** `conductor/tech-stack.md` now records the completed critical/content split, `trace-discover-content-v1` `NetworkFirst` behavior, background warm-up/retry/failure policy, 10-entry precache result, 5,555,589 B total, and unchanged update lifecycle. `dev/README.md` documents the production build/QA sequence and the expected 187/187 offline and update probe outcomes. No product or product-guideline change was made.

- [x] Task: Perform final self-review against the specification
  - [x] Confirm the final build has at most 180 precache entries.
  - [x] Confirm the final build remains at or below 6,000,000 bytes.
  - [x] Confirm every shipped pack and skin is available offline after warm-up.
  - [x] Confirm the update-on-next-launch and storage guarantees remain intact.
  - [x] Confirm no unrelated untracked files were modified or staged.

  **Self-review evidence (2026-09-24):** Fresh build reports 10 generated service-worker precache entries (187 fewer than the 197-entry baseline) and 5,555,589 B total, within the 180-entry target and 6,000,000 B ceiling. The complete generated `art/` + `rive/` inventory is 187/187 in the runtime cache after warm-up and remains 187/187 after an offline cold reload; the representative `pre-1` offline journey succeeds. The update probe proves the waiting worker, online content refresh, next-cold-start activation, offline updated content, and no running-session takeover. The save schema, storage behavior, child-facing UI, gameplay, audio, Rive triggers, and level geometry are unchanged. `git status` confirms the two pre-existing contact-sheet files remain untracked and untouched.

- [x] Task: Run the final quality gates
  - [x] Run `CI=true pnpm check`.
  - [x] Run `CI=true pnpm test --coverage`.
  - [x] Run `pnpm pack:check`.
  - [x] Run `pnpm build` and `pnpm budget`.
  - [x] Run the final production smoke, offline, update, and performance probes.

  **Final-gate evidence (2026-09-24):** `CI=true pnpm check` passed (Biome checked 132 files; TypeScript clean). `CI=true pnpm test --coverage` passed (60 files / 760 tests; 74.02% statements, 77.93% branches, 90.07% functions, 73.57% lines; configured thresholds passed). `pnpm pack:check` passed (2 tests). Fresh `pnpm build && pnpm budget` passed with 10 precache entries and 5,555,589 B. Final QA passed: `qa-offline` 187/187 warm-up and offline `pre-1`; `qa-update` all checks including waiting worker/no takeover/runtime refresh/next-launch/offline updated content; `qa-smoke`; `qa-perf` (150 ms cold boot, 2.9 ms input-to-frame, 4.30 ms frame p95); and `qa-landscape` full portrait/landscape/rotation/tablet matrix with zero page errors.

- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [x] Record the final evidence and owner feedback.
  - [x] Attach the required auditable verification report to functional commit `e65315b` as a git note, preserving the prior Phase 3 note and adding the Phase 4 closeout addendum.
  - [x] Commit the final closeout updates using the repository’s conductor plan-commit convention.
  - [x] Mark the track complete only if the approved measurable outcomes pass.

  **Closeout evidence (2026-09-24):** The owner explicitly confirmed the manual-verification protocol and expected outcomes. All automated gates and browser probes passed: 10 generated precache entries, 5,555,589 B total, 187/187 content warm-up and offline coverage, waiting-worker/update-on-next-launch behavior, smoke, performance, and full portrait/landscape/rotation/tablet compatibility with zero page errors. The required auditable report is attached to `e65315b` as an appended git note; the pre-existing Phase 3 note was preserved. Acceptance conclusion: PASS. Product definition and product guidelines remain unchanged.
