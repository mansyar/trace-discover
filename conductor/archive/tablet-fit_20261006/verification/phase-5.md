# Phase 5 verification — Parent surfaces at tablet spaces

- **Track:** tablet-fit_20261006 — Tablet fit — fill the canvas on iPads and Android tablets
- **Phase:** 5 — Parent surfaces at tablet spaces
- **Date:** 2026-10-26
- **Branch:** `track/tablet-fit`
- **Base:** `31674c9` (Phase 3 acceptance) / `93c863c` (Phase 4 head)
- **Head:** `928b7a6`
- **Result:** implemented and measured; **awaiting the owner's screenshot approval** on P5.T1–P5.T2

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| check | `CI=true pnpm check` | 0 | Biome 143 files, `tsc --noEmit` clean |
| test | `CI=true pnpm test --coverage` | 0 | 916 tests (66 files); `parentZone.ts` and `install.ts` 100 / 100 / 100 / 100; global 82.12 / 83.30 / 93.70 / 81.79 against 72 / 76 / 88 / 72 |
| qa (parent) | `cd dev && node qa/qa-tablet-parent.mjs` | 0 | 24 shots, 0 failures — six spaces × (parent zone, reset confirm, install card, name overlay) |

## What the sweep found

The parent surfaces were the last screens still composed in **absolute phone units**, so
every one of them clustered in the top of a 1280-tall field:

1. **The parent zone stopped two-thirds of the way down.** The portrait stack (sound card
   at 96, Skin & Name at 244, minis at 418, trophies at 620, Done at 770) is 730 units tall
   — exactly right on an 860 field, but it left ~450 units of empty cream under Done on a
   1280-tall one. The wide ribbon was worse: two rows at 150/310 on a 960-tall landscape
   field put all nine controls in the top third.
2. **Card heights did not grow with the card widths.** The cards are full-bleed
   (`fieldWidth − 80`), so on 960 they are 880 wide against an authored height of 138/164 —
   a 6.4:1 strip instead of the phone's 2.5:1.
3. **The trophy caption and the reset-confirm banner were hard-coded** at y = 672 and
   y = 648, i.e. written to the phone's trophy row; anywhere else they detach from the row
   they label (and the confirm banner covered empty space instead of the trophy band).
4. **The name overlay was a phone-sized modal.** Its panel, input frame and button row were
   fixed (340 tall, buttons ±130), so on a tablet it covered a sixth of the screen while the
   DOM input stayed 100 units tall.
5. **A landscape keyboard covers the overlay's buttons.** The panel sat at 325–750 of a
   960-tall field; an iPad keyboard takes the bottom ~35 %, which starts at ~630 — over the
   Save / Clear / Cancel row. Nothing in the code knew the keyboard existed.
6. **The install card was a phone card.** 620 tall on every portrait field, 9 lines of the
   generic copy starting at 190, leaving the bottom 40 % of a tablet screen empty.

## What changed

- `src/ui/parentZone.ts` — the portrait stack interpolates on `(fieldHeight − 860) / 420`:
  card heights `× (1 + 0.4·grow)` (1.4 on a 1280 field), gaps `10 + 50·grow`, row spread
  `× (1 + 0.4·grow)`, mini cards `× (1 + 0.4·grow)` and centered in their own cards, trophy
  band `38 + 42·grow`, Done at `fieldHeight − 90`. The wide ribbon centers its two-row block
  on the field (`rowGap = 160 × fieldHeight/430`), spreads sideways by
  `min(1.4, fieldWidth/860)` and rides the title 80 above the first row. Both factors are
  exactly 1/0 on the two phone references, so their output is authored; `title` and
  `trophyLabel` are now layout outputs instead of renderer constants.
- `src/ui/parentZone.ts` — `parentSurfaceScale(w, h)` (short axis against the portrait phone
  reference, capped 1.25) and `nameOverlayLayout(..., keyboardInset)`: panel, input frame,
  button row and copy scale together, and the panel lifts by the keyboard inset.
