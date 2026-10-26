## Summary

The play field is no longer phone-shaped on tablets. The app now has six design spaces — the two phone
references plus 4:3 (960×1280 / 1280×960, iPads) and 16:10 (800×1280 / 1280×800, Android tablets) in
both orientations — and a viewport plays in the anchor that wastes the least screen, so an iPad and a
16:10 Android tablet fill edge to edge instead of sitting in a 683-px band with ~170 px of dead cream
per side. Backdrops cover-crop under a fixed horizon anchor, word rows recompose into the active
space's box, and every child and parent surface is recomposed at the new sizes with the 90 px toddler
target floor held. Both phone references stay pixel-identical to v1.7.0.

## Track

- **ID:** `tablet-fit_20261006`
- **Type:** Feature
- **Spec:** [`conductor/archive/tablet-fit_20261006/spec.md`](conductor/archive/tablet-fit_20261006/spec.md)
- **Plan:** [`conductor/archive/tablet-fit_20261006/plan.md`](conductor/archive/tablet-fit_20261006/plan.md)
- **Review:** [`conductor/archive/tablet-fit_20261006/review.md`](conductor/archive/tablet-fit_20261006/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Design-space foundation | Six-space decision recorded, space table + reflow plumbing | verified | `e0da9a4` | `fieldSpaceFor` falls back to the nearest anchor; every phone value kept byte-identical |
| 2: Level composition and reflow | Every level composes into the active box, rotation keeps progress | verified | `6bcb70d` | Word rows recompose into the space's box but never past a single letter's authored size |
| 3: Backdrop and art fit | Backdrops, success wash and particles cover the field under a fixed anchor | verified | `5535afc` | `backdropFit.ts` reproduces the authored phone crop exactly; no new assets |
| 4: Child surfaces | Splash, menu, packs, board, level, success, badge in-bounds with floors | verified | `93c863c` | Two-column portrait menu at 4:3+; a 4:3-or-taller portrait menu is the only layout rule that keys on the field height (debt below) |
| 5: Parent surfaces | Parent zone, name overlay, install panel usable; keyboard never covers the field | verified | `928b7a6` | Overlay/zone scale on `(fieldHeight − 860) / 420`; the keyboard lift is a `visualViewport` rule |
| 6: QA matrix, device pass, docs | Matrix green, phone baseline unchanged, docs match, device pass | verified | `7bd7483` | `qa-tablet.mjs` becomes the canonical probe; 170 assertions, 51 shots; owner device pass |
| R1: Review fixes | First review round | verified | `66248ec` | In-level park guards + two comment/assertion corrections |
| R2: Review fixes | Round-1 findings F1, F2 | verified | `2348307` | Mascot tap zone now sprite-sized; dusk sun restored on the phone landscape |

## Requirements

- [x] `FR1` — Six canonical spaces + deterministic nearest-anchor selection (test: `src/field.test.ts`)
- [x] `FR2` — Reflow plumbing: same-frame re-lay on `resize`, additive `__app.space()` (test: `src/field.test.ts`)
- [x] `FR3` — Level composition per space, word rows recompose (test: `src/packs/wide.test.ts`, `src/packs/wordSpace.test.ts`)
- [x] `FR4` — Cover-crop backdrops with a fixed anchor (test: `src/render/backdropFit.test.ts`, `src/app/render.test.ts`)
- [x] `FR5` — Child surfaces at tablet spaces, 90 px floor (test: `src/ui/menu.test.ts`, `src/ui/pack.test.ts`, `src/ui/mascot.test.ts`, `dev/qa/qa-tablet-surfaces.mjs`)
- [x] `FR6` — Parent zone, name overlay, install panel at tablet sizes (test: `src/ui/parentZone.test.ts`, `src/ui/install.test.ts`)
- [x] `FR7` — QA matrix + device pass (test: `dev/qa/qa-tablet.mjs`)
- [x] `FR8` — Docs and budget re-recorded (`conductor/tech-stack.md`, `conductor/product.md`, `dev/README.md`)
- [x] `NFR` — Coverage >80 % on new logic; zero new dependencies; save schema unchanged (v3)
- [x] `NFR` — Zero-text child surfaces; 90 px design floor at tablet scales
- [x] `NFR` — Phone portrait and landscape pixel-identical to v1.7.0, test-locked and owner-confirmed
- [x] `NFR` — Rotation reflow is instant (no blank frame, progress kept)
- [x] `AC1` — Every screen fills the viewport at 4:3 and 16:10, both orientations (41 field-fill assertions)
- [x] `AC2` — 1024×1366 dead space goes from ~170 px per side to 0 (0.00 px bars at the exact anchor)
- [x] `AC3` — Child screens in-bounds with floors held at every new space
- [x] `AC4` — Mid-trace rotation loses nothing (±0.02 progress, stroke index kept, run completes)
- [x] `AC5` — Backdrops cover with the anchor held, per skin (122 assertions)
- [x] `AC6` — Phones unchanged (both references ride every probe; owner pass)
- [x] `AC7` — Parent surfaces usable; the keyboard never covers the field
- [x] `AC8` — Matrix green, landscape green, zero-text clean, offline unaffected, budget within ceilings
- [x] `AC9` — Coverage, docs synced, review passed, device pass owner-confirmed (iPad + Android tablet, 2026-10-26)

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| lint + format | `CI=true pnpm check` → `biome check .` | 143 files clean | `conductor/archive/tablet-fit_20261006/verification/integrated.md` |
| typecheck | `tsc --noEmit` | clean | same |
| unit tests | `CI=true pnpm test --coverage` | 918 tests / 66 files | same |
| coverage | same run | 82.12 / 83.33 / 93.70 / 81.79 | same |
| build | `pnpm build` | ok, 10 precache entries | same |
| budget | `pnpm budget` | 5,564,592 / 6,000,000 B, 10 / 200 entries (+4,237 B of code over the baseline) | same |
| tablet matrix | `cd dev && node qa/qa-tablet.mjs` | 170 assertions, 51 shots, 0 failures | `dev/qa/out/tablet/` |
| landscape matrix | `cd dev && PORT=5176 node qa/qa-landscape.mjs` | 39 assertions, green | `dev/qa/out/landscape-run.log` |
| zero text | `cd dev && node qa/qa-animals-zerotext.mjs` | clean — splash, menu, pack, level | `dev/qa/out/zerotext-run.log` |
| offline | `cd dev && node qa/qa-offline.mjs` | 187/187 content, no gate, heals on reconnect | `dev/qa/out/offline-run.log` |
| perf | `cd dev && node qa/qa-perf.mjs` | p95 4.30 ms frames, 2.0–2.9 ms input-to-frame | `dev/qa/out/perf-run.log` |
| device | owner, iPad + Android tablet | fill, keyboard lift, parent zone, phone unchanged | `conductor/archive/tablet-fit_20261006/verification/phase-6-device.md` |

## Review

- **Verdict:** `PASS`
- **Rounds:** 2
- **Fixed:** 2 findings (F1 mascot tap zone, F2 dusk sun)
- **Accepted/deferred:** 2 (F3 tablet-portrait menu always two columns, F4 install card translucency) — see `review.md`

## Deviations and risks

- Two probes were stale rather than broken and were corrected inside the track: `qa-landscape` hard-coded the 860×430 phone box (it now reads `window.__app.space()`), and the zero-text audit assumed an unlocked menu (it now seeds the six-pack save).
- An Android 3:2 tablet lands on the 16:10 anchor and keeps a 5 % bar per side — the documented nearest-anchor tolerance, measured at 96 px.
- The 90 px floor is met on every target; the parent zone's mini cards and the badge row are the tightest cases and were screenshot-reviewed per space.
- `dev/qa/qa-cast.mjs` was found to be stale while verifying the mascot fix: it taps a hard-coded field point for the first menu card, which now lands in the gap between the two-column cards. Not part of this track's findings; left for a separate probe cleanup.

## Follow-ups

- [#22](https://github.com/mansyar/trace-discover/issues/22) — the shipped animals backdrop carries an opaque band in its top third (source pixels, not a crop; unaffected by the fit).
- F3 — a 4:3-or-taller portrait menu always takes the two-column grid, so a fresh three-card menu lays out half-width cards; needs the mascot size threaded into `menuLayout` and would change an approved screenshot.
- F4 — the install card is 97 % opaque (pre-existing, phone parity forbids the change here).
- `dev/qa/qa-cast.mjs` needs its card tap re-pointed at a real target.

## Rollback

```bash
# Merge commit
git revert --no-edit -m 1 <merge-commit>

# Squash commit
git revert --no-edit <squash-commit>
```

No save-schema migration, no feature flag, no data change: reverting restores the two-space phone
layout and the previous letterboxed tablets. Existing saves (v3) are untouched in both directions.
