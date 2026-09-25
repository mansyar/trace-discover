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

## Phase 2 — Warm-up progress and retry contract [checkpoint: b656daf]

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
- [x] Task: Verify GREEN and preserve existing behavior [b656daf]
  - [x] Run the focused warm-up tests, then the full suite with `CI=true pnpm test`.
  - [x] Run `CI=true pnpm check`.
  - [x] Confirm no precache policy, cache name, save, or child-facing behavior changed.

  **Verification evidence (2026-09-24):** Focused suite 15/15; full `CI=true pnpm test` 60 files / 769 tests; `CI=true pnpm check` clean. The phase's change surface is exactly three files (`src/pwa/contentCache.ts`, `src/pwa/contentCache.test.ts`, and this plan) — `git diff --stat b63cc09 HEAD -- src/pwa/cachePolicy.ts vite.config.ts src/save src/main.ts` is empty, proving the cache name `trace-discover-content-v1`, the precache boundary, save schema v3, and every child-facing surface are untouched, and that this phase added no wiring. Fresh `pnpm build` reports 10 generated precache entries and `pnpm budget` PASSes at 5,556,165 / 6,000,000 B and 10 / 200 entries — the total rose by 576 B against the baseline purely from the new warm-up code, with the ceilings still un-re-anchored.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [x] Confirm the progress contract alone is sufficient for a truthful indication.
  - [x] Confirm the warm-up remains idempotent and retains successful work.
  - [x] Run the phase's automated checks and checkpoint the phase according to the workflow.

  **Phase 2 evidence (2026-09-24):** `CI=true pnpm test` passed (60 files / 769 tests, +9 over the 760 baseline) and `CI=true pnpm check` is clean. The phase-coverage step found every changed code file has a sibling test (`src/pwa/contentCache.ts` ↔ `src/pwa/contentCache.test.ts`). A truthful indication is guaranteed by the contract itself: `resolved` counts already-cached, newly-cached, and permanently-failed units, is monotonic, reaches `total` exactly once, and every path emits (including a single `0 / 0` for an empty inventory), so the gate's indicator cannot stall before it releases. Idempotence is preserved — already-cached assets resolve without re-fetching, and the pre-existing partial-failure test still proves a later warm-up recovers a previously failed asset while retaining earlier successes. Invariants hold: exactly three files changed this phase, with `cachePolicy.ts`, `vite.config.ts`, `src/save/`, and `src/main.ts` untouched. The owner ran the manual browser pass (app playable while warming, 187/187 cached, second load reuses it without re-downloading) and confirmed; the auditable report is attached to `b656daf` as a git note.

---

## Phase 3 — Pure readiness gate and reducer enforcement [checkpoint: 2b0505e]

- [x] Task: Write failing tests for the readiness decision [525f325]
  - [x] Complete cache → ready immediately, with no gate presented.
  - [x] Incomplete cache while offline → ready immediately, never waiting on work that cannot finish.
  - [x] Incomplete cache while online → not ready until the warm-up resolves.
  - [x] Warm-up resolving with exhausted failures → ready, with the failures surfaced for dev QA.
  - [x] Prove readiness resolves exactly once and cannot reverse on later signals.

  **RED evidence (2026-09-25):** Focused `CI=true pnpm exec vitest run src/pwa/readiness.test.ts` fails as intended: the suite cannot load (`Error: Cannot find module './readiness'`), so no assertion executes in this state — the canonical Red for a brand-new module, stated plainly rather than dressed up as a behavioural failure. Every assertion is therefore pinned but unverified until the next task's Green run, which is the first time they execute against an implementation.

  **Contract pinned:** the decision table (play on a complete cache, play while offline, wait only when the cache is incomplete on a live connection, already-cached winning over offline); `readinessFraction` as `resolved / total` clamped to 0..1 with a `0 / 0` empty-inventory guard instead of a division; both escapes starting **no** work (`warmUp` and the injected `schedule` are never called) and reporting exactly one terminal state, which is what "no gate presented" means in evidence; the waiting path reporting the pending gate at fraction 0 *before* the injected scheduler runs the task, then filling strictly with warm-up progress; exhausted failures surfaced in the terminal state for dev QA; a single resolution that later progress and a second completion cannot re-report or reverse; and a rejecting warm-up still releasing the gate, so no path can trap the child.
