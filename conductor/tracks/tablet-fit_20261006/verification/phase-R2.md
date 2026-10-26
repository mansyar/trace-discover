# Phase R2 verification — Review Fixes

- **Track:** tablet-fit_20261006 — Tablet fit — fill the canvas on iPads and Android tablets
- **Phase:** R2 — Review Fixes (round-1 findings F1, F2)
- **Date:** 2026-10-26
- **Branch:** `track/tablet-fit`
- **Checkpoint:** `2348307`
- **Result:** verified

Each fix was written red first (the failing test was seen failing for the reason
the review named), then green.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| check | `CI=true pnpm check` | 0 | biome 143 files clean, `tsc --noEmit` clean |
| test | `CI=true pnpm test --coverage` | 0 | 918 tests / 66 files (was 916) |
| coverage | same run | — | 82.12 stmts / 83.33 branch / 93.70 funcs / 81.79 lines |
| build | `pnpm build` | 0 | ok, 10 precache entries (1,144.72 KiB) |
| budget | `pnpm budget` | 0 | 5,564,592 / 6,000,000 B, 10 / 200 entries (+21 B) |
| tablet matrix | `node qa/qa-tablet.mjs` | 0 | 170 assertions, 51 shots, 0 failures |
| landscape matrix | `PORT=4173 node qa/qa-landscape.mjs` | 0 | 39 assertions, green |
| zero text | `node qa/qa-animals-zerotext.mjs` | 0 | clean — splash, menu, pack, level |

## F1 — the parked mascot's tap zone was phone-sized

**Red.** `mascot.test.ts`'s helpers were switched to pass the sprite size and a
case added for the three sizes a space can produce; 11 tests failed against the
scale-based signature (`expected 18616.12 to be greater than 24037` — the zone
was `FIELD_WIDTH × size` wide, i.e. a 430-based square squared again).

**Green.** `mascotZone(park, size)` takes the sprite square in field units;
`tryGiggle` passes `mascotSize(scale)` — the same `min(field edge) × scale` that
`positionCharacter` draws — and `dev/screens.ts` passes `FIELD_WIDTH × scale`,
the phone-sized sprite the tuning overlay actually draws.

**Live evidence** (production build on `:4173`, throwaway probe, oscillator
starts counted because the giggle note is a WebAudio tone):

| Space | Sprite | Tap 0.40 sprite-widths from center | Tap 0.90 out |
| --- | --- | --- | --- |
| phone-portrait (430×860) | 137.6 px / 138 units | giggles (1 note) | ignored |
| tablet-portrait (960×1280) | 307.2 px / 307 units | giggles (1 note) | ignored |
| slate-portrait (800×1280) | 256.0 px / 256 units | giggles (1 note) | ignored |
| tablet-landscape (1280×960) | 307.2 px / 307 units | giggles (1 note) | ignored |

Before the fix that same point on a 4:3 portrait field was 138 units from the
zone's center against a radius of 68.8 (the review's arithmetic), so the outer
half of the drawn sprite was dead. The phone column is unchanged: its sprite is
the 430-based square the old formula assumed, so the two formulas coincide.

## F2 — the dusk placeholder's sun moved on the phone landscape

**Red.** `render.test.ts` gained a painter case that reads the sun disc's arc
out of `drawLevel`: `expected { x: 430, y: 75 } to deeply equal { x: 430, y: 150 }`.

**Green.** The sun's share is taken against the active orientation's reference
height (`FIELD_HEIGHT / 2` when the field is wider than tall), which restores
`y = 150` on the 430×860 and 860×430 phone references and keeps the same share
of the short edge on tablets (223 on a 4:3 portrait, 335 on a 4:3 landscape).

## Coverage of the findings

| Finding | Severity | Status |
| --- | --- | --- |
| F1 — tap zone phone-sized on tablet spaces | Medium | fixed, unit test + live evidence |
| F2 — dusk sun moved on the phone landscape | Low | fixed, painter test |
| F3 — tablet-portrait menu always takes two columns | Low | debt (unchanged) |
| F4 — install card at 97 % opacity | Low | debt (pre-existing) |

## Deviations

None. `src/ui/menu.test.ts` is touched beyond the plan's `Touches` list: its one
`mascotZone` call had to follow the new signature — same module the fix owns,
no behaviour change.

## Evidence paths

- Checkpoint `2348307` (+ git note)
- Probe logs: `dev/qa/out/tablet-run.log`, `dev/qa/out/landscape-run.log`,
  `dev/qa/out/zerotext-run.log`; tablet shots `dev/qa/out/tablet/`
