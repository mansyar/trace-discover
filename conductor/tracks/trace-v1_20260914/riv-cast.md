# .riv Cast Build Record (Phase 5 — Build `.riv` cast)

Source projects live in untracked `spike/excavator/` and `spike/lion/` (same
convention as `spike/dino4/` — source art stays out of git). Shipped binaries
are tracked in `public/rive/`.

## Results

| Character | .riv bytes | Budget ≤ ~500 KB | Technique |
|---|---|---|---|
| Excavator "Scoop" (construction) | 477,640 (~466 KB) | ✅ | base + jump @448px, blink as feathered patch (47 KB vs 408 KB full-frame) |
| Lion cub (animals) | 457,734 (~447 KB) | ✅ | base + jump @416px, blink as feathered patch (44 KB) |
| Triceratops (dino, Phase 3) | 699,844 (~683 KB) | ⚠️ over (grandfathered, see below) | base + jump + full-frame blink @600px |

## Pipeline per character (rive-cli skill golden loop)

1. Copy `spike/dino4/` template → rename project (`rive.yaml`), assets, nodes.
2. `cutout.mjs` base + jump from the 1024px Workers AI sources (same-box
   re-cut for the blink source so base/blink frames are pixel-aligned).
3. `gridshot.mjs` to read exact eye-rect coords off the face (findeyes output
   was too coarse for the excavator's tall eye clusters — grid never lies).
4. `composite.mjs` base + blink → feathered eye patch (`--feather=12
   --margin=24`); verify the full composite **by looking** before wiring in.
5. `rive . --verify` → `rive inspect . --json` (problems empty) → `rive .
   --once` → screenshot rest / blink (`--advance=113`) / celebrate
   (`--pointer=click@… --advance=22`) → **look at every PNG**.
6. Tune node offsets from screenshots, rebuild, re-shoot until clean.

## Calibration lesson (excavator blink)

Patch-node placement math got the sign/scale right but landed ~28 artboard-px
left (arithmetic slip + trim-box drift). Fixed empirically: measure open-eye
centers in the rest shot vs lash centers in the blink shot, shift the patch
node by the delta, re-shoot. One calibration round nailed it. Formula first,
screenshot last — the screenshot is always the source of truth.

## QA (all verified by looking at CLI screenshots)

- **Excavator**: grounded rest (tracks meet shadow), blink lands exactly on the
  open eyes with no visible seam, celebrate swaps to arm-raised jump art with
  sparkles + shrinking shadow. Tap proxy fires the transition (`--pointer`
  shot is mid-air), so the state machine + listener wiring works.
- **Phase 7 polish (2026-09-15):** the blink patch opacity used instant
  hold-keys (pop on/off over 7 frames) — a toddler play-tester flagged it as
  choppy. Eased to a 6-frame linear fade-in (f106→f112), 2-frame hold,
  6-frame fade-out (f114→f120). Then the same tester caught a deeper flaw:
  the v1 blink source was generated front-facing while the idle face is
  slightly left-facing (3/4 view), so the eyes visibly jumped at full blink.
  Regenerated at low strength (0.28) against the ref with a same-pose-only-
  eyes-closed prompt, re-cut with the identical box (pixel-aligned), re-
  composited with the same feathered rect. Rest-vs-peak screenshots now show
  lashes on the exact 3/4 eye positions — no jump, no seam. Size 476,751
  bytes (still under ~500KB). Dino/lion keep their hold-key blinks (not
  flagged, out of scope).
- **Lion**: seated rest, blink exact, celebrate paws-up swap with sparkles.
  416px sources chosen over 448px purely for the byte budget — visually
  identical at render scale.

## Accepted deviation: dino.riv over budget

`dino.riv` (699 KB, Phase 3) exceeds the per-character guideline. Rebuilding it
with the patch technique would save ~240 KB but touches a shipped, tested,
integrated asset. Total cast is ~1.6 MB — comfortable inside the whole-app
≤ ~10–15 MB offline budget. Rebuild is an optional future optimization, not a
v1 blocker. Wiring excavator/lion into theme level data happens in the next
task (Author remaining level data).