- [x] Task: Implement the readiness module [e70bc14]
  - [x] Add a pure readiness module exposing the decision plus the gate state derived from warm-up progress.
  - [x] Accept injected connectivity, warm-up, and timer hooks so every branch is testable without a browser.
  - [x] Expose the progress fraction the gate renders, clamped to 0..1.

  **GREEN evidence (2026-09-25):** Focused `CI=true pnpm exec vitest run src/pwa/readiness.test.ts` passed 15/15 in 8 ms (three of them added to close the coverage gaps below). Full `CI=true pnpm test --coverage` passed with 61 files / 784 tests (baseline 60 / 769); `CI=true pnpm check` clean (Biome 134 files, `tsc --noEmit` strict). `src/pwa/readiness.ts` sits at 100 / 100 / 100 / 100 statements / branches / functions / lines; global coverage 74.63 / 78.22 / 90.44 / 74.2 against the enforced 72 / 76 / 88 / 72 and the pre-track baseline 74.02 / 77.93 / 90.07 / 73.57.

  **Hook mapping:** connectivity = the injected `cacheComplete` and `online` inputs; warm-up = the injected `warmUp`; timer = the injected `schedule(task)`, so the warm-up starts off the boot frame exactly as `scheduleContentWarmup` starts it today and `main.ts` passes `window.setTimeout(task, 0)`. An escape calls neither `warmUp` nor `schedule` — asserted in tests rather than asserted in a comment, which is what "no gate presented" means in evidence.

  **Resolution rule:** the pending state is reported *before* the scheduler runs, so a shell holding the state can tell "waiting" from "nothing yet"; each progress report becomes `ready: false` at `resolved / total` (clamped, with a `0 / 0` guard instead of a division); the terminal state is reported exactly once and later progress is dropped, so readiness cannot reverse. A warm-up that throws still releases the gate with an empty `failed` list — an unnamed failure beats a child stuck on the splash.

  **Coverage gap closed in this step:** the first coverage run left line 101 uncovered — the double-settle guard, unreachable from a single warm-up. The harness now settles every warm-up it starts and a test runs the scheduled task twice (real, because boot re-schedules the warm-up on the `online` event today), pinning one terminal state under a double start; two no-observer tests cover the three optional `onState` call sites.

  **Carried into Phase 5:** `bootReadiness` takes `cacheComplete` as an already-decided boolean, so the *timing* of the completeness check stays boot wiring. Awaiting that check before the first frame is what stops a returning user from seeing a one-frame gate, and it is the one detail Phase 5 must not lose.
- [x] Task: Write failing tests for reducer-enforced gating [a0c7d35]
  - [x] Prove the start state holds `contentReady === false`.
  - [x] Prove `splash-tap` while not ready leaves the screen on `splash`.
  - [x] Prove a readiness event opens the gate exactly once and a later `splash-tap` reaches the menu.
  - [x] Prove readiness does not alter save, sticker, badge, or progress state.

  **RED evidence (2026-09-25):** Focused `CI=true pnpm exec vitest run src/app/app.test.ts` reported 4 failed / 47 passed — the four new gate tests red while every pre-existing test stays green, so the Red state is the missing behaviour rather than a broken harness. The failure modes name the gap precisely: `expected undefined to be false` (the state has no `contentReady`), `expected { pendingBadge: null, … } to be { pendingBadge: null, … }` (the tap still advances splash → menu), and two `TypeError: Cannot read properties of undefined`. The last pair is the informative one: with no `content-ready` case the switch falls off its end and returns `undefined` instead of a state, so the reducer must *handle* the event rather than merely ignore it.

  **Contract pinned:** the gate assertion on `splash-tap` is an identity check (`toBe(app)`), not just a screen check, so the blocked tap may not produce a new state object with an unchanged screen; the second readiness event is likewise pinned as an identity no-op, which is what "exactly once" means for a reducer; and "readiness does not alter save, sticker, badge, or progress state" is proven with object-identity checks plus content checks on `completedLevels`, `badges`, and `stickerIntroSeen` rather than assumed from the shape of the code.
