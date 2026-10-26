# Phase 4 verification — Child surfaces at tablet spaces

- **Track:** tablet-fit_20261006 — Tablet fit — fill the canvas on iPads and Android tablets
- **Phase:** 4 — Child surfaces at tablet spaces (screenshot-approved)
- **Date:** 2026-10-26
- **Branch:** `track/tablet-fit`
- **Base:** `31674c9` (Phase 3 acceptance)
- **Head:** `93c863c`
- **Result:** implemented and measured; **awaiting the owner's screenshot approval** on P4.T1–P4.T3

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| check | `CI=true pnpm check` | 0 | Biome 143 files, `tsc --noEmit` clean |
| test | `CI=true pnpm test --coverage` | 0 | 886 tests (66 files); `pack.ts` / `badge.ts` 100 %, `mascot.ts` 100 % stmts, `menu.ts` 97.74 / 90.47 / 100 / 97.69, global 81.67 / 82.17 / 93.63 / 81.34 against 72 / 76 / 88 / 72 |
| qa (surfaces) | `cd dev && node qa/qa-tablet-surfaces.mjs` | 0 | 77 shots, 0 failures — six spaces × (splash, menu, six pack grids, abc page two, sticker board, level, success, badge) |

## What the sweep found

The child surfaces were already layout-driven (`menuLayout`, `packLayout`,
`stickerBoardLayout`, `successLayout`, `badgeLayout`, `splashLayout` all take the field), so
the failures were all authored **absolute offsets** that no longer covered the bigger sprite
or the taller field:

1. **The parked mascot was clipped.** The character canvas is `min(field) × scale` with its
   centre 0.38 of that below the park, so the box hangs `0.88 × size` under the park point.
   The authored park offsets (menu 125/130 from the bottom, wide-field pack 55 from the right)
   were measured against a 137-unit phone sprite; a 960×1280 field draws the same scale as a
   307-unit sprite, which hung off the bottom (menu) and right (pack) edges.
2. **The pack mascot covered the sticker shelf** on a tall portrait field, including the
   shelf's tap band.
3. **The in-level character was cut in half**: `CHARACTER_SCALE` 0.62 of the short edge is 31 %
   of the field height on both phone references but 46 % on a 4:3 portrait field.
4. **The parent-gate hint chip used `FIELD_WIDTH`** (the phone constant), so on any wider field
   it landed over the left card column instead of under the corner it points at.
5. **The portrait pack shelf sat at an absolute y = 692**, stranding itself mid-screen on a
   1280-tall field with the gold shelf pulse covering the lower half.
6. **The landscape shelf band was a fixed 630 units wide**, so on a 1280-wide field it stopped
   short and left the mascot isolated on the right.
7. **Six full-width menu cards plus the parked mascot do not fit a 4:3 portrait field**, so the
   single-column stack rode over the mascot's band.
8. The badge seal sat at an absolute y = 380, high in a 1280-tall field.

## What changed

- `src/ui/mascot.ts` — `clampPark(park, size, fieldWidth, fieldHeight, bottomLimit)`: pulls a
  park in only when its sprite box would leave the field, with a 1-unit tolerance so the
  authored phone parks (the wide pack park kisses the edge by 0.9 units) are returned
  byte-identical.
- `src/ui/pack.ts` — `packParkPosition(…, mascotSize)` clamps the portrait park against the
  shelf's top edge (`bottomLimit`); the portrait shelf is `fieldHeight − 168`; the landscape
  shelf band runs to `fieldWidth − 120`.
- `src/ui/menu.ts` — `menuParkPosition(…, mascotSize)` clamps; a field taller than 860 units
  uses the two-column grid instead of the full-width stack.
- `src/ui/badge.ts` — the seal keeps the phone's share of the field height (380/860, 170/430).
- `src/app/render.ts` — the parent hint hangs off `gate.x + gate.width`.
- `src/main.ts` — parks receive the sprite size the shell draws; the in-level scale is capped
  at `height × CHARACTER_SCALE / 2` (397 units instead of 595 on 960×1280); the success park is
  clamped.
- Tests: `ui/mascot`, `ui/menu`, `ui/pack`, `ui/badge`, `app/render` gained tablet cases that
  sit beside the phone-parity cases (`650 → 260`-style authored values stay locked).

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR5 (menu) | Card grid/wrap, dot strips, pager band, gate corner, skin button and mascot park recompose in-bounds | menu sweep at six spaces: every target ≥ 45 units inside the field, mascot box whole (tablet portrait `326,973 → 634,1280`; landscape `486,653 → 794,960`); two-column grid on 4:3 portrait | met |
| FR5 (pack) | Per-pack grids, pagers, sticker shelves, badge seals and home recompose in-bounds | six pack grids × six spaces + ABC page two: all targets in-bounds, mascot box stops at the shelf (`355,862 → 605,1112` on 960×1280, `296,904 → 504,1112` on 800×1280) | met |
| FR5 (board / success / badge / splash) | Sticker board, success, badge and splash recompose in-bounds | each captured at six spaces; success mascot clamped whole (`283,563 → 680,960`); badge seal on the phone's height share | met |
| FR5 (floor) | The 90 px design touch-target floor is held at tablet scales | every target centre keeps 45 units from every edge on all four tablet spaces (a 90-unit control therefore fits whole). The sticker board is exempt on the *phone* references only: its 29-level grid has always shrunk below the floor there (pre-existing), while every tablet board holds it | met |
| AC1 | Every screen fills the viewport with no bars | no bars: the sweep's spaces are exact anchors and the room shows the field edge to edge | met (screenshots) |
| AC3 | All child screens in-bounds with target floors held | as above | **awaiting owner approval** |
| AC6 | Phones unchanged | both phone references are in the same sweep; every rule is a no-op there by construction and locked by tests (`menuParkPosition` 735/300, `packParkPosition` 572/805, badge 380/170, hint 170) | met (pixel comparison lands in Phase 6) |

## Evidence paths

- `dev/qa/qa-tablet-surfaces.mjs` — the matrix probe (six spaces, 77 shots, gallery).
- `dev/qa/out/tablet-surfaces/` — labelled screenshots + `gallery.html`.
- Commits `ca044bf` (surfaces), `93c863c` (probe + README), note on `93c863c`.

## Deviations

- `src/app/render.test.ts` gained `rect`/`roundRect` capture on its fake context so the hint
  chip's geometry could be asserted. Painter-test scaffolding only.
- `dev/README.md` gained the `qa-tablet-surfaces` row.

## Notes

- The in-level character's canvas keeps the phone's ~9 % transparent padding below the feet;
  the probe allows exactly that share below the field edge for the level screen and nothing
  more, so a future scale change cannot silently start clipping the body again.
- `render.ts` coverage stays low (37 %) by design: it is the painter layer, whose assertions are
  the primitive-recording tests rather than line coverage. No new painter logic was added here
  beyond the hint anchor.
