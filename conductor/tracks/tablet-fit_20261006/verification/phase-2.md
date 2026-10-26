# Phase 2 verification — Level composition and progress-preserving reflow

- **Track:** tablet-fit_20261006 — Tablet fit — fill the canvas on iPads and Android tablets
- **Phase:** 2 — Level composition and progress-preserving reflow across spaces
- **Date:** 2026-10-26 (accepted) · tasks landed 2026-10-06 → 2026-10-08
- **Branch:** `track/tablet-fit`
- **Base:** `e0da9a4` (Phase 1 checkpoint)
- **Head:** `6bcb70d`
- **Result:** verified

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| check | `CI=true pnpm check` | 0 | Biome clean on 141 files; `tsc --noEmit` clean |
| test | `CI=true pnpm test` | 0 | Vitest 65 files / 854 tests passed |
| qa (rotation) | `cd dev && node qa/qa-tablet-rotate.mjs` | 0 | 31 assertions: 4:3 + 16:10 × both directions, mid-stroke, progress preserved |
| qa (rows) | `cd dev && node qa/qa-tablet-rows.mjs` | 0 | 155 assertions, 0 failures; 16 labelled shots + gallery |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR3 | Every level composes fit-and-center per space; word rows recompose into the active space's box; no glyph above scale 1.0; no engine retune | `abe9674` (space-aware boxes + `wordSpace`/`packs` tests), `dev/qa/qa-tablet-rows.mjs` — authored 332.4-unit cap held in every space, 7-letter row grows ≥1.5× the phone reference, 5-letter row identical everywhere | met |
| FR3 (row band) | The row's vertical band inside the larger box is screenshot- and device-signed-off | `dev/qa/out/tablet-rows/` (16 shots + `gallery.html`); mascot park measured clear below the band on all four tablet spaces; owner approved 2026-10-26 | met |
| FR3 (trail guide) | Guide thickness matches the phone reference (no per-space retune) | `f150a89` — `qa-tablet-trail`: ribbon 64.0–64.5 units everywhere; per-letter density 0.188–0.249 inside the shipped landscape-phone band 0.228; recorded in `tech-stack.md` 2026-10-07 | met |
| AC3 | All child screens in-bounds with target floors at every new space | Partly Phase 2 (level + rows in-bounds); surface coverage is Phase 4 | carried to Phase 4 |
| AC4 | Rotating mid-trace across phone↔tablet loses no progress and does not crash; reflow is instant | `7ae2a6e` (session reflow + park re-seat), `qa-tablet-rotate.mjs`: level kept, stroke index kept, progress 0.500 → 0.500 on all four rotations, run still completes, 0 page errors | met |

## Evidence paths

- `dev/qa/qa-tablet-rotate.mjs` — mid-trace rotation probe (uses the additive `window.__app.progress()` probe added in `6bcb70d`)
- `dev/qa/out/tablet-rotate/` — before/after pairs plus close-ups, `gallery.html`
- `dev/qa/qa-tablet-rows.mjs`, `dev/qa/out/tablet-rows/` — row-band probe, measurements and gallery
- Commits: `abe9674`, `f150a89`, `7ae2a6e`, `c67ccdd`, `6bcb70d`

## Deviations

- `src/main.ts` gained an additive `progress()` field on the `window.__app` probe (`6bcb70d`) so a rotation can assert preserved progress without reading canvas pixels. Additive only; existing probes unchanged. It is reused by the Phase 6 matrix.
- `dev/README.md` gained the `qa-tablet-rotate` row (same commit), matching the reserved probe-table entry.

## Primary verification

Re-run by the orchestrator at acceptance, on head `6bcb70d`:

- `CI=true pnpm check` → exit 0 (Biome: 141 files, no fixes; tsc clean)
- `CI=true pnpm test` → exit 0 (65 files, 854 tests passed)
- `git diff --name-only e0da9a4..HEAD` reviewed: every changed file falls inside the phase's `Touches` (`src/packs/**`, `src/app/**`, `src/main.ts` via the `src/shell`/app probe, `dev/qa/**`, `dev/README.md`, `conductor/**`)

## Notes

- No squash: the range `e0da9a4..HEAD` also contains the Phase R1 fix commit `e1dd3b2` and the Conductor 2.0 migration commit `7b34933`. Folding those into a Phase 2 feature commit would rewrite already-verified phase work, so the task commits were kept and the checkpoint is the last of them.
- Phase 2 was executed directly by the orchestrator (no phase subagent is available in this host).