- [x] Task: Implement the reducer gate [27f0dc6]
  - [x] Add the readiness flag and readiness event to the app state machine and guard `splash-tap` on it.
  - [x] Keep the reducer pure — no DOM, timers, or network access.

  **GREEN evidence (2026-09-25):** Focused `CI=true pnpm exec vitest run src/app/app.test.ts` passed 51/51 (from 47 passed / 4 failed in the Red step); full `CI=true pnpm test --coverage` passed with 61 files / 788 tests; `CI=true pnpm check` clean (Biome 134 files, `tsc --noEmit` strict). `app.ts` coverage 98.13 / 98 / 100 / 98.01, where lines 105 and 233 are the pre-existing `!pack` guard in `openLevel` and the non-parent guard in `parentAction` — neither is on this task's change surface. Global coverage 74.64 / 78.39 / 90.44 / 74.21 against the enforced 72 / 76 / 88 / 72.

  **Purity kept:** the reducer gained one boolean, one event case, and one guard; no timers, no DOM, no network, no new imports. The gate is identity-preserving in both directions — a blocked `splash-tap` returns the same state object and a repeated `content-ready` returns the same state object — so "cannot be bypassed" and "opens exactly once" are properties of the code rather than claims in a comment.

  **Harness change:** `readyApp(save)` opens the gate and `setup()` delegates to it, so the 47 pre-existing tests still exercise the app as the shell hands it over after readiness; 7 direct call sites that tapped a raw `startApp` now route through the helper (2 failed for real, the other 5 were silent no-ops whose variable names promised a menu). The four new gate tests call `startApp` directly, so the closed start state stays pinned.

  **⚠ Known intermediate state — deliberate, not a defect:** nothing in production dispatches `content-ready` yet (`grep -rn content-ready src/` matches only `app.ts`), so **at this commit the real app holds at the splash**. The four QA probes that tap the splash (`qa-smoke.mjs:101`, `qa-perf.mjs:115`, `qa-offline.mjs:159`, `qa-landscape.mjs:258`) cannot pass until Phase 5's *Wire the gate into boot* replaces the discarded fire-and-forget warm-up with the readiness-driven flow. Recorded rather than patched, because that wiring is Phase 5's task — and recorded *here* so the Phase 3 checkpoint below is read against the right expectation instead of surprising the Phase 5 implementer.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [x] Confirm the gate cannot be bypassed, double-opened, or reversed.
  - [x] Run the phase's automated checks and checkpoint the phase according to the workflow.

  **Phase 3 evidence (2026-09-25):** `CI=true pnpm test` passed (61 files / 788 tests, +19 over the 769 baseline) and `CI=true pnpm check` is clean (Biome 134 files, `tsc --noEmit`). Focused suites: `readiness.test.ts` 15/15, `app.test.ts` 51/51. Phase-coverage step: `git diff --name-only b656daf HEAD` lists `src/pwa/readiness.ts` (sibling test `readiness.test.ts`), `src/app/app.ts` (sibling test `app.test.ts`), those two test files, and this plan — no code file is missing a test. Coverage: `readiness.ts` 100 / 100 / 100 / 100, `app.ts` 98.13 / 98 / 100 / 98.01 (both uncovered lines are pre-existing guards this phase did not touch), global 74.64 / 78.39 / 90.44 / 74.21 against the enforced 72 / 76 / 88 / 72 and the pre-track baseline 74.02 / 77.93 / 90.07 / 73.57.

  **Gate invariants confirmed by inspection:** `contentReady` appears exactly four times in `app.ts` — the declaration, `false` in `startApp`, the idempotent open, and the `splash-tap` guard — so only the boot flow's `content-ready` ever sets the flag, no event clears it, a repeat event returns the same state object, and every `{ …state }` spread preserves it (including the reset path, which replaces only `save`). The gate cannot be bypassed, double-opened, or reversed.

  **Owner decision (2026-09-25):** presented with the documented interim state (the app holds at the splash until Phase 5 wires boot, and four probes tap the splash), the owner **confirmed the checkpoint as planned** — the splash hold is accepted as a dev-branch state and is explicitly *not* to be patched ahead of Phase 5, whose task it is. Phase 5 inherits the probe list: `qa-smoke.mjs:101`, `qa-perf.mjs:115`, `qa-offline.mjs:159`, `qa-landscape.mjs:258`.

