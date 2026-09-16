# Letters Pack — Part 2: Uppercase A–Z + Sequence Bonuses

**Track ID:** `letters-pack_20260916` · **Type:** Feature · **Status:** new
**Branch:** `track/letters-pack` · **Created:** 2026-09-16

## Overview

Part 2 of the long-term "letters & numbers" promise in `product.md` — and the first new content pack on the skins × packs foundation shipped in v1.1.0. The child traces uppercase A–Z, each letter paired with an object-per-letter goal vignette and sticker; three sequence bonuses (`ABC` / `MOM` / `ZOO`) unlock at 9/18/26 cleared and the pack badge seals all 26. Delivery is content + pack wiring: multi-stroke levels, pack registry, pack screen pattern, save v3, and the skin-owned guide all already exist — this track proves the "new content is pipeline work, not code" claim end to end.

## Design decisions (locked)

- **Scope:** full alphabet A–Z in one track; uppercase only; play order A→Z (alphabet-song familiarity).
- **Letters:** school-style stroke order with lifts where formation needs them (E = 4 strokes, T = 2 …); content authored as chunky, field-sized glyph paths on the multi-stroke schema.
- **Guide:** no new character — the guide is the **active skin's character** (skin-owned, decoupled from content). All four skins already work; zero guide assets. (Also fixes the stale pre-skins "Numbers-pack guide = star buddy" wording in `product-guidelines.md`.)
- **Rewards:** object-per-letter goal art + sticker — content-owned and skin-neutral.
- **Bonuses:** `ABC` / `MOM` / `ZOO` sequence traces at 9/18/26 cleared; each uses only letters already cleared at its unlock point; `ZOO` seals the set.
- **Pack screen:** 26 letter cards split across two pages (A–L: 12 cards, 3 rows; M–Z: 14 cards, rows 4+4+4+2 ending with the centered Y–Z finale pair); sticker shelf per page + badge spot; ≥90 px targets; fixed-position zero-text prev/next buttons and two page dots; opens on the first unfinished letter's page. (Refined 2026-09-16: a single 7-row grid leaves no room for the sticker shelf — 26 cards at ≥90 px already fill the field's height.)
- **Completion:** per-stroke hops — one hop + one note per stroke (E = 4, C = 1; cap 4), then chord resolve + sparkle as v1. Hops performed by the active skin's character.
- **Menu:** third pack card with "ABC" drawn art, appended after Pre-writing and Numbers.
- **Save:** additive only — schema v3 unchanged; `abc-*` ids flow through existing progress/badge logic; no migration.
- **Working agreement:** local branch — no push/PR/release; merge & release decisions are the owner's afterward.

## Functional Requirements

**FR1 — Menu entry & pack registration.** `abc` pack registered (badge `abc-badge`); zero-text menu card with "ABC" drawn art; menu order Pre-writing → Numbers → Letters. Existing packs untouched.

**FR2 — Pack screen & grid.** 26 letter cards (A–Z drawn art) in a 4-per-row grid paginated in two (A–L = 12 cards / 3 rows; M–Z = 14 cards, rows 4+4+4+2 with the centered Y–Z finale pair); per-page sticker shelf + badge spot; ≥90 px targets (safe-area + letterbox as v1); fixed-position zero-text prev/next buttons (bottom-right, ≥90 px) and two page dots; the pack opens on the first unfinished letter's page; a cleared letter shows its earned sticker; all letters playable from the start (no gating).

**FR3 — Letter content (A–Z).** `abc-a`…`abc-z` uppercase forms with school-style stroke order, standard start markers/directions; field-sized glyphs with inter-stroke gaps clear of the ~12 % tolerance zones; per-letter checkpoint tables. A track-local `content.md` (mirroring the numerals content doc) fixes the geometry table, stroke order, and goal-art refs; validated via `validateLevel` + screenshot QA + device feel checks.

**FR4 — Letter glyph visuals.** Whole letter visible during play; active stroke glows (ribbon + marching dots + pulsing start star); completed strokes stay painted; upcoming strokes faint — the numerals v2 pattern applied to letters.

