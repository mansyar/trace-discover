# Content Spec — Phase 5 (12 + 3)

Source of truth for art batch, `.riv` builds, and level authoring. Follows spec FR5/FR6/FR8 and product guidelines (thick navy outlines, pastel fills, zero-text, calm backdrops).

## Cast (1 star per theme)

| Theme | Character | Notes |
|---|---|---|
| `dino` — Dinosaur Trail | Chibi triceratops (existing `dino4.riv`) | Mascot; idle bob+blink, celebrate arms-up hop |
| `construction` — Construction Site | Sunny yellow excavator ("Scoop") | Arm gives natural celebrate wave; chunky silhouette |
| `animals` — Animal Friends | Golden lion cub | Big mane = high contrast; easy squash-and-stretch hop |

Backdrops (calm pastel, characters carry personality): dino = soft green trail with distant hills; construction = sandy lot with soft shapes; animals = warm savanna clearing.

## Sticker / badge set

Stickers mirror their level's goal (mini version) so toddlers recognize "I earned what I reached". 12 stickers + 3 theme badges. Bonus completion seals the collection (finale, no extra sticker).

- Dino: L1 footprint → L2 leaf → L3 egg → L4 tiny dino; badge = volcano star
- Construction: L1 cone → L2 brick → L3 gear → L4 truck; badge = hard-hat star
- Animals: L1 paw → L2 fish → L3 feather → L4 cub face; badge = sun seal

## Goals (unique per level, high-contrast silhouettes)

| Level | Stroke / direction | Goal |
|---|---|---|
| dino-1 | line, left→right | egg nest |
| dino-2 | wave, left→right | pond |
| dino-3 | arc, bottom sweep CCW | cave arch |
| dino-4 | zigzag, left→right | palm grove |
| dino-bonus | circle, start top CCW | volcano star |
| construction-1 | line, left→right | cone pile |
| construction-2 | wave, left→right | brick stack |
| construction-3 | arc, bottom sweep CCW | tunnel arch |
| construction-4 | zigzag, left→right | scaffold steps |
| construction-bonus | circle, start top CCW | hard-hat star |
| animals-1 | line, left→right | water hole |
| animals-2 | wave, left→right | fish pond |
| animals-3 | arc, bottom sweep CCW | tree hollow |
| animals-4 | zigzag, left→right | grass tufts |
| animals-bonus | circle, start top CCW | sun seal |

## Checkpoint counts (1 chime each, pentatonic ascent)

L1 = 3, L2 = 4, L3 = 4, L4 = 5, bonus = 6 (wraps octave into resolve).

## Stroke-direction checklist (validate per level)

- [ ] L1/L2/L4 start zone on left, goal on right, ordered checkpoints advance left→right
- [ ] L3 starts bottom-left, sweeps up and over, counterclockwise convention
- [ ] Bonus starts at top, closes full loop counterclockwise
- [ ] `validateLevel` passes (margin, no duplicate points); `levelToPath` resamples at 8px
- [ ] Headless screenshot + on-device run per level (see QA task)