---

## Phase 4 — Drawn gate: mascot and traced-path progress [checkpoint: e9958a3]

- [x] Task: Write failing render tests for the drawn mascot and progress indication [0f6f4a8]
  - [x] Draw the mascot from the active skin's accent with no image source.
  - [x] Fill the trace ring strictly proportionally to progress, with defined empty and full states.
  - [x] Prove the drawn mascot renders when no character art is available (the fallback primitive).
  - [x] Follow the existing fake-context operation-assertion style in the render tests.

  **RED evidence (2026-09-25):** Focused `CI=true pnpm exec vitest run src/app/render.test.ts` reported 5 failed / 7 passed. Every pre-existing sticker painter test still passes, so the failures are the missing behaviour and not a broken harness: `expected [] to have a length of 2 but got +0` (no arc at the trace-ring radius) and `expected [] to include 'fillStyle:#8ecae6'` (the accent never reaches the canvas). This is the strong form of Red — assertions comparing emitted ops against expected ops — because the two painters were committed alongside the tests as typed, documented, body-less declarations (`drawDrawnMascot`, `drawGate`; parameters referenced through `void` statements to satisfy `noUnusedParameters` without underscore names). Nothing renders through them yet, so this commit changes no shipped behaviour.

  **Contract asserted:** the fill is *strictly* proportional — 0.25 sweeps `π/2` and 0.5 sweeps exactly twice that — while the dashed identity ring underneath stays a full circle; the empty state draws **no** fill and the full state closes the circle at `2π`; the waiting mascot is painted in the active skin's accent with no image source and no text op; the mascot breathes between frames (`now = 0` vs `now = 350·π/2`) while the ring geometry stays bit-identical; the mascot primitive renders standalone with no character art; and `drawSplash` still draws the dashed ring at the layout's ring radius with the centred star — a characterization guard that passes *before* the Green refactor and must keep passing after it.

  **Harness change:** the shared fake context now records arc geometry and style assignments and records `fillText`, so "zero text" is an assertion rather than an untested absence. Pre-existing assertions are containment- or prefix-based, which is why the extra ops leave them valid.