**FR5 — Rewards.** One sticker per letter (the object art); goal vignette per letter shares the motif; completing all 26 awards the pack badge. Fly-in choreography as v1. Objects (art direction, tunable at batch review): A apple · B ball · C cat · D duck · E egg · F fish · G grapes · H hat · I ice cream · J jellyfish · K kite · L ladybug · M moon · N nest · O orange · P penguin · Q queen · R rocket · S sun · T turtle · U umbrella · V van · W whale · X xylophone · Y yo-yo · Z zebra.

**FR6 — Sequence bonuses.** `abc-bonus-1..3` = `ABC` (unlock 9), `MOM` (unlock 18), `ZOO` (unlock 26): short multi-stroke sequence traces with generous sizing; bonus goal art per sequence (art batch); the finale seals the pack (badge flow mirrors Numbers).

**FR7 — Completion & celebration.** Per-stroke hops: one hop + one instrument note per stroke (cap 4), then chord resolve + sparkle arpeggio + confetti as v1; the active skin's character performs the sequence.

**FR8 — Art batch.** 26 goal vignettes + 26 stickers + 3 bonus arts + menu card + pack badge through the standard pipeline (generate → cutout → optimize → composite → screenshot approval); skin-neutral, thick-navy-outline style; size budget guarded.

**FR9 — Persistence.** Additive only: letters join `completedLevels`/badges via existing logic (no schema change, no migration); hostile-input sanitizing unchanged; parent reset covers the pack (2-step confirm as v1).

**FR10 — Third-pack generalization audit.** Sweep for two-pack assumptions (routing/art-path/hop special cases in `main.ts`, progress, render, session); neutralize accidental coupling where generic handling is warranted (tests pin behavior); intentional pack-specific behavior (e.g., numerals' counted hops) is documented.

## Documentation updates

- `product.md` — letters ship note; dated note refreshed.
- `tech-stack.md` — letters pack entry (content-only integration; hop plan extension).
- `product-guidelines.md` — fix the stale "Numbers-pack guide = star buddy" line to the skins-era wording.
- Track-local `content.md` — geometry table, stroke order, object list, bonus designs.

## Non-Functional Requirements

- **Performance:** 60 fps on mid-range Android + base iPad incl. the 26-card pack screen; touch→feedback <100 ms; no new crash states.
- **Offline/PWA:** zero runtime network; all new assets covered by the existing Workbox glob; offline cold start <1 s unaffected; install unchanged.
- **Size:** dist within the <~10–15 MB budget (v1.1.0 = 7.77 MB; expected +2–4 MB); optimization pass recorded.
- **Quality:** >80 % coverage on new logic (pack wiring, bonus unlocks, hop plan, audit); existing tests stay green; `pnpm check` clean (Biome + tsc strict).
- **Zero-text:** letters are drawn glyphs/art, not UI text; child surfaces stay text-free.
- **No regressions:** pre-writing + numbers behavior unchanged under any skin; device/offline audits re-run.

## Acceptance Criteria

1. Menu shows three packs; the ABC card opens the letters pack; grid = 26 cards across two pages (12 + 14) with the centered Y–Z finale pair; paging buttons/dots work and land on the first unfinished letter; ≥90 px targets; zero text.
2. All 26 letters completable end-to-end (simulated traces in the harness) with strokes in taught order incl. multi-stroke letters (E, H, T…); goal + sticker update per letter.
3. Bonuses gated until 9/18/26; `ABC` / `MOM` / `ZOO` traceable; `ZOO` seals the pack; badge awarded and reachable.
4. Per-stroke hops: E hops 4× with 4 notes, C once; chord resolve after; numerals' counted behavior unchanged.
5. All-skins × letters: each skin guides letter tracing (character, backdrop, instrument) with progress/cosmetics independence intact; mid-trace swap safe.
6. Persistence: fresh + existing v3 saves unaffected; hostile fixtures safe; progress survives skin swaps.
7. Offline: a letter plays in airplane mode after cache; install unaffected (Android + iPad).
8. Art batch approved via screenshots; zero-text audit; dist/perf recorded within budget.
9. All checks green; device session: the toddler traces at least one letter unaided; existing packs quickly re-verified.

## Out of Scope

- Lowercase letters; letter sounds/phonics/voice; word spelling/reading; both-case sets.
- New skins; changes to pre-writing/numbers designs; additional packs.
- Spoken voice/localization · accounts/cloud sync · store/monetization · parent dashboards.
- Push/PR/release/tags — stays local on `track/letters-pack`; merge & release decisions are the owner's.
