# Plan: Offline-first-run resilience

**Track ID:** `offline-resilience_20260924`
**Branch:** `track/offline-resilience`
**Spec:** [spec.md](./spec.md)
**Status:** new
**Created:** 2026-09-24

---

## Phase 1 — Baseline, deliberate documentation, and gate budget [checkpoint: 88faa77]

- [x] Task: Capture the current production and test baseline [d5bde5b]
  - [x] Build from the track base commit with `pnpm build`.
  - [x] Record total dist bytes, filesystem files, generated precache entries, and the `pnpm budget` result against the unchanged 6,000,000 B / 200-entry ceilings.
  - [x] Run `CI=true pnpm check` and `CI=true pnpm test` to establish the pre-change baseline.
  - [x] Run `qa-offline.mjs` and `qa-perf.mjs` from the production preview and record the warm-up wall clock, cold boot, input-to-frame, and frame p95.

  **Baseline evidence (2026-09-24):** Fresh `pnpm build` passed (precache 10 entries, 1135.92 KiB). `pnpm budget` passed both unchanged ceilings: 5,555,589 / 6,000,000 B and 10 / 200 entries (199 dist files; 197 filesystem non-worker files). `CI=true pnpm check` passed (Biome 132 files, TypeScript clean). `CI=true pnpm test` passed with 60 test files and 760 tests. `qa-offline.mjs` passed: 187/187 content warm-up online, 187/187 retained after the offline cold reload, `pre-1` traced to success, no page errors. `qa-perf.mjs` reported 262 ms boot to interactive (domContentLoaded 116 ms, load 210 ms), 1.7 ms input-to-next-frame, and frame intervals n=1549 mean 4.43 ms / p50 4.20 ms / p95 4.30 ms / max 133.40 ms, no page errors; the 262 ms figure sits well above the 130–150 ms recorded on the previous track, so it is treated as run/machine variance to be re-checked at closeout.

  **Warm-up wall clock (2026-09-24):** With a fresh browser context and page-level CDP throttling, the content cache reached 187/187 in 3.9 s at Fast 3G and 7.6 s at Slow 3G, stepping 0 → 42 → 160 → 187 at roughly one-second intervals. The emulation demonstrably throttles page requests (boot to interactive rose from 852 ms to 2521 ms) but **not** service-worker fetches — 4.37 MB of content cannot cross a 400 kbps link in 7.6 s — so real-network warm-up time is **not** measurable with this instrument and the fast figures must not be read as 3G behaviour. Because `warmContentAssets` is serial, the honest worst-case estimate for a real 400 kbps / 400 ms link is ~90–160 s of sequential fetching; that estimate is the basis for the offline escape (FR3/FR4), bounded retries (FR3), and the concurrency change (FR2). Temporary instrumentation lived at `dev/qa/out/warmup-timing.mjs` (git-ignored); the permanent probe arrives in Phase 6.
- [x] Task: Record the deliberate readiness-gate strategy before implementation [e7ac437]
  - [x] Add a dated `tech-stack.md` entry covering the readiness gate and the warm-up progress/retry contract.
  - [x] Record the deliberate relaxation of the "no spinners" and "never urgent" guidelines in `product-guidelines.md`, including its limits (drawn only, no text, no failure state, three exits).
  - [x] State explicitly that the precache policy and the update lifecycle are unchanged.

  **Strategy evidence (2026-09-24):** `conductor/tech-stack.md` carries a dated entry describing the readiness gate, the warm-up progress/retry contract, the shared drawn mascot primitive, the three gate exits, and the deliberate guideline relaxation, with the precache boundary, the `NetworkFirst` + `trace-discover-content-v1` runtime cache, the waiting-service-worker update lifecycle, and the save schema explicitly declared unchanged. `conductor/product-guidelines.md` gains an `## Amendments` section recording the narrowing (not discarding) of UX Principle 6 and the never-urgent rule, including its limits: no text or numbers, skipped when the cache is complete, skipped when offline, released after bounded retries. Both notes are recorded before any production code and reference `workflow.md` (Tech Stack is Deliberate).