- [x] Task: Write failing layout tests for the gate in both orientations [05ef96b]
  - [x] Add gate geometry (emblem, ring, progress arc) to the splash layout math.
  - [x] Prove portrait and landscape geometry stays inside the field with no clipping and no overlap.
  - [x] Prove the layout recomputes on resize and rotation without losing progress state.

  **RED evidence (2026-09-25):** Focused `CI=true pnpm exec vitest run src/ui/menu.test.ts` reported 4 failed / 84 passed — the four new geometry tests red, every pre-existing layout test green. The failures are of two kinds and are recorded as they are rather than dressed up: `expected NaN to be greater than or equal to 0` (the ring/arc/mascot/tracer fields are absent, so the derived outer extent is NaN) and `TypeError: gateArcEnd is not a function` twice. That is weaker than an assertion diff, so the Green step has to show these same four tests passing against real geometry, not merely non-throwing.

  **Contract asserted:** the furthest gate pixel (the widest ring stroke, or the tracer star riding the ring) stays inside the field in **both** orientations; the mascot nests inside the ring's inner edge *and* the tracer star never reaches the mascot; the sweep is strictly proportional — equal to `arcStartAngle` when empty, `+ π/2` at a quarter, `+ 2π` when full, clamped for negative and over-full input; and rotating the field recomputes the layout (the centres move) while the swept angle is identical at every progress value, which is what "recomputes without losing progress state" means for a layout that holds no state: **the swept angle is size-independent, so a rotation cannot move the indication even though the geometry is rebuilt.**
- [x] Task: Implement the drawn gate and mascot [2429d57]
  - [x] Extend the splash rendering with the animated drawn mascot and the traced-path progress ring — no text, no raster asset.
  - [x] Keep both drawn primitives in one place so the gate and the character stand-in share them.
  - [x] Keep the existing splash identity (star on the dashed trace ring).

  **GREEN evidence (2026-09-25):** Focused `CI=true pnpm exec vitest run src/app/render.test.ts src/ui/menu.test.ts` passed 101/101; full `CI=true pnpm test` 61 files / 798 tests (was 788); `CI=true pnpm check` clean (Biome 134 files, `tsc`).

  **Geometry:** every gate radius is a ratio of one emblem scale (ring 1.35 · mascot 0.86 · tracer 0.30 of `0.22 × min(field)`), so the gate scales with the field rather than with pixel guesses. `gateArcEnd(layout, progress)` clamps to 0..1 and returns the start angle plus the swept fraction — deliberately **size-independent**, which is what makes "recomputes on rotation without losing progress" true rather than hopeful.

  **Drawing:** `drawDrawnMascot` paints an accent-tinted face (CREAM muzzle, NAVY outline and eyes) from paths only — no image, no text — so Phase 5's character stand-in is the *same* primitive rather than a lookalike. `drawGate` draws the trace ring extracted from `drawSplash` (one dashed ring, two callers, no drift), the accent fill on that same circle, the breathing mascot (1 ± 0.04 over 350 ms), and the gold star riding the ring at the traced angle — the existing identity, kept. An empty fraction draws no fill arc at all.

  **Raster verification (measured, not asserted):** a temporary probe (`dev/qa/out/gate-shots.mjs`, git-ignored) screenshotted the harness preview and sampled the canvas. Ring-band accent pixels: **0** at `gateF=0`, **2328** at 0.25, **4977** at 0.5, **9805** at 1.0 — proportional to arc length — and *identical* in portrait and landscape (4977 / 9805 in both), which is the raster twin of the size-independent sweep. The contiguous fill run measured 0.228 at 0.25 and 0.482 at 0.5 against 0.25 / 0.5 requested; the shortfall is the antialiased trailing cap, because the metric matches exact accent pixels rather than blends. No page errors in any shot. Screenshots: `dev/qa/out/gate/*.png` (empty · quarter · half · full, portrait and landscape).

  **Dev surface (unshipped):** the screens harness gained `?screen=gate&gateF=0..1` and `?chrome=0`. `src/dev/screens.ts` is not a build input, so this adds **zero shipped bytes** — and it exists because the real app cannot reach the gate until Phase 5 wires boot, while this phase's checkpoint calls for a legibility review in both orientations.
