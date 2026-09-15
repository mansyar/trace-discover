# Rewards — Pre-writing pack art brief

Content-neutral achievement rewards for the 12 slots + 3 circles. One art per
slot, doubling as goal art (path end / shelf) and sticker (fly-in).
Style matches the v1 sticker set: thick dark navy outlines, flat pastel
colors, simple white highlight shapes, cute graphic sticker look, centered,
pure white background, no text, no shadow.

Raw generations land in `spike/gen/` (untracked). Committed record: this file
+ the final assets in `public/art/`.

## Reward map

| Slot | Pattern (block) | Reward | Notes |
|---|---|---|---|
| pre-1 | line (small) | short chunky crayon | coral pink wrapper |
| pre-2 | wave (small) | tiny puddle with ripples | soft blue rings |
| pre-3 | arc (small) | small rainbow arc | half-circle, pastel |
| pre-4 | zigzag (small) | chunky little lightning bolt | soft yellow, rounded |
| pre-5 | line (medium) | friendly yellow pencil | pink eraser |
| pre-6 | wave (medium) | two rolling waves | white foam curls |
| pre-7 | arc (medium) | rainbow with two clouds | clouds at its feet |
| pre-8 | zigzag (medium) | storm cloud with one bolt | grey-blue cloud, warm bolt |
| pre-9 | line (large) | wide straight road | grey, white dashed center line |
| pre-10 | wave (large) | big curling ocean wave | soft blue/teal, foam |
| pre-11 | arc (large) | grand full rainbow | small sun + two clouds |
| pre-12 | zigzag (large) | big double lightning | yellow + orange crossed |
| pre-bonus-1 | circle (small) | striped beach ball | pastel red/white/blue |
| pre-bonus-2 | circle (medium) | smiling sun | scalloped rays |
| pre-bonus-3 | circle (large) | gold medal | red ribbon, star stamp |

Progression note: each pattern's three variants escalate in size/drama; the
three circles escalate ball -> sun -> medal. Circles unlock at 4/8/12.

## Process (established, $0 lane)

1. Generate: `cd spike; node tools/gen.mjs --prompt "..." --out gen/pre-N.png`
   (flux-1-schnell txt2img, 1024, steps 4).
2. Cutout: `node tools/cutout.mjs` per raw -> transparent, 600 px.
3. Optimize to display size; copy to `public/art/goal/pre-N.png` and
   `public/art/sticker/pre-N.png`.
4. Screenshot approval in-app (pack screen + level + shelf) before commit.

## Prompt style suffix (reuse verbatim)

`cute kawaii children's illustration sticker, thick dark navy blue outlines, flat pastel colors, simple white highlight shapes, centered on pure white background, no text, no shadow`

## Acceptance

- Style match to v1 sticker set; reads at 104 px (goal) and ~64 px (fly-in).
- Content-neutral: no skin/world elements.
- Full set approved via screenshots (menu -> pack -> level -> shelf).
