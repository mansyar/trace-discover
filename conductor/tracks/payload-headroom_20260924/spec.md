# Spec: Payload headroom and asset diet

**Track ID:** `payload-headroom_20260924`
**Branch:** `track/payload-headroom`
**Type:** Chore
**Status:** new
**Created:** 2026-09-24

## 1. Overview

The production build is close to both payload ceilings: the current baseline is **5,896,240 B of 6,000,000 B** and **197 of 200 precache entries**. The deferred Patterns Part 2 art batch is expected to add approximately 200–240 KB and 20 entries, so the next content track cannot safely proceed without creating headroom.

This track performs a safe asset diet for the shipped application bundle. It inventories shipped assets, applies reversible, evidence-backed optimizations, removes only files proven unused, and verifies that the product remains visually and behaviorally unchanged. The goal is to leave at least **250 KB and 20 precache entries** of headroom under the existing ceilings.

The 6.00 MB / 200-entry ceilings remain fixed for this track. If safe asset optimization cannot reach the target, the track must stop and report the measured shortfall rather than raising ceilings or expanding into runtime/Rive architecture work.

## 2. Goals

- Establish an auditable size and precache inventory of the current production build.
- Reduce shipped asset weight through safe raster optimization, metadata cleanup, and removal of proven-unused files.
- Preserve all current screens, character behavior, audio behavior, offline operation, and visual quality.
- Leave at least 250 KB and 20 precache entries available under the unchanged 6.00 MB / 200-entry ceilings.
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

- at least **250,000 B of total-size headroom** below 6,000,000 B; and
- at least **20 precache-entry slots** below 200.

Equivalent maximum target measurements are 5,750,000 B and 180 precache entries, subject to the existing budget tool's exact accounting. The final report must state both absolute remaining headroom and the measurements from `pnpm budget`.

### FR4 — Fixed-ceiling shortfall policy

If the safe optimization scope cannot reach both target values:

- keep the 6.00 MB / 200-entry ceilings unchanged;
- do not remove required assets to manufacture a passing result;
- do not add lazy loading, remote assets, or other runtime architecture changes;
- record the exact shortfall, the measured bottleneck categories, and evidence of completed safe optimizations; and
- mark the track blocked/incomplete for a separate owner decision.

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

- [ ] A reproducible baseline records the current production total, precache count, and category breakdown.
- [ ] Every removed shipped asset has documented proof that it is unused by runtime, PWA, dev harnesses, QA, and approved source assets.
- [ ] The final build leaves at least 250,000 B and 20 precache entries of headroom under the unchanged 6.00 MB / 200 ceilings, or the track is explicitly blocked with a measured shortfall report.
- [ ] `CI=true pnpm check`, `CI=true pnpm test --coverage`, `pnpm pack:check`, `pnpm build`, and `pnpm budget` pass.
- [ ] Production smoke, offline QA, and representative pack-level QA pass with zero uncaught page errors or missing precached assets.
- [ ] Visual review confirms no unacceptable regression in representative child-facing and parent-facing surfaces.
- [ ] Tech-stack/budget documentation and the track plan record the final measurements and any deviations.
- [ ] No runtime code, pack content, save schema, Rive behavior, dependency, or ceiling re-anchor is included unintentionally.

## 6. Out of Scope

- New content packs or levels, including Patterns Part 2.
- New skins, Rive authoring changes, or changes to character state machines.
- Runtime lazy loading, code splitting, remote asset delivery, or a redesigned PWA cache architecture.
- Changes to tracing, assists, audio, progression, rewards, save schema, or parent settings.
- Broad visual redesign or quality reductions that materially change the toddler-facing art.
- Raising the 6.00 MB / 200-entry ceilings to make the track pass.
- Unrelated dependency upgrades or repository cleanup.

## 7. Open Decisions

- Exact optimization techniques will be selected only after the baseline inventory identifies the largest safe opportunities.
- If the fixed-ceiling target is missed, the owner will decide whether to authorize a separate architecture/asset strategy track.