- [x] Task: Verify GREEN and preserve existing screens
  - [x] Run the focused render and layout tests, then the full suite with `CI=true pnpm test`.
  - [x] Run `CI=true pnpm check`.
  - [x] Confirm menu, pack, level, success, badge, parent-zone, and sticker rendering are unchanged.

  **Verification evidence (2026-09-25):** Focused `CI=true pnpm exec vitest run src/app/render.test.ts src/ui/menu.test.ts` passed 101/101. Full `CI=true pnpm test --coverage` passed 61 files / 798 tests (Phase 3 close: 788), with global coverage 75.7 / 78.43 / 90.77 / 75.31 (was 74.64 / 78.39 / 90.44 / 74.21) against thresholds 72 / 76 / 88 / 72. `CI=true pnpm check` clean (Biome 134 files, `tsc --noEmit` strict).

  **Other screens unchanged — proven by the diff, not by inspection:** `git diff 899e43b..HEAD -- src/app/render.ts` removes **four** lines, all of them inside `drawSplash` (its signature line, the pulse line, `lineWidth = 10`, and the arc that computed `emblemRadius * 1.35` inline). Every other line of that 1411-line painter module is an addition, so the menu, pack, level, success, badge, parent-zone, and sticker painters are byte-identical — the phase's whole source footprint is `src/app/render.ts`, `src/ui/menu.ts`, and the unshipped dev harness. The screen suites agree: `CI=true pnpm exec vitest run src/ui src/app src/render src/field.test.ts` passed 22 files / 344 tests.

  **Payload check (informational; Phase 6 re-measures):** fresh `pnpm build` reports the same **10** precache entries, and `pnpm budget` PASSes at 5,556,444 / 6,000,000 B and 10 / 200 entries. The 279 B rise against Phase 2's 5,556,165 B is the gate and mascot *code*; the gate ships no asset, which is why the entry count is unmoved and the ceilings were not re-anchored.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [x] Review gate screenshots in portrait and landscape for legibility and zero text.
  - [x] Run the phase's automated checks and checkpoint the phase according to the workflow.

  **Phase 4 evidence (2026-09-25):** `CI=true pnpm test` passed (61 files / 798 tests, +10 over the Phase 3 close) and `CI=true pnpm check` is clean (Biome 134 files, `tsc --noEmit`). Phase scope (`git diff --name-only 899e43b HEAD`): the two test files, `src/app/render.ts`, `src/ui/menu.ts`, the unshipped dev harness, and this plan — both source files have their sibling tests.

  **Screenshot review:** six Chromium captures in `dev/qa/out/gate/` — portrait empty · quarter · half · full, landscape half · full — taken with `?chrome=0`, which now hides the harness overlay *and* its log line, so the images contain no text at all; the canvas draws no text op either (asserted in `render.test.ts`). Raster measurements alongside them: ring-band accent pixels 0 / 2328 / 4977 / 9805 for fractions 0 / 0.25 / 0.5 / 1.0, identical in portrait and landscape, no page errors in any shot.

  **`src/dev/screens.ts` and the test-per-code-file rule:** the harness is a browser-only entry point (`requireCanvas(document)` at module scope) and **no file in `src/dev/` has a sibling test** — that is the repository's standing convention, and the two tracks that previously extended this same harness (`menu-capacity_20260917`, `shapes-pack_20260918`) verified it the same way: render the screenshot matrix and review it. Here it was verified *by execution* rather than by unit test — six real captures, six states, pixel-measured, zero page errors — which is the stronger check for a file that exists only to be looked at. It is not a build input, so it adds no shipped bytes.

  **Owner decision (2026-09-25):** reviewed the captures and the live harness, and **accepted the gate as drawn** — including the one real design call, the gold star riding the leading edge of the traced path rather than sitting at the centre where it would collide with the mascot — with no adjustments requested.

  **Live surface:** the dev server on `:5199` serves `?screen=gate&gateF=0..1&chrome=0` for further eyeballing; the temporary probe and the captures stay git-ignored (`dev/qa/out/`).

---

## Phase 5 — Boot wiring: gate, character stand-in, self-healing content

