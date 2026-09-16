# Spec: PWA Resilience — Update Safety & Save Durability

**Track ID:** `pwa-resilience_20260916` · **Type:** Feature · **Status:** new · **Branch:** `track/pwa-resilience` (off `master` @ `50a090d`) · **Created:** 2026-09-16

## Overview

Make the live, installed PWA safe by construction for a zero-text toddler product in two dimensions: (1) version updates can never disturb or take over a running session — they apply on the next cold start; (2) progress saves can never crash the app or be silently destroyed by storage conditions. All changes are invisible: zero new UI, zero new text, zero new network behavior.

**Verified baseline (from the shipped `dist/` build):**

- Generated `sw.js` begins with `self.skipWaiting(), e.clientsClaim()` → a downloaded update can activate mid-session and claim open pages today.
- Registration is a bare `navigator.serviceWorker.register('./sw.js')` on window load (injected by the PWA plugin); no update UI exists — and none is possible under the zero-text rule.
- `saveSave()` is unguarded: quota/denied storage exceptions propagate out of `commit()`.
- `navigator.storage.persist()` appears nowhere; storage access itself (`localStorage` getter) can throw in cookie-blocking contexts.

## Locked Decisions

- **Updates: waiting-service-worker semantics.** Background download may happen anytime (browser-default checks; no polling added); activation only once all instances are closed (next launch). No idle-handshake machinery.
- **Durability scope: crash-proof writes + best-effort persist request.** No IndexedDB mirror, no parent-visible backup UI.
- Nothing adverse observed on real devices — proactive hardening of code-review findings.
- `tech-stack.md` gets a dated note (SW update strategy + save durability) **before** implementation, per `workflow.md`.

## Functional Requirements

- **FR1 — Update lifecycle.** A downloaded update must not activate while any app instance is open, and must not claim open clients. Activation occurs after all instances close; the next cold start serves the new version. Background update discovery stays browser-default (no polling added). A failed/partial download leaves the current version fully intact (Workbox atomic precache). Verified by a generated-`sw.js` audit (no `skipWaiting`/`clientsClaim`) and a live probe: running instance unchanged through an update → close → relaunch (also in airplane mode) → new version serves completely.
- **FR2 — Save writes are exception-proof.** `saveSave` never throws for any storage failure (quota exceeded, storage denied/unavailable, `SecurityError`). On failure: silent no-op, in-memory state continues, play is unaffected; later write attempts still occur and persist once storage works. No error surface of any kind.
- **FR3 — Persistent-storage request.** At boot, if `navigator.storage.persist` exists and storage is not already persisted, request persistence once. All outcomes (denied, unsupported, rejected) are ignored silently. No retries, no UI.
- **FR4 — Storage-optional boot.** If storage access itself throws (`window.localStorage` getter under cookie-blocking contexts) or is unavailable, the app still boots into a fully playable session-only mode. Progress simply isn't persisted; nothing is shown.
- **FR5 — Invariants.** Save schema v3, storage key `trace-discover-save-v1`, and v1→v3 migrations are untouched (existing tests unmodified). Zero-text rule holds — no new visible surface. Precache completeness is audited by the offline probe (gaps fixed if found). No gameplay, performance, audio, Rive, or network changes.

## Docs Updates

- `tech-stack.md`: dated note — SW update strategy (waiting SW; activate-on-next-launch) + save durability (exception-proof writes; best-effort persist; session-only mode without storage).
- `dev/README.md`: QA inventory gains `qa-update` (canonical status).

## Non-Functional Requirements

- Existing suites green; >80% coverage on new logic; `pnpm check` clean.
- Device verification on Android phone + iPad: mid-update session continuity, airplane-mode cold start, relaunch persistence, zero visible change.
- SW/bundle size impact negligible (<~1 KB); dist and precache counts recorded before/after (budget < ~10–15 MB; currently ~6.7 MB).

## Acceptance Criteria

1. Generated `sw.js` audit: no `skipWaiting()`/`clientsClaim()`; precache list + navigation fallback + outdated-cache cleanup intact.
2. Two-state update probe (new `dev/qa/` script): mid-session update never swaps versions; after close, relaunch serves the updated version; airplane-mode relaunch fully works.
3. Quota/denied storage simulation: no throw, play continues, subsequent successful write persists (unit tests).
4. Persist request behavior: called when available and unpersisted; silently no-op when absent; rejection ignored (unit tests).
5. Storage-unavailable boot: app fully playable session-only, zero error states (unit + harness).
6. `qa-persistence` and hostile-fixture coverage extended/passing; full suite green.
7. Device pass recorded: Android + iPad airplane-mode cold start post-update; toddler session uninterrupted; visual/text audit shows no change.
8. `dist/` + precache entry counts recorded before/after within budget.

## Out of Scope

Parent backup/restore UI · IndexedDB save mirror · multi-device/cloud sync · CI wiring of the new probe · content/skin/letters work · save schema or migration changes · any change to play behavior.
