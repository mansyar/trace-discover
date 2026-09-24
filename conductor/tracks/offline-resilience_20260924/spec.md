# Spec: Offline-First-Run Resilience — Warm Gate, Drawn Mascot, Self-Healing Content

**Track ID:** `offline-resilience_20260924` · **Type:** Feature · **Status:** Approved for planning · **Branch:** `track/offline-resilience` (off `master` @ `8c8adbc`) · **Created:** 2026-09-24

## 1. Overview

Make every first run end in a fully-installable, fully-offline app, and make a failed asset impossible to see. Today the boot path warms 187 shipped content assets **fire-and-forget** and never observes the result, so a child who closes the app before the warm-up finishes owns a half-offline install; and if the Rive character fails to load, the mascot canvas stays **blank** with no stand-in and no retry.

This track adds an owner-approved **readiness gate** at boot (drawn progress indication + drawn mascot, no text), gives the warm-up a real progress/retry contract, replaces the blank mascot with a drawn stand-in, and heals a level's own assets on demand so opening a level mid-warm-up fills itself in.

**Verified baseline (file/line evidence):**

- `warmContentAssets` (`src/pwa/contentCache.ts:47`) is **serial** (`for … await store.add(url)`) and reports only a final `{ cached, complete, failed }` — there is no incremental progress to drive an indicator.
- `scheduleContentCacheWarmup()` (`src/main.ts`, boot tail) fires it with `void`, gated on `navigator.onLine`, **discards the result**, and re-runs on `online`. Nothing in the app observes completion.
- Precache is **10 entries** (`index.html`, `registerSW.js`, app JS/CSS, `rive-*.wasm`, 4 icons) — **no `/art/`, no `/rive/*.riv`** (`vite.config.ts` `globIgnores`). The boot screen must therefore be drawn, not fetched.
- `ensureCharacter` (`src/main.ts:515`) calls `loadCharacter` with **no `onError`** → failed `.riv` = blank canvas. `loadCharacter` already accepts `onError`, and `src/character/adapter.ts` reports `Error('rive failed to load')`.
- Every *art* failure already degrades to a drawn stand-in: backdrop (`render.ts:832`), goal (`render.ts:909`), sticker pop (`render.ts:819`, tested), menu cards (`render.ts:490`), sticker board tint (tested). **The character is the only blank.**
- `drawSplash` (`render.ts:310`) already draws the app-icon star on a dashed trace ring — an art-free boot screen to build on.

## 2. Locked Decisions

- **Hard readiness gate.** Boot holds on the gate until `CONTENT_ASSET_URLS` is cached. *Owner decision 2026-09-24.*
- **Clear drawn progress indication.** No text; the trace ring around the drawn mascot fills as assets land (brand-true "traced path" bar).
- **Drawn mascot on the gate**, tinted with the active skin's accent and animated while waiting — the same primitive used for the character failure stand-in.
- **Three exits, always reachable:** (a) cache already complete → gate never appears; (b) device offline with an incomplete cache → **skip the gate** and play immediately with drawn stand-ins; (c) online but assets keep failing → bounded retries, then proceed with drawn stand-ins. No path leaves the child stuck.
- **Reuse the existing splash screen** (same canvas field, `drawSplash` + `splashLayout`) rather than adding a new DOM surface.
- **Gate logic lives where it can be tested:** a new pure readiness module plus a `contentReady` flag in the already-tested `src/app/app.ts` reducer. `src/main.ts` stays wiring only.
- **No precache-policy change:** `/art/` and `/rive/` stay out of the precache; runtime `NetworkFirst` + the content cache remain the offline mechanism.
- **Deliberate guideline relaxation (owner-approved 2026-09-24):** `product-guidelines.md` states *"no spinners"* and *"Never urgent… Everything can wait"*. The gate is a blocking, animated indication. It introduces no text and no failure state, and the room is documented in `tech-stack.md` + `product-guidelines.md` **before** implementation, per `workflow.md`.

## 3. Functional Requirements