- [x] Task: Fix the gate's measurable budget [88faa77]
  - [x] Define the gate's exit conditions in writing (cache complete · offline · retries exhausted).
  - [x] Define the attempts/backoff/concurrency defaults so the gate has a bounded worst case.
  - [x] Define the indicator's progress definition (`resolved / total`) so a stalled indication is detectable in review.
  - [x] Confirm the drawn gate needs zero new shipped bytes and record the expected payload delta (~0).

  **Gate budget (2026-09-24, fixed before implementation):**

  | Item | Value |
  | --- | --- |
  | Progress | `resolved / total`, emitted after every asset resolution; `total` = unique deduped inventory (187 shipped today); `resolved` = already-cached + newly-cached + exhausted-failed; monotonic; reaches `total` once; render clamps to 0..1 |
  | Concurrency | 6 in flight by default (never exceeded) |
  | Attempts | 3 per asset, backoff 250 ms then 750 ms (delay injectable; no attempt after the third) |
  | Fetch-attempt ceiling | `attempts × total` (≤ 561 today); warm-up stays idempotent and retains successes across boots |
  | Exits | cache complete · device offline at decision time · attempts exhausted |
  | Warm-boot cost | zero when the cache is complete (gate skipped, no added work) |
  | Payload delta | 0 shipped bytes (gate and stand-in are drawn on canvas); precache stays 10 entries; ceilings unchanged at 6,000,000 B / 200 with 444,411 B headroom |

  **Deliberately rejected exit:** a wall-clock deadline. Releasing on elapsed time alone would abandon a slow-but-working link to drawn stand-ins, which contradicts the owner's chosen policy (bounded retries, then proceed). **Accepted residual risk:** a very slow but functioning connection can hold the gate for minutes; re-examined against real-network behaviour at the Phase 6 device pass. Nothing is at risk when that happens — the save is untouched and a closed session loses nothing.

  **Expected benefit of the concurrency change:** on a 400 ms-RTT link the serial loop costs ~187 sequential round trips (the ~90–160 s estimate above); at concurrency 6 the same work becomes ~31 rounds — roughly an order of magnitude less latency-bound and transfer-bound instead.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [x] Verify the baseline is recorded before any production change.
  - [x] Verify the strategy and guideline amendment are documented before implementation.
  - [x] Run the phase's automated checks and checkpoint the phase according to the workflow.

  **Phase 1 evidence (2026-09-24):** `CI=true pnpm test` passed (60 files / 760 tests) and `CI=true pnpm check` is clean, run after the documentation changes. Every file this phase touched is Markdown, so the phase-coverage step found no code file needing a sibling test. The baseline (`d5bde5b`) was recorded before the strategy notes (`e7ac437`) and the gate budget (`88faa77`), so the deliberate documentation precedes all production code as `workflow.md` requires. The owner explicitly confirmed the recorded decisions, the pinned budget, the rejected wall-clock exit, and the CDP measurement limitation; the auditable verification report is appended to `88faa77` as a git note.

---

## Phase 2 — Warm-up progress and retry contract

- [x] Task: Write failing tests for incremental warm-up progress [646cb6d]
  - [x] Report progress after every resolved asset, counting already-cached assets as resolved.
  - [x] Prove progress is monotonic and reaches `total` exactly once.
  - [x] Prove an empty inventory resolves with a single `0 / 0` report.
  - [x] Run the focused suite and confirm the expected RED state before implementation.

  **RED evidence (2026-09-24):** Focused `CI=true pnpm exec vitest run src/pwa/contentCache.test.ts` failed as intended with 3 failed / 7 passed. The three new progress tests fail because `warmContentAssets` accepts no options today, so no reports are emitted (the monotonicity assertion receives an empty list and `Math.max()` yields `-Infinity`), while all seven pre-existing content-cache tests still pass — the Red state is the missing behavior, not a broken harness. The new suite asserts report *shape* (one resolution per asset, constant totals, no repeated resolution, final resolution equal to the inventory size, already-cached assets counted as resolved) rather than a strict emission order, so it remains valid once bounded concurrency lands. The one pre-existing partial-failure test now injects `retryDelayMs: () => 0` so the upcoming retry default cannot slow the suite; its expectations are unchanged.
