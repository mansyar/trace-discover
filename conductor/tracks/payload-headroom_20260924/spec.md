# Spec: Payload headroom and asset diet

**Track ID:** `payload-headroom_20260924`
**Branch:** `track/payload-headroom`
**Type:** Chore
**Status:** complete
**Created:** 2026-09-24

## 1. Overview

The production build is close to both payload ceilings: the current baseline is **5,896,240 B of 6,000,000 B** and **197 of 200 precache entries**. The deferred Patterns Part 2 art batch is expected to add approximately 200–240 KB and 20 entries, so the next content track cannot safely proceed without creating headroom.

The original target was to leave at least **250 KB of size headroom and 20 precache entries** under the existing ceilings. The owner-approved closeout scope accepts completion when the size target is met and the measured entry result is documented; the 20-entry exploratory target is deferred to a separate PWA/asset-strategy track.

The 6.00 MB / 200-entry ceilings remain fixed for this track. The owner-approved closeout scope accepts completion when the measured size target is met and the precache result is fully documented; reducing the precache-entry count is deferred to a separate explicitly scoped PWA/asset-strategy track rather than being mixed into this asset-only chore. If safe asset optimization cannot reach the size target, the track must stop and report the measured shortfall rather than raising ceilings or expanding into runtime/Rive architecture work.

## 2. Goals

- Establish an auditable size and precache inventory of the current production build.
- Reduce shipped asset weight through safe raster optimization, metadata cleanup, and removal of proven-unused files.
- Preserve all current screens, character behavior, audio behavior, offline operation, and visual quality.
- Leave at least **250,000 B of total-size headroom** below the unchanged 6,000,000 B ceiling.
- Record the final precache-entry measurement and explicitly defer any further entry-count reduction to a separate PWA/asset-strategy track.
- Record the final measurements, optimizations, and any shortfall in the track artifacts and project documentation.

## 3. Functional Requirements

### FR1 — Production baseline inventory

- Build the production application with the existing toolchain.
- Record the total dist size, precache entry count, and per-category sizes for Rive/WASM, goal art, sticker art, pack art, backgrounds, faces, generated JS/CSS, icons, and other shipped assets.
- Identify duplicate, orphaned, or stale shipped files with a reproducible source of truth; do not remove an asset based only on suspicion.
- Record the baseline before modifying shipped assets.

### FR2 — Safe shipped-asset optimization

Permitted techniques include:

- lossless or quality-controlled re-encoding of shipped raster assets;
- removal of unnecessary metadata or encoding overhead;
- correction of dimensions or format settings where the current rendering contract permits it;
- removal of shipped files only after proving they are not referenced by the app, PWA glob, dev harness, QA scripts, or approved source assets.

The optimization must preserve the current asset URLs, browser-supported formats, canvas dimensions, and visual presentation unless a measured and reviewed alternative is explicitly documented. No optimization may remove a required offline asset.

### FR3 — Headroom target

With the existing ceilings unchanged, the completed build must provide:

- at least **250,000 B of total-size headroom** below 6,000,000 B.

The original exploratory target of 20 precache-entry slots was not reachable within the approved asset-only boundary: the final build remains at 197 / 200 entries, with 3 slots available. That measured result is accepted for this track and the remaining 17-entry reduction is explicitly deferred to a separate PWA/asset-strategy track. The final report must state both absolute remaining size headroom and the exact precache measurement from `pnpm budget`.

### FR4 — Fixed-ceiling shortfall policy

If the safe optimization scope cannot reach the size target:

- keep the 6.00 MB / 200-entry ceilings unchanged;
- do not remove required assets to manufacture a passing result;
- do not add lazy loading, remote assets, or other runtime architecture changes;
- record the exact size shortfall, the measured bottleneck categories, and evidence of completed safe optimizations; and
- mark the track blocked/incomplete for a separate owner decision.

If the size target is met but the precache-entry count remains above 180, record the exact entry deficit and defer the architectural change to a separate track; do not change the service-worker or runtime-loading architecture in this track.

### FR5 — Regression protection

- Existing app behavior, pack validation, save compatibility, character presentation, and offline precache behavior remain unchanged.
- Any new tooling or test code receives tests before implementation changes, following the project TDD workflow.
- The existing `pnpm budget` guard remains active in local and CI execution.

### FR6 — Verification and evidence

Run the existing quality gates and asset-specific checks:

- `CI=true pnpm check`
- `CI=true pnpm test --coverage`
- `pnpm pack:check`
- `pnpm build`
- `pnpm budget`
- production browser smoke via `dev/qa/qa-smoke.mjs`
- offline cold-start and representative pack-level browser QA
- visual review of representative menu, pack, level, success, badge, sticker-board, and parent-zone assets/screens after optimization

Any device-specific visual review is useful evidence but is not a substitute for automated gates.

## 4. Non-Functional Requirements

- **Offline-first:** the complete optimized app remains precached and playable without network access.
- **Visual fidelity:** no visible regression in shipped art, canvas layout, character rendering, or reward presentation is acceptable without explicit review.
- **Behavior preservation:** no gameplay, save-schema, progression, audio, Rive state-machine, or PWA update-semantics changes.
- **Determinism:** optimization scripts must be repeatable, non-interactive, and documented with their inputs and outputs.
- **Size discipline:** the budget guard and documented ceilings remain the source of truth.
- **Maintainability:** any reusable asset optimization must live in the existing dev tooling conventions and be covered by tests where practical.

## 5. Acceptance Criteria

- [x] A reproducible baseline records the current production total, precache count, and category breakdown.
- [x] Every removed shipped asset has documented proof that it is unused by runtime, PWA, dev harnesses, QA, and approved source assets. **No assets were removed.**
- [x] The final build leaves at least **250,000 B of total-size headroom** under the unchanged 6.00 MB ceiling. The final precache count is documented; any remaining entry deficit is recorded as a separate follow-up rather than solved by changing PWA architecture in this track. **Result:** 444,928 B size headroom; 3 entry slots remain; 17-entry reduction deferred.
- [x] `CI=true pnpm check`, `CI=true pnpm test --coverage`, `pnpm pack:check`, `pnpm build`, and `pnpm budget` pass.
- [x] Production smoke, offline QA, and representative pack-level QA pass with zero uncaught page errors or missing precached assets.
- [x] Visual review confirms no unacceptable regression in representative child-facing and parent-facing surfaces.
- [x] Tech-stack/budget documentation and the track plan record the final measurements and any deviations.
- [x] No runtime code, pack content, save schema, Rive behavior, dependency, or ceiling re-anchor is included unintentionally.

## 6. Out of Scope

- New content packs or levels, including Patterns Part 2.
- New skins, Rive authoring changes, or changes to character state machines.
- Runtime lazy loading, code splitting, remote asset delivery, or a redesigned PWA cache architecture.
- Changes to tracing, assists, audio, progression, rewards, save schema, or parent settings.
- Broad visual redesign or quality reductions that materially change the toddler-facing art.
- Raising the 6.00 MB / 200-entry ceilings to make the track pass.
- Unrelated dependency upgrades or repository cleanup.

## 7. Open Decisions

- Exact optimization techniques are selected after the baseline inventory identifies the largest safe opportunities. The implemented technique is reviewed q0.75 re-encoding of foreground goal, sticker, and pack WebP assets.
- The measured 17-entry shortfall is deferred to a separate PWA/asset-strategy track; this track does not change the service-worker or runtime-loading architecture.