- `src/ui/install.ts` — `installPanelLayout(w, h)`: the white card is centered on the short
  axis (reproduces both authored phone cards exactly), with scaled margin, line height and
  font, and the authored top pad so the longest copy still ends inside.
- `src/main.ts` — `keyboardInsetUnits()` reads `visualViewport` (iOS shrinks the visual
  viewport without resizing the layout viewport; Android resizes the layout viewport, which
  the existing `resize` path already refits) and `currentNameOverlay()` passes it; the input
  font is floored at 16 px for iOS's no-zoom rule; `visualViewport` resize/scroll reposition
  the DOM input while the overlay is open.
- `src/app/render.ts` — `drawParent` reads `layout.title` / `layout.trophyLabel` (the confirm
  banner hangs off the trophy caption), `drawNameOverlay` scales its title and hint, and
  `drawInstallPanel` draws `installPanelLayout`'s card.
- Tests: `ui/parentZone` gained a four-space tablet block (floors, pairwise separation,
  trophy row, field use, card containment, overlay in-bounds) plus phone-parity and
  inset cases; `ui/install` gained the card geometry. 916 tests total (was 886).

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR6 (zone) | Nine controls + trophies recompose at the new spaces | six spaces: all nine targets keep a half-floor inside the field and ≥ a full floor from each other; portrait stack runs 96 → 1246 with Done at 1190/1280; wide rows at 316/674 (960) and 266/564 (800), centered ±15 | met |
| FR6 (overlay) | Name overlay recomposes; keyboard never covers the field | panel 885×425 on 960×1280 and 1218×425 on 1280×960 (was 340 tall); DOM input 77,400 → 1203,525 on slate-landscape with a 69 px font (55 px on both phones) and stays above the keyboard band on every space; the inset lift is unit-tested (panel bottom ≤ field − inset, clamped at 0) | met (layout) / **device pass in Phase 6** |
| FR6 (install) | Install panel recomposes | card centered (252.5–1027.5 on 960×1280, 50–910 on 1280×960), nine-line generic copy inside on all six spaces | met |
| AC7 | Parent surfaces usable at tablet sizes, keyboard never covers the field | as above; keyboard lift is the one path a headless browser cannot exercise, so it is called out below | met (screenshots + unit tests) / **awaiting owner approval** |
| AC6 | Phones unchanged | both phone references ride the same sweep; every new factor is exactly neutral there and locked by tests (`title` 70, cards 96/244/418, trophies 620/672, Done 770, wide rows 150/310 at ±260…±370, overlay scale 1, install card 120/40) | met (pixel comparison lands in Phase 6) |

## Evidence paths

- `dev/qa/qa-tablet-parent.mjs` — the matrix probe (six spaces, 24 shots, gallery).
- `dev/qa/out/tablet-parent/` — labelled screenshots + `gallery.html`.
- Commit `928b7a6`, note on `928b7a6`.

## Deviations

- The probe's first "field use" assertion measured the span between the topmost and
  bottommost *target*, which is 80 % on the phone portrait and 58 % on the phone landscape by
  design; it was replaced with the shape assertions the acceptance actually needs (portrait
  Done at the bottom, wide rows centered and spread) so the phone references are not held to
  a tablet-only shape.

## Notes

- **Not device-verified:** the soft-keyboard lift. Headless Chromium has no soft keyboard and
  Playwright cannot shrink the visual viewport independently of the layout viewport, so the
  lift is covered by layout tests (`nameOverlayLayout(…, inset)`) and by the DOM input
  following that same layout; the iPad/Android keyboard case is part of the Phase 6 device
  pass and must be confirmed there.
- The install card keeps the shipped `rgba(255, 255, 255, 0.97)` fill, so the parent zone
  ghosts through it faintly — visible on phones too, and unchanged here because phone output is
  a hard parity constraint. If the owner wants the card opaque on tablets, that is a
  parity-safe special case to take separately.
- `render.ts` coverage stays low by design (painter layer); the new geometry lives in
  `parentZone.ts` / `install.ts`, both at 100 %.