- **FR1 — Readiness gate.** When the content cache is incomplete, boot presents the gate until the warm-up resolves. The indicator's fill strictly tracks `resolved / total`, where `resolved` = already-cached + newly-cached + permanently-failed, so the indication can never stall before the gate exits. It never exceeds full or moves backwards.
- **FR2 — Warm-up progress contract.** `warmContentAssets` gains an injectable `onProgress` and an optional bounded `concurrency` (default 6) so progress is reportable and visibly fluid on a slow network, while every successful asset is retained across failures (existing behavior kept).
- **FR3 — Bounded retries, then proceed.** Each asset gets a small fixed number of attempts with backoff (default 3), plus an overall ceiling for the whole warm-up. Remaining failures are returned in the result for dev QA and covered by drawn stand-ins; the gate then releases. Retries never block the offline escape.
- **FR4 — Gate exits.** `contentReady` becomes true when the warm-up resolves **and** when any escape applies (already complete · offline · retries exhausted). While it is false, `splash-tap` must not advance the app — enforced by the pure reducer, not by DOM handlers.
- **FR5 — Drawn character stand-in.** `ensureCharacter` passes `onError`; a failed `.riv` renders the drawn mascot (gate primitive, active-skin accent) in its place. A blank character canvas must be impossible. The load stays retryable so a later success replaces the stand-in.
- **FR6 — Self-healing level content.** Entering a level warms that level's own assets (backdrop · goal · sticker · character) on demand and retries them; when the network returns, the level's real art replaces the drawn stand-ins in place, without restarting the level or disturbing progress.
- **FR7 — Invariants.** Save schema v3 and its migrations untouched; no pack geometry, pack JSON, or `pack:check` change; precache stays 10 entries; portrait **and** landscape layouts both account for the gate; zero new text, zero new error surface, zero new dead-ends; no change to gameplay, audio, tracing engine, or the release/update path.

## 4. Docs Updates

- `tech-stack.md`: dated note — readiness gate, warm-up progress/retry contract, and the deliberate guideline relaxation.
- `product-guidelines.md`: dated note recording the "no spinners" amendment (drawn readiness indication, owner-approved 2026-09-24).
- `dev/README.md`: QA inventory gains the new readiness probes (canonical status).

## 5. Non-Functional Requirements

- Full suite green (760 tests today); >80% coverage on new logic; `pnpm check` clean; `pnpm budget` within the unchanged 6,000,000 B / 200 ceilings.
- **No warm-boot regression:** when the cache is complete the gate is skipped and boot cost is unchanged (perf probe spot-check; `qa-perf.mjs` remains manual).
- Payload delta ~0 (no new shipped art; the gate and mascot are drawn).
- Device pass on Android phone + iPad: first-run gate fills and completes, airplane-mode launch with a warm cache shows no gate, mid-warm-up level open self-heals, and no blank character appears under a blocked `.riv`.

## 6. Acceptance Criteria

1. Unit tests: progress reporting is monotonic and reaches `total`; concurrency and retry counts are honored; retained successes survive partial failure (extend `src/pwa/contentCache.test.ts`).
2. Unit tests: the reducer holds the gate — `splash-tap` while `contentReady === false` never advances; every escape resolves readiness exactly once (extend `src/app/app.test.ts`).
3. Unit test: the character failure path renders the drawn stand-in and surfaces the error through `onError` (new sibling test for the character wiring).
4. New dev probe: cold-cache boot fills the indication and reaches the menu; the content cache then holds every shipped asset (extends the `qa-offline.mjs` inventory check).
5. New dev probe: `.riv` fetch aborted → drawn mascot on screen, **no blank canvas**, no error surface; retry succeeds once the route is restored.
6. Returning-user boot with a warm cache shows **no** gate; measured boot time unchanged within noise.
7. Offline + incomplete-cache boot starts play immediately (no gate, no spinner) with drawn stand-ins.
8. Visual/text audit of gate screenshots: zero text, indication legible in portrait and landscape, mascot animated; `dist`/precache counts and budget recorded before/after.

## 7. Out of Scope

Parent-facing "download for offline" control or any preload status surface · moving `/art/`/`/rive/` into the precache · service-worker strategy or update-lifecycle changes · CI wiring of the new probes · pack/skin/content/art additions · save schema or migration changes · new Rive or raster assets · gameplay, audio, or tracing-engine changes.