- [x] Task: Write failing tests for concurrency and retry behavior [b82c9cf]
  - [x] Prove the in-flight count never exceeds the configured concurrency.
  - [x] Prove a transient failure is retried up to the configured attempts and a later success is retained.
  - [x] Prove an exhausted asset is reported as failed and still counts as resolved for progress.
  - [x] Prove one failing asset never blocks or discards another asset's successful cache write.
  - [x] Run the focused suite and confirm the expected RED state.

  **RED evidence (2026-09-24):** Focused run reported 6 failed / 8 passed. The concurrency test fails because the serial loop never overlaps work (peak in-flight stays 1, so `expect(peak).toBeGreaterThan(1)` fails), the retry tests fail because a thrown `add` is never re-attempted (attempt count stays 1) and the injected backoff is never called, and the three progress tests remain Red pending the Green step. The test that proves a permanently failing asset cannot discard another asset's cached result already passes against the serial implementation; it is retained deliberately as a characterization guard on behavior the Green step must not break rather than as a Red assertion. The retry contract is pinned precisely: `retryDelayMs(attempt)` receives the 1-based attempt that just failed and is not called after the final attempt (`[1, 2]` for `attempts: 3`).
- [x] Task: Implement the progress, concurrency, and retry contract [0cf618e]
  - [x] Add injectable `onProgress`, `concurrency`, `attempts`, and retry-delay options with documented defaults.
  - [x] Keep the injected `schedule(…)` semantics and the online gate of the scheduling entry point unchanged for existing callers.
  - [x] Return the accumulated result so a caller can observe completion, failures, and exhausted assets.
  - [x] Keep the module dependency-free (no timers, no globals) so every behavior stays unit-testable.

  **GREEN evidence (2026-09-24):** Focused `CI=true pnpm exec vitest run src/pwa/contentCache.test.ts` passed 15/15 in 33 ms (the injected zero-delay keeps the suite free of real backoff). Full `CI=true pnpm test` passed with 60 files / 769 tests; `CI=true pnpm check` clean (Biome 132 files, TypeScript strict with `noUncheckedIndexedAccess` — the lane pool indexes the inventory through an explicit `undefined` guard rather than a non-null assertion). `contentCache.ts` coverage rose to 98.27 statements / 84 branches / 100 functions / 98.24 lines (from 91.37 / 76 / 78.57 / 91.22); global coverage 74.31 / 78.01 / 90.2 / 73.87 sits above both the enforced thresholds (72 / 76 / 88 / 72) and the pre-track baseline (74.02 / 77.93 / 90.07 / 73.57).

  **Implementation notes:** defaults are `attempts: 3`, `concurrency: 6`, and backoff `250 ms` then `750 ms` (any further attempt reuses the last delay); `retryDelayMs(attempt)` receives the 1-based attempt that just failed and is never called after the final attempt. Concurrency is clamped to the inventory size, so an empty inventory resolves with a single `0 / 0` report and no store access. `scheduleContentWarmup` is untouched — its signature, injected `schedule(…)` semantics, and online gate behave exactly as before, which the pre-existing scheduling test still proves.

  **Coverage gap closed in this step:** the first coverage run showed `contentCache.ts` lines 73–78 uncovered — the *default* backoff path, which only executes in the real app. A fake-timer test now pins the schedule precisely (one attempt at 0 ms, no retry at 249 ms, second attempt at 250 ms, none at 999 ms, third at 1000 ms, then a permanent failure), removing the last untested production timing value from this module.
- [ ] Task: Verify GREEN and preserve existing behavior
  - [ ] Run the focused warm-up tests, then the full suite with `CI=true pnpm test`.
  - [ ] Run `CI=true pnpm check`.
  - [ ] Confirm no precache policy, cache name, save, or child-facing behavior changed.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] Confirm the progress contract alone is sufficient for a truthful indication.
  - [ ] Confirm the warm-up remains idempotent and retains successful work.
  - [ ] Run the phase's automated checks and checkpoint the phase according to the workflow.

---

## Phase 3 — Pure readiness gate and reducer enforcement

