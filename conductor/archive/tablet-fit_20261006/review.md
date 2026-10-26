# Review — tablet-fit_20261006

- **Track:** tablet-fit_20261006 — Tablet fit — fill the canvas on iPads and Android tablets
- **Type:** Feature
- **Branch:** `track/tablet-fit`
- **Range:** `d7c8765..HEAD` (38 code files, +5,290 / −289; reviewed per phase checkpoint plus the cross-phase diff — large-review volume strategy)
- **Date:** 2026-10-26
- **Round:** 2 (round 1: PASS WITH FINDINGS — F1, F2 fixed in Phase R2; F3, F4 recorded as debt)
- **Verdict:** **PASS**

## Summary

The track does what it set out to do: six design spaces with a nearest-anchor rule, a
cover-cropped backdrop policy, recomposed child and parent surfaces, and a canonical matrix that
proves the fill, the floors and the rotation behaviour at every tablet space. The phone references
are untouched by construction — every new factor is 0/1 on them and the authored numbers are
test-locked — and the owner confirmed the device pass. The review found one real defect the
probes could not see (the parked mascot's tap zone is still phone-sized) and two parity/nit items;
no requirement is unmet.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| lint + format | `CI=true pnpm check` → `biome check .` | 143 files, clean | `verification/integrated.md` |
| typecheck | `tsc --noEmit` | clean | same |
| tests | `CI=true pnpm test --coverage` | 916 tests / 66 files, all pass | same |
| coverage | same run | 82.12 / 83.30 / 93.70 / 81.79 | same |
| build | `pnpm build` | ok, 10 precache entries | same |
| budget | `pnpm budget` | 5,564,571 / 6,000,000 B, 10 / 200 | same |
| tablet matrix | `node qa/qa-tablet.mjs` | 170 assertions, 51 shots, 0 failures | `dev/qa/out/tablet/` |
| landscape matrix | `node qa/qa-landscape.mjs` | 39 assertions, green | `dev/qa/out/landscape-run.log` |
| zero text | `node qa/qa-animals-zerotext.mjs` | clean on splash/menu/pack/level | `dev/qa/out/zerotext-run.log` |
| offline | `node qa/qa-offline.mjs` | 187/187, no gate, heals on reconnect | `dev/qa/out/offline-run.log` |
| perf | `node qa/qa-perf.mjs` | p95 4.30 ms frames, 2.0–2.9 ms input-to-frame | `dev/qa/out/perf-run.log` |
| device | owner, iPad + Android tablet | fill, keyboard lift, phone unchanged | `verification/phase-6.md` |

## Requirements coverage

| ID | Requirement | Implementation | Verification | Status |
| --- | --- | --- | --- | --- |
| FR1 | Six spaces + nearest-anchor selection | `src/field.ts` (`FIELD_SPACES`, `letterboxLoss`, `fieldSpaceFor`) | `field.test.ts` (exact anchors, 3:2, square, ties), matrix nearest-anchor case | covered |
| FR2 | Reflow plumbing, additive probe | `main.ts` `rebuildViews`/`resize`/`reflowRun`, `__app.space()` | `field.test.ts`, matrix rotations | covered |
| FR3 | Level composition per space, rows recompose | `packs/wide.ts` `levelForSpace`, `packs/word.ts` `wordRowBox`, `packs/name.ts`, `packs/letters.ts` | `wide.test.ts`, `wordSpace.test.ts`, `qa-tablet-rows`, `qa-tablet-trail` | covered |
| FR4 | Cover-crop + fixed anchor | `src/render/backdropFit.ts`, `drawBackdrop`, `drawDuskPlaceholder` | `backdropFit.test.ts`, `qa-tablet-backdrops` | covered |
| FR5 | Child surfaces recompose, 90 px floor | `ui/menu.ts`, `ui/pack.ts`, `ui/mascot.ts`, `ui/badge.ts`, `render.ts` | `qa-tablet-surfaces` (77 shots), `qa-tablet` | covered |
| FR6 | Parent zone, overlay, install panel | `ui/parentZone.ts`, `ui/install.ts`, `main.ts` keyboard inset | `parentZone.test.ts`, `install.test.ts`, `qa-tablet-parent`, matrix | covered |
| FR7 | QA matrix + device pass | `dev/qa/qa-tablet.mjs` | 170 assertions; owner device pass | covered |
| FR8 | Docs + budget | `tech-stack.md`, `product.md`, `dev/README.md` | dated notes, budget record | covered |
| NFR | 916 tests, coverage > 80 % on new logic | — | 82.12 / 83.30 / 93.70 / 81.79; new modules 100 % | covered |
| NFR | Zero new dependencies, zero network, save schema v3 | — | `package.json`, lockfile, `src/save/**` untouched | covered |
| NFR | Zero-text child surfaces | — | zero-text audit | covered |
| NFR | Phone portrait + landscape pixel-identical | every rule neutral on the phone references | test-locked authored values; owner pass | covered (F2, placeholder only) |
| NFR | Instant reflow | same-frame re-lay in `resize`/`reflowRun` | matrix rotations | covered |
| AC1 | Every screen fills the viewport on 4:3 and 16:10, both orientations | — | 41 field-fill assertions | met |
| AC2 | 1024×1366 dead space → 0 | — | 0 px bars at the exact 4:3 anchor | met |
| AC3 | Child screens in-bounds with floors | — | matrix + surfaces probe | met |
| AC4 | Mid-trace rotation loses nothing | — | rotation assertions (±0.02 progress) | met |
| AC5 | Backdrops cover with the anchor held | — | `qa-tablet-backdrops` (122 assertions); band → issue #22 | met |
| AC6 | Phones unchanged | — | every probe carries both references; owner pass | met (F2) |
| AC7 | Parent surfaces usable; keyboard never covers the field | — | `qa-tablet-parent`, layout tests, owner device pass | met |
| AC8 | Matrix green, landscape green, zero-text, offline, budget | — | as above | met |
| AC9 | Coverage, docs, review, device pass | — | this review; device pass confirmed | met (this round) |

## Findings

### F1 — Medium: the parked mascot's tap zone is still phone-sized, so tablet taps miss the sprite — **fixed in Phase R2**

- **Where:** `src/ui/mascot.ts:68` (`mascotZone`), used by `src/main.ts:850` (`tryGiggle`).
- **What:** `mascotZone` computes the zone from `FIELD_WIDTH * scale` and `MASCOT_OFFSET_Y`, i.e. a
  430-based square. Since this track the parked sprite is drawn at `min(space.width, space.height) *
  scale` (`main.ts` `mascotSize`, `positionCharacter`), so on a 4:3 portrait field the sprite is
  **307 units** wide while its hit circle is **137.6** and its centre sits `0.38 × (307 − 137.6) ≈
  64 units` above the sprite's centre. Tapping the visible mascot's outer half — or its middle — does
  nothing on any tablet space. `main.ts:630` (`fieldMascot`) already has the size-aware box, so the
  two sides of the same sprite disagree.
- **Why it matters:** the giggle reaction is a shipped touch affordance on the menu and pack screens;
  on the surfaces this track introduces it is effectively unusable, and it silently regressed because
  the phone references are the one place `FIELD_WIDTH` equals the sprite size.
- **Fix:** make the zone take the sprite size in field units —
  `mascotZone(park, size)` — and pass `mascotSize(scale)` from `tryGiggle` (and
  `FIELD_WIDTH * config.scale` from the `dev/screens.ts` tuning overlay, which draws at the phone
  size). Add a tablet case asserting the zone's radius is half the sprite and its centre is the
  sprite's centre.
- **Requirement:** NFR/FR5 (touch affordances at the new sizes; the 90-px floor claim extends to
  every delivered target).
- **Test gap:** `mascot.test.ts` only ever measured a phone-sized sprite.

### F2 — Low: the dusk placeholder's sun moved on the phone landscape (parity) — **fixed in Phase R2**

- **Where:** `src/app/render.ts` `drawDuskPlaceholder`.
- **What:** the sun was at a fixed `y = 150` in both orientations; it is now
  `design.height * (150 / FIELD_HEIGHT)`, so the phone landscape (430 tall) puts it at **75** where
  it shipped at 150. Only the painted stand-in frame before a backdrop decodes is affected, but that
  frame is part of the phone's first paint and the track's AC6 is pixel-identical.
- **Fix:** scale the sun by the active orientation's reference height
  (`150 / (landscape ? 430 : 860)`), which restores 150 on both phone references and keeps the share
  on the tablet spaces.
- **Requirement:** AC6 / NFR (phone output unchanged).

### F3 — Low (no fix, documented): a tablet-portrait menu always takes the two-column grid

- **Where:** `src/ui/menu.ts` `tallCards` (`fieldHeight <= TALL_STACK_MAX_HEIGHT`).
- **What:** the rule keys on the field height, not on whether the stack plus the mascot's band
  actually fits, so a fresh **three-card** tablet menu lays out half-width cards where three
  full-width cards would fit.
- **Why it is acceptable:** the layout has no access to the mascot size, and the six-card case (the
  one the owner approved) is exactly what the rule is for; three half-width cards still meet the
  target floor and read fine.
- **Disposition:** recorded as debt (below), not fixed — it would change an approved screenshot and
  needs the mascot size threaded into `menuLayout`.

### F4 — Low (not introduced here): the install card is 97 % opaque

- **Where:** `src/app/render.ts` `drawInstallPanel`.
- **What:** the shipped `rgba(255, 255, 255, 0.97)` lets the parent zone ghost through, which is more
  visible on a big tablet card.
- **Disposition:** pre-existing and unchanged by this diff; changing it would break phone parity.
  Recorded as debt.

## Plan compliance

Every phase has a Result, Checkpoint and Evidence; every `[x]` task is implemented in the diff
(verified by reading the per-phase commits); no task was dropped; the diff stays inside the union of
the phases' `Touches` — the two exceptions (`dev/qa/qa-landscape.mjs` and
`dev/qa/qa-animals-zerotext.mjs`, both stale-probe corrections) are inside `dev/qa/**` and recorded
as deviations in `verification/phase-6.md`. Phase R1 (review fixes) is complete at `66248ec`.

