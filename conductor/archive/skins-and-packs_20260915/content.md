# Content — Pre-writing re-ramp

Final geometry for the 12 slots + 3 bonus circles (Phase 3). Source of truth:
`src/packs/pre.ts` — keep the two in sync.

## The ramp

| Block | Slots | Line span | Wave bump | Arc rise | Zigzag | Circle Ø |
|---|---|---|---|---|---|---|
| Small | 1–4 | 140 px (x 145–285) | 25 px | 70 px | 2 teeth · 45 px deep | 150 |
| Medium | 5–8 | 230 px (x 100–330) | 55 px | 110 px | 3 teeth · 50 px deep | 200 |
| Large | 9–12 | 310 px (x 60–370) | 85 px | 160 px | 4 teeth · 55 px deep | 260 |

Conventions: line/wave/arc/zigzag run left → right; circles start at the top
and close back onto the start point; every stroke is horizontally centered on
x = 215; the goal is the last stroke point.

## Per-slot details

| Slot | Pattern | Block | Baseline (start y) | Notes |
|---|---|---|---|---|
| pre-1 | line | small | 430 | straight 140 px |
| pre-2 | wave | small | 455 | 4 bumps up to 430 |
| pre-3 | arc | small | 460 | crest at 390 |
| pre-4 | zigzag | small | 410 | 2 troughs at 455 |
| pre-5 | line | medium | 460 | straight 230 px |
| pre-6 | wave | medium | 515 | 4 bumps up to 460 |
| pre-7 | arc | medium | 515 | crest at 405 |
| pre-8 | zigzag | medium | 435 | 3 troughs at 485 |
| pre-9 | line | large | 560 | straight 310 px |
| pre-10 | wave | large | 560 | 4 bumps up to 475 |
| pre-11 | arc | large | 605 | crest at 445 |
| pre-12 | zigzag | large | 430 | 4 troughs at 485 |
| pre-bonus-1 | circle | small | top 355 | Ø 150, unlock at 4 |
| pre-bonus-2 | circle | medium | top 360 | Ø 200, unlock at 8 |
| pre-bonus-3 | circle | large | top 300 | Ø 260, unlock at 12 |

## Notes

- All 15 levels pass `validateLevel`; each is a single stroke (the engine's
  multi-stroke support stays, letters will need it).
- Sessions use the v1 constant of 6 checkpoints. On the small block that is a
  chime roughly every 20–35 px — watch chime density in the feel check;
  per-level checkpoint counts stay out of scope unless tuning demands them.
- The ramp values are provisional (approved spec table). Any tuning from the
  Phase 3 feel check updates this table and `src/packs/pre.ts` together.