- [ ] Task: Write failing tests for the readiness decision
  - [ ] Complete cache → ready immediately, with no gate presented.
  - [ ] Incomplete cache while offline → ready immediately, never waiting on work that cannot finish.
  - [ ] Incomplete cache while online → not ready until the warm-up resolves.
  - [ ] Warm-up resolving with exhausted failures → ready, with the failures surfaced for dev QA.
  - [ ] Prove readiness resolves exactly once and cannot reverse on later signals.
- [ ] Task: Implement the readiness module
  - [ ] Add a pure readiness module exposing the decision plus the gate state derived from warm-up progress.
  - [ ] Accept injected connectivity, warm-up, and timer hooks so every branch is testable without a browser.
  - [ ] Expose the progress fraction the gate renders, clamped to 0..1.
- [ ] Task: Write failing tests for reducer-enforced gating
  - [ ] Prove the start state holds `contentReady === false`.
  - [ ] Prove `splash-tap` while not ready leaves the screen on `splash`.
  - [ ] Prove a readiness event opens the gate exactly once and a later `splash-tap` reaches the menu.
  - [ ] Prove readiness does not alter save, sticker, badge, or progress state.
- [ ] Task: Implement the reducer gate
  - [ ] Add the readiness flag and readiness event to the app state machine and guard `splash-tap` on it.
  - [ ] Keep the reducer pure — no DOM, timers, or network access.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] Confirm the gate cannot be bypassed, double-opened, or reversed.
  - [ ] Run the phase's automated checks and checkpoint the phase according to the workflow.

---

## Phase 4 — Drawn gate: mascot and traced-path progress

- [ ] Task: Write failing render tests for the drawn mascot and progress indication
  - [ ] Draw the mascot from the active skin's accent with no image source.
  - [ ] Fill the trace ring strictly proportionally to progress, with defined empty and full states.
  - [ ] Prove the drawn mascot renders when no character art is available (the fallback primitive).
  - [ ] Follow the existing fake-context operation-assertion style in the render tests.
- [ ] Task: Write failing layout tests for the gate in both orientations
  - [ ] Add gate geometry (emblem, ring, progress arc) to the splash layout math.
  - [ ] Prove portrait and landscape geometry stays inside the field with no clipping and no overlap.
  - [ ] Prove the layout recomputes on resize and rotation without losing progress state.
- [ ] Task: Implement the drawn gate and mascot
  - [ ] Extend the splash rendering with the animated drawn mascot and the traced-path progress ring — no text, no raster asset.
  - [ ] Keep both drawn primitives in one place so the gate and the character stand-in share them.
  - [ ] Keep the existing splash identity (star on the dashed trace ring).
- [ ] Task: Verify GREEN and preserve existing screens
  - [ ] Run the focused render and layout tests, then the full suite with `CI=true pnpm test`.
  - [ ] Run `CI=true pnpm check`.
  - [ ] Confirm menu, pack, level, success, badge, parent-zone, and sticker rendering are unchanged.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] Review gate screenshots in portrait and landscape for legibility and zero text.
  - [ ] Run the phase's automated checks and checkpoint the phase according to the workflow.

---

## Phase 5 — Boot wiring: gate, character stand-in, self-healing content

- [ ] Task: Write failing tests for the character failure stand-in
  - [ ] Prove a failed character load reports through `onError` and puts the drawn stand-in on screen — never a blank canvas.
  - [ ] Prove a later successful retry replaces the stand-in with the real character.
  - [ ] Prove unknown or unloaded triggers keep their existing failure-safe behavior.
- [ ] Task: Write failing tests for on-demand level warming
  - [ ] Prove entering a level warms that level's backdrop, goal, sticker, and character assets.
  - [ ] Prove a partially warmed level keeps drawn stand-ins and neither restarts nor resets progress.
  - [ ] Prove assets cached later replace stand-ins in place when the network returns.
  - [ ] Prove warming never duplicates an already-cached asset.
- [ ] Task: Wire the gate into boot
  - [ ] Replace the discarded fire-and-forget warm-up with the readiness-driven flow.
  - [ ] Resolve readiness on completion and on every escape (cache complete · offline · retries exhausted).
  - [ ] Keep boot identical when the cache is complete — no gate and no added work.
  - [ ] Keep DOM and event wiring in the boot shell and all decisions in the tested modules.