- [x] Task: Write failing tests for the character failure stand-in [2b37e16]
  - [x] Prove a failed character load reports through `onError` and puts the drawn stand-in on screen — never a blank canvas.
  - [x] Prove a later successful retry replaces the stand-in with the real character.
  - [x] Prove unknown or unloaded triggers keep their existing failure-safe behavior.

  **RED evidence (2026-09-25):** Focused `CI=true pnpm exec vitest run src/character/presenter.test.ts` → 6 failed. Full suite at this commit: **1 failed file | 61 passed; 6 failed tests | 798 passed**, so nothing else regressed. The committed declaration throws (`createCharacterPresenter: not implemented`) rather than returning a plausible default: an inert stub would have let "starts as the stand-in" and "ignores a retry while in flight" pass while the behaviour was still missing. Honest limitation: in this state the assertions do not execute — they are pinned, not yet exercised — and the Green step is where they first run.

  **Contract asserted:** the canvas presents the drawn stand-in before anything loads and through a failed attempt (a failure is a *fallback*, not a blank); the failure is reported through the dev-QA hook while the child-facing presentation does not change; a retry after a failure starts a second attempt whose success moves the presentation to the loaded character; a retry while an attempt is in flight is ignored, so a slow load cannot be duplicated; a loaded character that later fails falls back to the stand-in; and `onChange` never fires twice for one presentation, so the shell is never asked to redraw a canvas that has not changed.

  **Third sub-bullet is covered by the existing suite, not by a new test:** "unknown or unloaded triggers keep their existing failure-safe behavior" is pinned in `src/character/character.test.ts` — *stays inert when the runtime fails to load* (`fire` returns false, `resize` is skipped) and *fires a named trigger only after load* (`fire('missing')` is false). Those are characterization guards on behaviour the wiring must not break.
- [x] Task: Write failing tests for on-demand level warming [c3181b0]
  - [x] Prove entering a level warms that level's backdrop, goal, sticker, and character assets.
  - [x] Prove a partially warmed level keeps drawn stand-ins and neither restarts nor resets progress.
  - [x] Prove assets cached later replace stand-ins in place when the network returns.
  - [x] Prove warming never duplicates an already-cached asset.

  **RED evidence (2026-09-25):** Focused `CI=true pnpm exec vitest run src/pwa/levelWarmup.test.ts` → 6 failed, every one of them `createLevelWarmup: not implemented`, so no assertion executes yet. Full suite at this commit: **2 failed files | 61 passed (63); 12 failed tests | 798 passed (810)**. The second failing file is `src/character/presenter.test.ts` from the previous task — both modules are declared-but-unimplemented and both land in this phase's task 5.4, exactly as the Phase 4 painter declarations did. That is deliberate and reported here rather than hidden behind a stub: the suite stays red until the wiring task implements both, which is also why task 5.3's own evidence records the same known-red state.

  **Contract asserted:** entering a level warms exactly that level's assets (backdrop, goal, sticker, character) once; a repeat call while the level is warming does nothing, so re-entering a level cannot restart or duplicate its warm-up; on settle the module reports the split — every URL that is drawable for real now, and every URL that exhausted its attempts and therefore keeps a drawn stand-in; a settled level is never refetched; a **failed** level re-warms on its next entry, which is the only path that heals it when the network returns; levels are tracked separately, so one level's failure cannot mark another warm; and a warm-up that rejects settles as `failed` with the whole inventory named, rather than leaving the level stuck at `warming` forever.

  **Why warming is a side channel, not a load path:** the drawn stand-ins are only acceptable if the real art can still arrive, so the rule the shell needs is "one attempt per entry, retry on the next entry, tell me exactly what is drawable" rather than a fire-and-forget fetch. Progress, retries, dedupe, and concurrency stay in `warmContentAssets` (Phase 2), so a level's warm-up cannot duplicate work the boot warm-up already did and cannot disturb a running level.
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
