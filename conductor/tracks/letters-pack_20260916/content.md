# Content Spec — Letters A–Z (Phase 2)

Source of truth for letter authoring, the Phase 4 art batch, and screenshot QA. Follows spec FR3/FR5/FR6 and product guidelines (thick navy outlines, pastel fills, zero-text, calm motion, pentatonic audio).

## Pack identity

- Pack id: `abc`; level ids `abc-a` … `abc-z`; bonuses `abc-bonus-1..3` (`ABC` / `MOM` / `ZOO`, unlocking at 9 / 18 / 26 cleared); pack badge `abc-badge`.
- Menu motif: drawn "A B C" fallback (`menuArt.ts`) until the Phase 4 card art lands.
- Shell: cream pack screen, no world backdrop; two pages (A–L 12 cards / M–Z 14 cards with the centered Y·Z finale pair) with the zero-text pager.

## Cast

| Role | Character | Notes |
|---|---|---|
| Guide | the active skin's character (`dino.riv` / `star.riv` / `excavator.riv` / `lion.riv`) | No content-owned guide; skin decoupling per skins-and-packs. Hop count follows strokes (Phase 3) |
| Reward vignettes | object-per-letter goal art (Phase 4 art batch) | Skin-neutral, content-owned |

## Glyph style (locked)

- Uppercase only, school-style stroke order; lifts allowed between strokes (E = 4, T = 2, C = 1).
- Chunky field-sized glyphs in the standard letter box: x ∈ [130, 300], y ∈ [280, 660]; every stroke reads ≥ 90 px of touch travel.
- Whole letter stays visible during play: active stroke glows, completed strokes fill, upcoming strokes ghost (numerals v2 pattern).
- Start marker: pulsing gold dot on the first point of the current stroke.
- Junctions: strokes meet edge to edge (shared corner points allowed across strokes); inter-stroke gaps must stay clear of the 12% tolerance zone so a lift never completes another stroke by accident.

## Formation table

| Letter | Strokes | Formation (stroke order & direction) | Start mark | Checkpoints | Goal / sticker motif |
|---|---|---|---|---|---|
| A | 3 | 1: diagonal top → bottom-left. 2: diagonal top → bottom-right. 3: crossbar left → right | top center | 5 | apple |
| B | 3 | 1: tall stem top → bottom. 2: upper bowl from the stem top, out right, back to the stem middle. 3: lower bowl from the stem middle, out right, back to the stem base | stem top | 5 | ball |
| C | 1 | Single CCW curve: start upper-right, sweep left, down and around, back up to lower-right | upper-right | 4 | cat |
| D | 2 | 1: tall stem top → bottom. 2: big bowl from the stem top, right and around, back to the stem base | stem top | 4 | duck |
| E | 4 | 1: stem top → bottom. 2: top bar left → right. 3: middle bar left → right. 4: bottom bar left → right | stem top | 5 | egg |
| F | 3 | 1: stem top → bottom. 2: top bar left → right. 3: middle bar left → right | stem top | 4 | fish |
| G | 1 | C-curve with inward bar: start upper-right, sweep CCW around to lower-right, then bar leftward into the center | upper-right | 5 | grapes |
| H | 3 | 1: left stem top → bottom. 2: right stem top → bottom. 3: crossbar left → right at the middle | left stem top | 5 | hat |
| I | 3 | 1: top bar left → right. 2: stem top → bottom from the bar's center. 3: bottom bar left → right | top-left | 3 | ice cream |
| J | 2 | 1: stem top → bottom, hooking left at the base. 2: top bar left → right | stem top | 3 | jellyfish |
| K | 3 | 1: stem top → bottom. 2: upper diagonal from the stem middle out to the top-right. 3: lower diagonal from the stem middle out to the bottom-right | stem top | 4 | kite |
| L | 2 | 1: stem top → bottom. 2: base bar left → right | stem top | 3 | ladybug |
| M | 1 | Down the left stem, diagonal up to the top middle, diagonal down to the bottom right, up the right stem | top-left | 5 | moon |
| N | 1 | Down the left stem, diagonal up to the top-right, down the right stem | top-left | 5 | nest |
| O | 1 | Full CCW loop from the top, closing where it started | top center | 6 | orange |
| P | 2 | 1: tall stem top → bottom. 2: upper bowl from the stem top, out right, back to the stem middle | stem top | 4 | penguin |
| Q | 2 | 1: full CCW loop from the top. 2: tail diagonal from the loop's lower-right, out to the bottom-right | top center | 6 | queen |
| R | 3 | 1: stem top → bottom. 2: upper bowl from the stem top, out right, back to the stem middle. 3: leg diagonal from the bowl's end out to the bottom-right | stem top | 5 | rocket |
| S | 1 | Single curve: start upper-right, sweep left around the top, cross to the right through the middle, around the bottom, out to the lower-left | upper-right | 4 | sun |
| T | 2 | 1: top bar left → right. 2: stem from the bar's center top → bottom | top-left | 3 | turtle |
| U | 1 | Down the left side, around the bottom, up the right side | top-left | 4 | umbrella |
| V | 1 | Down-right diagonal to the bottom center, then up-right diagonal | top-left | 3 | van |
| W | 1 | Four diagonal segments: down, up, down, up from top-left to top-right | top-left | 5 | whale |
| X | 2 | 1: diagonal top-left → bottom-right. 2: diagonal top-right → bottom-left | top-left | 4 | xylophone |
| Y | 3 | 1: diagonal top-left → center. 2: diagonal top-right → center. 3: stem center → bottom | top-left | 4 | yo-yo |
| Z | 1 | Top bar left → right, diagonal down-left, bottom bar left → right | top-left | 4 | zebra |