- [ ] Task: Wire the character stand-in and self-healing content
  - [ ] Pass `onError` from the character bootstrap and render the drawn stand-in on failure, with a retry path.
  - [ ] Warm the current level's assets on entry and thread late arrivals into the running render.
  - [ ] Verify no code path can leave the character canvas empty.
- [ ] Task: Verify GREEN and preserve invariants
  - [ ] Run the focused tests, then the full suite with `CI=true pnpm test` and `CI=true pnpm check`.
  - [ ] Confirm save schema, pack geometry, tracing, audio, and gameplay behavior are untouched.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] Confirm every gate exit is reachable and that no path leaves the child stuck.
  - [ ] Run the phase's automated checks and checkpoint the phase according to the workflow.

---

## Phase 6 — Production probes, performance, and device verification

- [ ] Task: Add the cold-cache readiness probe
  - [ ] Boot with an empty content cache and assert the gate appears, fills monotonically, and reaches the menu.
  - [ ] Assert the warm-up result reports every shipped asset cached, naming any failures.
  - [ ] Assert zero uncaught page errors during the gated boot.
  - [ ] Keep the probe compatible with the existing headless-Edge QA workflow.
- [ ] Task: Add the failed-character probe
  - [ ] Abort the character asset request and assert the drawn stand-in appears with no blank canvas and no error surface.
  - [ ] Restore the route and assert the real character replaces the stand-in without restarting the level.
- [ ] Task: Extend the offline probe with the escape and self-healing assertions
  - [ ] Prove incomplete cache plus offline starts play immediately with no gate, keeping the existing offline cold start green.
  - [ ] Warm the app, launch offline, and prove the returning-user boot shows no gate.
  - [ ] Prove a level opened while content was still arriving ends fully real.
- [ ] Task: Run build, budget, smoke, performance, and compatibility checks
  - [ ] Run `pnpm build` and `pnpm budget`; confirm the 10 precache entries and the unchanged 6,000,000 B / 200 ceilings.
  - [ ] Run the smoke probe, the performance probe (boot, input-to-frame, frame p95), and the landscape matrix (portrait, landscape, rotation).
  - [ ] Confirm warm-boot timing is unchanged within noise and first input is not delayed by warm-up work.
- [ ] Task: Run the device pass
  - [ ] Android phone + iPad: first-run gate fills and completes; airplane-mode launch with a warm cache shows no gate.
  - [ ] Block the character asset and confirm the drawn stand-in appears and then self-heals.
  - [ ] Record the child-facing result: no text, no dead-end, and nothing visible to signal an asset failure.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] Record exact commands and outcomes for every probe and measurement.
  - [ ] Confirm all acceptance criteria from the approved specification are satisfied.
  - [ ] Perform the workflow's manual-verification and checkpoint protocol.

---

## Phase 7 — Documentation, review, and closeout

- [ ] Task: Update project documentation
  - [ ] Finalize `tech-stack.md` with the shipped gate, warm-up contract, and final measurements.
  - [ ] Record the guideline amendment's outcome in `product-guidelines.md`.
  - [ ] Add the new probes to the `dev/README.md` QA inventory with their expected results.
  - [ ] Update `product.md` with the child-facing change (first-run readiness, no blank mascot).
- [ ] Task: Perform final self-review against the specification
  - [ ] Confirm no blank character canvas is reachable and every gate exit is covered.
  - [ ] Confirm the save schema, pack geometry, precache policy, and update lifecycle are unchanged.
  - [ ] Confirm the payload delta is ~0 and that the budget ceilings were not re-anchored.
  - [ ] Confirm no unrelated untracked files were modified or staged.
- [ ] Task: Run the final quality gates
  - [ ] Run `CI=true pnpm check`, `CI=true pnpm test --coverage`, and `pnpm pack:check`.
  - [ ] Re-run `pnpm build`, `pnpm budget`, and the production probes.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] Record the final evidence and owner feedback.
  - [ ] Attach the required auditable verification report as a git note to the last functional commit.
  - [ ] Commit the closeout using the repository's conductor plan-commit convention.
  - [ ] Mark the track complete only if the approved measurable outcomes pass.
