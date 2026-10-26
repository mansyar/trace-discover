# Integrated verification — tablet-fit_20261006

- **Track:** tablet-fit_20261006 — Tablet fit — fill the canvas on iPads and Android tablets
- **Branch:** `track/tablet-fit`
- **Range:** `d7c8765..HEAD` (38 code files, +5,290 / −289; 51 files with the conductor documents)
- **Date:** 2026-10-26
- **Result:** **green** — every layer runs on the branch tip, not a per-phase repeat

## Commands

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| lint + format | `CI=true pnpm check` → `biome check .` | 0 | 143 files checked, no fixes applied |
| typecheck | `CI=true pnpm check` → `tsc --noEmit` | 0 | strict, clean |
| unit tests | `CI=true pnpm test --coverage` | 0 | 916 tests / 66 files |
| coverage | (same run) | — | 82.12 stmts / 83.30 branch / 93.70 funcs / 81.79 lines against 72 / 76 / 88 / 72 |
| build | `pnpm build` | 0 | vite + PWA `generateSW`, 10 precache entries |
| budget | `pnpm budget` | 0 | 5,564,571 / 6,000,000 B, 10 / 200 entries |
| qa (matrix) | `cd dev && node qa/qa-tablet.mjs` | 0 | 170 assertions, 51 shots, 0 failures on the branch tip |

## Supporting probes, and where each one ran

The canonical matrix above ran at the branch tip. The per-area probes below each ran at their own
phase checkpoint; they are listed with that provenance rather than re-claimed for the tip. No
child-surface, level or backdrop source changed after the commit named for each row (Phase 5
touched only the parent surfaces, Phase 6 only probes and documents), so they still describe the
tip, and the matrix re-exercises their surface at the tip anyway.

| Probe | Ran at | Exit | Result |
| --- | --- | --- | --- |
| `qa-tablet-parent.mjs` | Phase 5 head `928b7a6` | 0 | 24 shots, 0 failures — parent zone, install card, name overlay at six spaces |
| `qa-tablet-surfaces.mjs` | Phase 4 head `93c863c` | 0 | 77 shots, 0 failures — every child surface at six spaces |
| `qa-tablet-backdrops.mjs` | Phase 3 `5535afc` | 0 | 122 assertions — six skins × six spaces, wash + confetti |
| `qa-tablet-rows.mjs` | Phase 2 `6bcb70d` | 0 | 155 assertions — word-row band, growth, cap |
| `qa-tablet-rotate.mjs` | Phase 2 `6bcb70d` | 0 | 31 assertions — mid-trace rotation, both families both directions |
| `qa-tablet-trail.mjs` | Phase 2 `f150a89` | 0 | 64.0–64.5-unit ribbon in every space |
| `qa-landscape.mjs` | Phase 6 head | 0 | 39 assertions — the canonical landscape matrix, still green |
| `qa-animals-zerotext.mjs` | Phase 6 head | 0 | splash / menu / pack / level clean |
| `qa-offline.mjs` | Phase 6 head | 0 | 187/187 content, no gate, `pre-1` traces offline, stand-ins heal |
| `qa-perf.mjs` | Phase 6 head | 0 | 140–180 ms boot, 2.0–2.9 ms input-to-frame, p95 4.30 ms frames |

## Summary

No layer regressed while the phases accumulated: the phone references still ride every probe, the
landscape matrix still passes (after learning the six spaces), and the dist budget moved only by
**+4,216 B of code** with no new asset and no new dependency. The one acceptance item headless
Chromium cannot produce — the iPad/Android device pass, including the soft-keyboard lift — was
confirmed by the owner on 2026-10-26.

Phase checkpoints: `e0da9a4` (1), `6bcb70d` (2), `5535afc` (3), `93c863c` (4), `928b7a6` (5),
`7bd7483` (6); review fixes `66248ec` (R1).