Checkpoint counts are authoring targets. The engine ships with the shared count (6) until a feel check asks for per-letter counts — same policy as the numerals pack.

Goal art refs: `/art/goal/abc-<letter>.png` (object vignette doubling as the sticker, per FR5). Bonus art: `/art/goal/abc-bonus-<n>.png`. Pack badge: art-batch seal consistent with v1 badges.

## Reward objects (locked)

A apple · B ball · C cat · D duck · E egg · F fish · G grapes · H hat · I ice cream · J jellyfish · K kite · L ladybug · M moon · N nest · O orange · P penguin · Q queen · R rocket · S sun · T turtle · U umbrella · V van · W whale · X xylophone · Y yo-yo · Z zebra.

Skin-neutral, content-owned: one vignette per letter regardless of the active skin.

## Bonus designs (locked)

| Bonus | Word | Unlocks at | Design |
|---|---|---|---|
| `abc-bonus-1` | ABC | 9 cleared | A + B + C in a row; each letter keeps its formation, generous scale |
| `abc-bonus-2` | MOM | 18 cleared | M · O · M; the O loop between two M glyphs |
| `abc-bonus-3` | ZOO | 26 cleared | Z · O · O; Z then two loops |

Words use only letters cleared by their unlock point (spec). Word letters sit side by side, centered (x ≈ 95 / 215 / 335); stroke order follows the word reading order and each letter's internal order is unchanged. Bonus strokes: ABC = 7 (3+3+1), MOM = 3, ZOO = 3.

## Stroke-direction checklist (validate per letter)

- [ ] Vertical stems top → bottom (B, D, E, F, H, K, L, P, R, T stem, and the M/N/U/J sides)
- [ ] Horizontal bars left → right (A, E, F, H, I caps, L base, T top, Z bars, G inward bar)
- [ ] C/G descend CCW from the upper-right; S reads as the mirror sweep (upper-right → left → middle → right → lower-left)
- [ ] O/Q loops CCW from the top; Q tail added after the loop
- [ ] Bowls (B, D, P, R) start at the stem, sweep out right and return to the stem
- [ ] Diagonals read left → right where the shape allows (V, W, X, Y, A, K, Z, N, M)
- [ ] Multi-stroke order per the formation table (A diagonals → crossbar; E stem → top → middle → bottom; H stems → crossbar; …)
- [ ] Manual-only strokes: none — every stroke is traced
- [ ] `validateLevel` clean for all 29 levels; `levelToPath` resamples at 8 px; no duplicate consecutive points
- [ ] Headless screenshot per letter (start star, goal placement, direction read) — see QA task
