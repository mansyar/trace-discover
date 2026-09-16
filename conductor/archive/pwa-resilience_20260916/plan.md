# Implementation Plan: PWA Resilience — Update Safety & Save Durability

**Spec:** [spec.md](./spec.md) · **Track:** `pwa-resilience_20260916` (Feature) · **Methodology:** follows `conductor/workflow.md` — every phase closes with the Phase Verification & Checkpoint protocol. **TDD adaptation:** SW/build-level behavior is proven by a new `dev/qa` probe (write-first, confirm RED against current config, then GREEN); save-path logic is covered by Vitest unit tests under `src/`.

**Delivery strategy:** docs-first (tech-stack note precedes implementation), then update lifecycle (waiting-SW semantics + probe), then save durability (TDD src work), then compliance + device acceptance. Work stays local on `track/pwa-resilience` — no push/PR/release (owner decides merge/release after).

## Phase 1 — Update lifecycle: waiting service worker [checkpoint: f3c549d]

*Goal: a downloaded update can never take over a running session — activation happens only after all instances close; proven by an automated probe.*

- [x] Task: `tech-stack.md` dated note — PWA update strategy (waiting SW; activate-on-next-launch; `skipWaiting`/`clientsClaim` off) + save durability approach documented *before* implementation (workflow.md: Tech Stack is Deliberate) [d408e25]
- [x] Task: Update probe `dev/qa/qa-update.mjs` (write-first, expect RED against current config) [381b17f]
  - [x] Build-output audit: generated `sw.js` never self-activates (no ungated `skipWaiting`; the `SKIP_WAITING` gate is inert — the app never sends it); `clientsClaim` present for first-launch control; `precacheAndRoute` + `cleanupOutdatedCaches` + navigation fallback intact
  - [x] Live lifecycle on a sandboxed `dist/` copy: after a synthetic SW update, registration stays `waiting` while a page is open; the running page is not claimed and keeps working (no reload)
  - [x] Relaunch + offline: close all pages → reopen → updated SW active; airplane-mode reopen boots fully from precache
  - [x] RED evidence recorded (today's build fails the waiting/claim assertions)
- [x] Task: Enforce waiting semantics in `vite.config.ts` — `registerType: 'prompt'` (no ungated `skipWaiting`) + `workbox.clientsClaim` for first-launch control; rebuilt; probe GREEN (14/14); dist/precache delta ~0 [f3c549d]
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Save durability: exception-proof writes + persistent storage [checkpoint: 0b69a21]

*Goal: no storage condition can crash or silently wedge a session; the save asks the browser to persist; the app is fully playable with no storage at all.*

- [x] Task: Tests-first (RED) in `src/save/` — `saveSave` never throws on quota/denied (in-memory continuation; later writes still attempt and persist); storage acquisition falls back when `localStorage` access throws; `requestPersistence` best-effort (called when available & unpersisted; silent no-op otherwise; rejections swallowed) [97f12ae]
- [x] Task: Implement (GREEN) — `src/save/storage.ts` (`acquireSaveStorage` with in-memory fallback + `requestPersistence`); guard the write path; wire `main.ts` boot (`loadSave`/`commit` use the acquired storage; persist requested once) [5618af5]
- [x] Task: Extend `dev/qa/qa-persistence.mjs` — quota-denied simulation (patch `Storage.prototype.setItem` in-page): level completes, app continues silently; prototype restored → subsequent saves persist; storage-unavailable boot shows no error state [0b69a21]
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Compliance & regression sweep [checkpoint: d79a402]

*Goal: measured and verified — full gates green, offline completeness proven, zero-text untouched, numbers recorded.*

- [~] Task: Full gates — `CI=true pnpm check && CI=true pnpm test` (+ coverage) and `pnpm build`; record dist size + precache entries vs baseline (6.71 MB · 76 entries)
- [ ] Task: Offline completeness — `qa-offline` green (SW cold-start → offline trace); assert precache covers every runtime asset reachable from boot/menu/pack/level; fix any gap found
- [x] Task: Zero-text & surface audit — no new UI/strings (changes confined to registration/config/save); `qa-screens` spot-run shows key screens unchanged
- [x] Task: Docs close-out — `dev/README.md` QA inventory gains `qa-update` (canonical); tech-stack note finalized; acceptance evidence for criteria 1–6, 8 pre-recorded
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — Device validation & acceptance [checkpoint: 8d64ec7]

*Goal: the guarantees hold on real target devices (Android phone + iPad), including airplane mode and mid-update sessions.*

- [x] Task: Real-device pass over LAN (`pnpm serve`) — open on Android + iPad: gameplay + persistence eyeball; owner-chosen scope 2026-09-16 (no preview deploy) — SW/offline device checks deferred, mechanics proven by desktop probes (`qa-update` 14/14 + `qa-offline`); recommend an rc/production re-check after merge/release
- [x] Task: Device persistence & resilience spot checks — complete a level, close the app, reopen (LAN scope: no offline check over HTTP) → progress persists; visual/zero-text audit shows no change
- [x] Task: Acceptance criteria 1–8 evidence recorded (plan + git note) — incl. dist/precache numbers and the mid-update-session note
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase: Review Fixes
- [x] Task: Apply review suggestions 47425e6

## Acceptance Evidence

*Pre-recorded Phase 3 (automated); device items close in Phase 4.*

1. **`sw.js` audit** — no ungated `skipWaiting` (the `SKIP_WAITING` message gate is inert — the app never sends it); `clientsClaim` present for first-launch control (refined during Phase 1 — see checkpoint note); precache + navigation fallback + `cleanupOutdatedCaches` intact. `qa-update` audit checks GREEN.
2. **Two-state update probe** — `qa-update.mjs` 14/14 GREEN: mid-session update never swaps versions (no controllerchange/reload); after all pages close, relaunch serves the updated version; airplane-mode relaunch boots from precache.
3. **Quota/denied writes** — unit tests + `qa-persistence` Part C: no throw; level completes with no error state; nothing persisted while denied; after prototype restore the next write persists the whole session.
4. **Persist request** — unit tests: requested when available and unpersisted; silent no-op when absent; rejections ignored.
5. **Storage-unavailable boot** — unit tests + `qa-persistence` Part D: boot → menu → pack with `localStorage` accessor throwing; no error state.
6. **Suites + probe** — full suite green (33 files / 333 tests); `pnpm check` clean; coverage 98.24% stmts / 90.8% branch; `qa-persistence` 13/13 ok.
7. **Device pass (LAN scope — owner choice 2026-09-16):** Android phone + iPad both played and persisted progress across a full close/reopen over LAN HTTP (`http://192.168.0.114:4173/`); no visual / zero-text change reported. SW/offline device checks deferred (no HTTPS over LAN and no preview deploy): mechanics proven by desktop probes (`qa-update` 14/14, `qa-offline`); recommend a quick rc/production re-check after merge/release.
8. **dist / precache** — dist 6.71 MB · 78 files; precache 76 entries (6855.12 KiB) — unchanged vs baseline; offline audit: every dist runtime asset precached (`sw.js` + workbox runtime excluded by design); `qa-offline` green (offline cold-start → `pre-1` trace SUCCESS).
