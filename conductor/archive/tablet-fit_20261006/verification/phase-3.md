# Phase 3 verification — Backdrop and art fit (cover-crop, fixed anchor)

- **Track:** tablet-fit_20261006 — Tablet fit — fill the canvas on iPads and Android tablets
- **Phase:** 3 — Backdrop and art fit — cover-crop with a fixed anchor
- **Date:** 2026-10-26
- **Branch:** `track/tablet-fit`
- **Base:** `6bcb70d` (Phase 2 checkpoint)
- **Head:** `5535afc`
- **Result:** verified (owner accepted the per-skin sweep 2026-10-26; P3.T1–P3.T3 accepted)

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| check | `CI=true pnpm check` | 0 | Biome 143 files, `tsc --noEmit` clean |
| test | `CI=true pnpm test --coverage` | 0 | 870 tests (65 files); `backdropFit.ts` 100/100/100/100; global 79.07 / 81.04 / 92.25 / 78.67 against 72 / 76 / 88 / 72 |
| qa (art fit) | `cd dev && node qa/qa-tablet-backdrops.mjs` | 0 | 122 assertions, 0 failures, 40 shots + gallery |

## What changed

- `src/render/backdropFit.ts` — pure `coverFit(source, design, anchor)`: cover scale on the
  looser axis, per-axis anchor (the point of the source held at the same field fraction),
  exact `0` on an uncropped axis, full-field fallback for a degenerate source or design.
  `BACKDROP_ANCHOR` is the image centre, where the square backdrops compose the horizon and
  the ground band, so a deeper crop never slides the composition.
- `src/app/render.ts` — `drawBackdrop` uses the module instead of an inline centre-crop, and
  `drawDuskPlaceholder` takes the design space: the no-art stand-in used to fill a 430×860
  corner of a tablet field while a skin's backdrop decoded.
- `dev/qa/qa-tablet-backdrops.mjs` — the per-skin sweep and the success-wash probe.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR4 (cover-crop) | Backdrops cover the field under a fixed anchor; no bars, gaps or seams inside it | 8/8 edge samples are backdrop on every skin × space (36/36); 8 points per space match the documented crop of the same 1024² image, computed independently in the probe (worst Δ 19.7/255 across all 36) | met |
| FR4 (anchor) | The anchor holds the ground line and horizon | Portrait spaces show the identical vertical window as the authored phone portrait (`y = 0`, verified by the fit tests); landscape spaces crop the middle band only, so the same authored ground band is what you see. `coverFit` tests pin the anchor mapping, the tie-breaking axis and the shipped phone geometry exactly | met |
| FR4 (success) | Success wash, confetti and particles cover the field at every space | 6/6 wash sample points change on all four tablet spaces (wash reaches every edge); the burst confetti spans all four quadrants on all four tablet spaces (59–79 sampled pixels) | met |
| FR4 (per skin) | Per-skin backdrop results are screenshot-approved (six skins) | 36 labelled shots at `dev/qa/out/tablet-backdrops/` + `gallery.html`; owner approved the sweep 2026-10-26, recording the animal asset band as separate art debt | met |
| AC5 | Backdrops cover the field with the anchor held, verified per skin | As above | met |

## Finding — one shipped asset crops badly (pre-existing, not this track)

`public/art/bg/animals.webp` carries an opaque grey-olive band across its top ~28% — a
generation artifact baked into the shipped file. It is visible on **every** screen that
uses the animal skin, including both phone references today (the phone portrait field shows
the full image height), so the track did not introduce it and the anchor policy cannot crop
it away: it is part of the source pixels.

Options put to the owner at the gate:

1. Approve the fit as-is and record the asset defect as a separate art task (no code change).
2. Re-render `animals.webp` through the img2img pipeline first (spec allows a single
   re-render when a skin crops badly); this needs the generation pipeline and API access,
   and re-measures `pnpm budget` afterwards.

**Owner decision 2026-10-26: option 1.** The fit stands; the asset band is filed as art debt
in [issue #22](https://github.com/mansyar/trace-discover/issues/22) with the reproduction and
the acceptance for a re-render. No code, art or budget change in this phase.

## Evidence paths

- `src/render/backdropFit.ts`, `src/render/backdropFit.test.ts` (12 cases)
- `src/app/render.test.ts` (4 painter cases: phone geometry, tablet-landscape crop, slate
  coverage, stand-in fill)
- `dev/qa/qa-tablet-backdrops.mjs`, `dev/qa/out/tablet-backdrops/` (36 skin shots + 4 success
  shots + `gallery.html` + `run.log`)
- Commits: `a8e4bdc` (module + wiring), `5535afc` (probe + docs)

## Deviations

- `src/app/render.test.ts` gained a `createLinearGradient` stub and a minimal snapshot fixture
  so the stand-in fill could be asserted at a tablet space. Painter-test scaffolding only.
- `dev/README.md` gained the `qa-tablet-backdrops` row.

## Primary verification

Re-run by the orchestrator on head `5535afc`:

- `CI=true pnpm check` → exit 0
- `CI=true pnpm test --coverage` → exit 0 (870 tests, thresholds met)
- `cd dev && node qa/qa-tablet-backdrops.mjs` → exit 0 (122 assertions, 0 failures)
- `git diff --name-only 6bcb70d..HEAD` reviewed: every changed file is inside the phase's
  `Touches` (`src/app/render.ts`, `src/render/**`, `dev/qa/**`, `dev/README.md`, `conductor/**`)

## Notes

- Phase 3 is executed directly by the orchestrator (no phase subagent is available in this host).
- The sweep runs the six shipped skins at all six spaces, so the two phone references are in
  the same run as the tablet spaces: the phone rows are the pre-tablet reference for every
  assertion rather than a separate baseline.
