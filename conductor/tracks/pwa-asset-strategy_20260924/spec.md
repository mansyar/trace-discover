# Specification: PWA precache headroom and runtime asset strategy

**Track ID:** `pwa-asset-strategy_20260924`
**Type:** Chore
**Branch:** `track/pwa-asset-strategy`
**Status:** Approved for planning
**Created:** 2026-09-24

## 1. Overview

The production build currently has **197 precache entries** against a fixed **200-entry ceiling**, leaving only three slots. The completed payload-headroom track intentionally deferred the remaining 17-entry reduction to this PWA/asset-strategy track.

This chore separates critical boot resources from content resources in the PWA cache. Critical resources remain in the Workbox precache. Shipped content assets use a deliberate runtime-cache strategy and a first-session warm-up so the complete app remains available offline after the first successful online load.

The track introduces no child-facing UI and does not change gameplay, content, save data, or the existing product model.

## 2. Goals

- Reduce the production precache count to **180 entries or fewer**.
- Preserve the existing **6,000,000-byte total-size ceiling**.
- Keep the complete app usable offline after the first successful online load and content warm-up.
- Preserve waiting-service-worker semantics: updates download in the background and activate only on a later cold start.
- Avoid visible loading UI, spinners, errors, update prompts, or child-facing text.
- Keep the existing client-only `$0` architecture and dependency set.

## 3. Functional Requirements

### FR1 — Critical/resource split

The PWA build must distinguish:

- **Critical precache resources:** app shell, JavaScript, CSS, HTML, Rive WASM, manifest, icons, and resources required to boot the app.
- **Content runtime-cache resources:** shipped goal art, sticker art, pack cards, badges, backdrops, and Rive character assets that are not required for the initial shell boot.

The classification must be explicit and maintainable rather than an unexplained ad hoc exclusion.

### FR2 — First-load content warm-up

After the first successful online boot, the app must begin a background warm-up of all shipped content resources.

The warm-up must:

- start without blocking the child’s first interaction;
- cover every shipped pack, skin, and reward asset;
- be idempotent and safe across repeated boots;
- recover from partial failures without showing a failure state;
- reach a testable “all content cached” condition before offline verification passes.

The app must continue to function if warm-up is interrupted or temporarily fails.

### FR3 — Offline completeness

After a successful first online load and warm-up, the app must support:

- offline boot;
- navigation to every static pack;
- access to every available level;
- loading of goal, sticker, card, badge, and backdrop art;
- skin switching between all six registered skins;
- My Name behavior when a saved name exists;
- the existing save and progress flows.

The app must not depend on a network request to become playable after warm-up has completed.

### FR4 — Update lifecycle preservation

The existing update policy must remain intact:

- no `skipWaiting` behavior that takes over an open session;
- no forced reload of an active child session;
- `clientsClaim` remains limited to the existing safe first-activation behavior;
- a downloaded update activates after all open instances close and on the next cold start.

The new content cache must not introduce an update race or stale-content failure.

### FR5 — Measurement and guardrails

The existing `pnpm budget` command must report:

- total dist size;
- precache-entry count;
- generated service-worker manifest count when available;
- any discrepancy between filesystem count and service-worker count.

The track must add or update tests for the cache classification and warm-up contract. The existing fixed ceilings must remain unchanged.

## 4. Non-Functional Requirements

- No new runtime dependency.
- No new backend, account, analytics, or network service.
- No child-visible loading, error, or update UI.
- No save-schema change.
- No change to level geometry, tracing behavior, audio, Rive triggers, or reward logic.
- No change to the existing PWA “updates apply on next launch” safety guarantee.
- The implementation must remain compatible with the current Vite 8, `vite-plugin-pwa`, Workbox, Node 24, and pnpm toolchain.
- Warm-up work must not materially delay first input or degrade the existing performance budget.

## 5. Acceptance Criteria

- A clean production build reports **≤180 precache entries**.
- The build remains **≤6,000,000 bytes** total.
- `pnpm check` passes.
- `pnpm test` passes.
- The full coverage gate passes.
- `pnpm pack:check` passes.
- `pnpm budget` passes.
- `qa-offline.mjs` proves a completed warm-up followed by an offline cold start.
- `qa-update.mjs` proves updates do not take over a running session and activate on the next cold start.
- Browser QA proves every pack, skin, and reward asset is available after warm-up.
- No uncaught page errors occur during boot, warm-up, offline navigation, skin switching, or update activation.
- No pre-existing untracked files are overwritten or included.

## 6. Out of Scope

- Further image compression or WebP quality tuning; that is complete in the payload-headroom track.
- New packs, levels, rewards, characters, or skins.
- Changes to save schema or progress behavior.
- New child-facing onboarding, loading, error, or update UI.
- Lowering the 6.00 MB or 200-entry ceilings.
- Broad CI or release-process expansion unrelated to PWA verification.
- Changing tracing, assists, completion choreography, audio, or Rive artwork.
