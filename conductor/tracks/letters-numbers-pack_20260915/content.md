# Content Spec — Numerals 0–9 (Phase 2)

Source of truth for numeral authoring, the art batch, and the `star.riv` build. Follows spec FR3/FR6/FR7 and product guidelines (thick navy outlines, pastel fills, zero-text, calm motion, pentatonic audio).

## Pack identity

- Pack id: `numbers`; level ids `num-0` … `num-9`; pack badge `numbers-badge`.
- Menu + pack-screen motif: big drawn "123" (placeholder art until the Phase 4 batch).
- Shell: cream pack screen, no world backdrop; Star buddy idle presence.

## Cast

| Role | Character | Notes |
|---|---|---|
| Guide | **Star buddy** (`star.riv`, Phase 3) | Idle bob + twinkle; celebrate = arms-up hop; counts N hops for numeral N |
| Dev placeholder | existing dino character | Harness play only, until star.riv lands |

## Numeral forms (locked)

Simplest toddler forms: 1 plain · 2 smooth curve + base · 3 two right bumps · 4 open-top two-stroke · 5 flag + belly · 7 no crossbar · 8 two stacked loops · 0/6/9 circles per conventions below.

## Formation table

| Numeral | Strokes | Formation (stroke order & direction) | Start mark | Checkpoints | Goal / sticker motif |
|---|---|---|---|---|---|
| 0 | 1 | Start top; full loop CCW (down the left, around the bottom, up the right, close at top) — reuses the bonus-circle skill | top center | 6 | sparkle ring (zero objects) |
| 1 | 1 | Plain vertical, top → bottom | top | 3 | 1 sun |
| 2 | 1 | Start upper-left; upper bump arcs right and around; sweep down-left; flat base left → right | upper-left | 4 | 2 apples |
| 3 | 1 | Two right bumps: upper arc, back to the middle, lower arc, settle lower-left | upper-left | 4 | 3 balloons |
| 4 | 2 | Stroke 1: diagonal down-left, then horizontal bar right (elbow). Stroke 2: tall vertical stem top → bottom, crossing the bar near its right end | elbow (upper right of bar) | 5 | 4 blocks |
| 5 | 1 | Top bar left → right; down-left leg to the middle; belly sweeps right-around-down, closing toward lower-left | top-left | 4 | 5 stars |
| 6 | 1 | Long CCW sweep: across the top, down the left, around the bottom, up the right, closing a loop at the bottom | top-right | 5 | 6 balls |
| 7 | 1 | Top bar left → right; diagonal down-left; no crossbar | top-left | 3 | 7 flowers |
| 8 | 2 | Stroke 1: upper loop CCW. Stroke 2: lower loop CCW; loops meet at the waist (author tangent — slight overlap OK if screenshots read better; engine crossing coverage is the figure-8 fixture) | upper loop top | 6 | 8 bubbles |
| 9 | 2 | Stroke 1: top loop CCW. Stroke 2: stem straight down from the loop's right side | loop top | 5 | 9 dots |

Checkpoint counts are authoring targets. Engine note: the production session currently uses one shared count (6) as in v1; wire per-numeral counts only if the feel check wants them — keep it simple otherwise.

Goal art refs: `/art/goal/num-<digit>.png` (doubles as the sticker — numeral + count vignette, per FR7). Pack badge: art-batch seal consistent with v1 badges.

## Stroke-direction checklist (validate per numeral)

- [ ] 0: start top, closes CCW; ordered checkpoints advance left → bottom → right → top
- [ ] 1, 4-stem, 7-diagonal: top → bottom strokes; 7 bar and 5 top bar left → right
- [ ] 2/3/5: horizontal elements left → right; right-hand bumps sweep clockwise
- [ ] 6/9 loops and 8's two loops: CCW; 8 completes the upper loop before the lower
- [ ] Multi-stroke order: 4 = elbow → stem; 8 = upper → lower; 9 = loop → stem
- [ ] `validateLevel` passes (margin, no duplicates, ≥2 points per stroke); `levelToPath` resamples at 8px
- [ ] Headless screenshot per numeral (start star, goal placement, direction read) — see QA task
