# Art Batch Manifest — Phase 5 (2026-09-15)

Raw + cutout PNGs live in `spike/gen/` (untracked working files, deliberately not committed).
This manifest is the committed record. Per `content.md`: stickers mirror goals, badges = bonus goals.

## Characters (base via flux-1-schnell txt2img, poses via flux-2-klein img2img)

| File | Bytes | Role |
|---|---|---|
| excavator-ref-1.png | 325265 | Construction star base (approved) |
| excavator-jump-1.png | 390738 | Celebrate: bucket arm raised |
| excavator-blink-1.png | 388064 | Blink variant (needed 1 retry, API timeout) |
| cut-excavator-ref.png | 369616 | Cutout 600px |
| cut-excavator-jump.png | 349120 | Cutout 600px |
| cut-excavator-blink.png | 407926 | Cutout 600px |
| lion-ref-1.png | 348990 | Animal star base (approved) |
| lion-jump-1.png | 380982 | Celebrate: paws raised |
| lion-blink-1.png | 409613 | Blink variant |
| cut-lion-ref.png | 395362 | Cutout 600px |
| cut-lion-jump.png | 383753 | Cutout 600px |
| cut-lion-blink.png | 456983 | Cutout 600px |

## Backdrops (txt2img, calm pastel, no characters/text)

| File | Bytes |
|---|---|
| bg-dino.png | 404213 |
| bg-construction.png | 374704 |
| bg-animals.png | 428197 |

## Goals → stickers (txt2img raw → 600px cutout; sticker = same art at display size)

| Level | Raw (bytes) | Cutout (bytes) |
|---|---|---|
| dino-1 egg nest | 323575 | 341067 |
| dino-2 pond | 243555 | 297492 |
| dino-3 cave arch | 416673 | 380604 |
| dino-4 palm grove | 420874 | 324945 |
| dino-bonus volcano star (= badge) | 191884 | 127357 |
| construction-1 cone pile | 337995 | 297176 |
| construction-2 brick stack | 162446 | 395250 |
| construction-3 tunnel arch | 299200 | 279427 |
| construction-4 scaffold steps | 237909 | 218992 |
| construction-bonus hard-hat star (= badge) | 206506 | 305873 |
| animals-1 water hole | 270194 | 212848 |
| animals-2 fish pond | 198218 | 264384 |
| animals-3 tree hollow | 301099 | 424271 |
| animals-4 grass tufts | 259993 | 323269 |
| animals-bonus sun seal (= badge, approved) | 374830 | 367604 |

## QA notes

- Base characters visually approved (sticker style, navy outlines, white field).
- Cutout flags reviewed: dino-3 keeps white cave interior (enclosed region, looks like sky — accept);
  animals-bonus full-frame keep is correct (art fills frame, bg fully removed).
- construction-4 / animals-1 kept non-zero component index — visually plausible per bbox sizes;
  re-verify at screenshot-QA task if they look off in-app.
- Next: `.riv` builds (excavator, lion) via rive-cli skill; level authoring per content.md.