## Out of scope

Tall-phone (>2:1) residual bars, continuous aspect matching, landscape phone re-architecture, new
art (the animals backdrop band is issue #22), new packs or skins, parent-zone redesign, engine
tuning, save schema changes, desktop/ultrawide.

## Debt

| Item | Reason | Where |
| --- | --- | --- |
| F3 — tablet-portrait menu always two columns | would change an approved screenshot; needs the mascot size in `menuLayout` | this review |
| F4 — install card translucency | pre-existing; phone parity forbids the change here | this review |
| Animals backdrop top band | source pixels, not a crop; re-render tracked | [#22](https://github.com/mansyar/trace-discover/issues/22) |

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 1 (F1) | 3 (F2, F3, F4) | F1, F2 → Phase R2 |
| 2 | PASS | 0 | 0 | 0 | 2 (F3, F4 as debt) | F1, F2 verified fixed at `2348307` |

## Round 2 — fix verification

Phase R2 (`2348307`, [evidence](verification/phase-R2.md)) resolved both actionable findings at the
root, red first:

- **F1** — `mascotZone(park, size)` now takes the sprite square in field units, and `tryGiggle`
  passes `mascotSize(scale)` — the same number `positionCharacter` draws. The unit test covers the
  138-, 256- and 307-unit sprites; a live probe on the production build confirms the sprite's outer
  half now starts the giggle note on the 4:3 portrait, 16:10 portrait and 4:3 landscape spaces while
  a tap 0.9 sprite-widths out stays ignored, and the phone still behaves exactly as shipped.
- **F2** — the dusk sun's share is taken against the active orientation's reference height, restoring
  `y = 150` on both phone references (the landscape had moved to 75); a painter test reads the arc
  out of `drawLevel` and locks the phone references and the tablet share.

Re-ran every gate on the fix delta: `pnpm check` clean (143 files), 918 tests / 66 files, coverage
82.12 / 83.33 / 93.70 / 81.79, build ok, budget 5,564,592 B / 10 entries (+21 B over round 1), and the
probes on the new build — `qa-tablet` 170 assertions / 51 shots / 0 failures, `qa-landscape` 39
assertions green, zero-text audit clean. No new findings; no requirement regressed. F3 and F4 stay
recorded as debt with their reasons.

## Doc sync

`updated` — `tech-stack.md` carries the round-2 numbers and `product.md` needed no change; the track
is complete from a review standpoint.
