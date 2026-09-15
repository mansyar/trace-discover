# .riv Cast Build Record (Phase 5 — Build `.riv` cast)

Source projects live in untracked `spike/excavator/` and `spike/lion/` (same
convention as `spike/dino4/` — source art stays out of git). Shipped binaries
are tracked in `public/rive/`.

## Results

| Character | .riv bytes | Budget ≤ ~500 KB | Technique |
|---|---|---|---|
| Excavator "Scoop" (construction) | 454,122 (~444 KB) | ✅ | base + jump @448px, blink as feathered patch (23 KB 135×84 crop vs 408 KB full-frame) |
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
- **Second calibration (blink-2 regen):** reusing blink-1's node position for
  the regenerated patch assumed "same cutout box = pixel-aligned" — false,
  because img2img re-renders the whole face and the eyes move inside the
  frame. Grid-measured rest-vs-peak showed the lashes ~14px right / ~7px low
  of the pupils. Corrected node (-23,-31.7) → (-37,-41.7) in two rounds (x
  landed exact, then a -3 y nudge); final residual ~1px. Lesson: every
  regenerated source gets its own grid measurement — never inherit patch
  placement.
- **Third calibration (tight-crop patch3):** re-cutting to a tighter eye rect
  (135×84, margin 10) while carrying the patch2 node forward left the node
  ~43 artboard-px off (-72,-44 vs the true -28.3,-35.2), so the patch
  background doubled the mouth/arm/face. Restored exact centered-registration
  (node = base + scale·(crop-center − base-center)), verified clean, then
  confirmed a 6px eye-favoring shift reintroduces the seam — formula stands.
  Lesson: recompute node placement from the crop rect on every re-cut; never
  carry a node forward across a crop change.

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
- **Phase 7 placement fix (2026-09-15):** the tight-crop patch3 shipped with
  the patch2 node (-72,-44), misaligning mouth/arm/face. Reset to exact
  registration (-28.3,-35.2); headless peak + in-app burst (mid-blink f02
  vs rest f11) show lashes on pupils, no seam. Rebuilt 454,122 bytes.
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
