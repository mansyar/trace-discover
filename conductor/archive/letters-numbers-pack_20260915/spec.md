# Letters & Numbers Pack — Part 1: Numerals 0–9 + Pack Foundation

**Track ID:** `letters-numbers-pack_20260915` · **Type:** Feature · **Status:** new
**Branch:** `track/letters-numbers-pack` · **Created:** 2026-09-15

## Overview

Part 1 of the long-term "letters & numbers" tracing pack promised in `product.md`: a
zero-text **Numbers Pack** where the child traces numerals 0–9 with a new **Star buddy**
guide. This track also lands the pack *foundation* — multi-stroke level engine, pack
screen pattern, save v2, pack identity — so future packs (letters A–Z, more) are content
work, not engine work.

## Design decisions (locked)

- Scope: numerals 0–9 first; letters A–Z are the follow-up track.
- Multi-stroke levels: engine extension lands now (needed for a proper 4; unlocks letters later).
- Presentation: dedicated pack screen — zero-text "123" card on the Main Menu; cream shell, no world backdrop.
- Cast: new guide character = **Star buddy** (idle + celebrate), built via the existing Rive pipeline.
- Unlock: all 10 numerals freely playable from the start; pack badge on completing all 10.
- Collectibles: one sticker per numeral — numeral + count vignette (N objects); goal art shares the motif.
- Completion: numeral-aware — N counted hops + N gentle notes (0 gets its own treatment).
- Audio: new toy-piano/xylophone preset; same pentatonic language.
- Numeral forms: simplest toddler forms (1 plain · 2 smooth curve + base · 4 open-top two-stroke · 7 no crossbar · 0 top-CCW circle).
- Field visuals: whole numeral visible; active stroke glows; completed strokes stay painted; upcoming strokes faint.
- Working agreement: no push/PR on this track — it stays local on its branch.

## Functional Requirements

**FR1 — Menu entry.** New zero-text pack card on the Main Menu with big "123" drawn art;
opens the dedicated pack screen. Progress affordance: badge shown when the pack is
complete (mirrors theme cards). The 3 existing worlds are untouched.

**FR2 — Pack screen.** Dedicated screen: 10 numeral cards (0–9, drawn art) + 10 sticker
slots + pack badge spot; zero text; 90px+ child targets; safe-area + letterbox as v1.
A cleared numeral's slot shows its earned sticker. All numerals playable from the start
(no gating).

**FR3 — Numeral content (0–9).** Levels authored per simplest toddler forms; start
markers + stroke directions follow standard formation conventions (0 = start top, CCW —
reuses the bonus-circle skill); per-numeral checkpoint tables. The content doc authored
in this track (mirroring v1's `content.md`) fixes control points, stroke order,
checkpoints, and goal-art refs; validated by `validateLevel` + screenshot QA.

**FR4 — Multi-stroke engine.** Level schema extends to an ordered sequence of strokes
(single-stroke levels unchanged — v1 content stays valid). Completing a stroke → the next
stroke's start star pulses; lifting between strokes is allowed (progress kept). All v1
trail behaviors apply per stroke and across strokes: forgiving start, capped advance
speed, ~12% tolerance, magnetism, lift-keeps/resume. Completion requires all strokes.
Self-crossing strokes (8) must not corrupt tracking (frontier ordering + capped advance;
covered by tests).

**FR5 — Multi-stroke visuals.** During play the whole numeral stays visible; the active
stroke renders as the glowing ribbon + marching dots with a pulsing start star; completed
strokes stay painted/filled; upcoming strokes are faint. Completion choreography runs
only after the final stroke.

**FR6 — Celebration.** On completion: Star buddy hops to the goal with N counted hops and
N gentle notes for numeral N (pacing tuned in the play harness); chord resolve + sparkle
arpeggio + confetti as v1. Numeral 0 receives a special treatment (e.g., a looped
orbit/roll — resolved in the content phase with review).

**FR7 — Stickers & pack badge.** One sticker per numeral: numeral + count vignette (N
same objects — art batch with screenshot approval). Completing all 10 awards the pack
badge. Fly-in choreography as v1.

**FR8 — Star buddy.** Rive build via the existing pipeline (generate → cutout → RML →
verify): idle + celebrate triggers; ≤ ~500 KB; hop/celebrate adapters reuse the existing
character abstraction.

**FR9 — Audio.** New toy-piano/xylophone preset within the pentatonic language (C D E G
A); ascending checkpoint chimes; completion per FR6; unlock-on-first-touch reused;
volume/mute from the parent zone applies.

**FR10 — Assists.** Identical v1 behavior (2s star nudge · 4s hand hint · auto-assist
widens tolerance after 3 nudges; parent "easier tracing" override), applied per stroke
and persisting across strokes within a level.

**FR11 — Persistence.** Save schema v2: additive pack fields (numerals cleared, numeral
stickers, pack badge); v1 saves migrate losslessly; parent-zone reset covers pack content
(2-step confirm, as v1).

**FR12 — Pack identity art.** Menu card + pack-screen polish use the "123" drawn-art
motif; cream shell; Star buddy idle presence on the pack screen; all new art through the
standard batch process with QA screenshots.

## Non-Functional Requirements

- **Performance:** 60fps on mid-range Android + base iPad with multi-stroke rendering;
  touch→feedback <100 ms; no new crash states; failure-tolerant as v1.
- **Offline/PWA:** zero runtime network calls; all new assets (.riv, PNGs) precached by
  the existing Workbox glob; offline cold start <1s unaffected; install unchanged.
- **Size:** dist within the <~10–15 MB budget (v1 ≈3.8 MB; expected +1–2 MB).
- **Quality:** >80% coverage on new logic (stroke sequencing, pack progress, save
  migration); all existing 214 tests stay green; `pnpm check` clean (Biome + tsc strict).
- **Zero-text:** all new child surfaces text-free — numerals are drawn glyphs/art, not UI
  text; parent-facing copy stays warm & plain.
- **No regressions:** v1 flows (3 worlds, bonuses, parent zone, install/offline)
  unaffected; zero-text & device audits re-run.

## Acceptance Criteria

1. Pack card appears on the menu ("123" art) and opens the pack screen; the three worlds
   behave exactly as v1.
2. All 10 numerals (0–9) completable end-to-end; multi-stroke (4) and self-crossing (8)
   verified on-device; engine tests prove a generic 3-stroke level (letters foundation).
3. Star buddy idle/celebrate verified; N-hop/N-note behavior verified for several
   numerals incl. the 0 treatment.
4. Stickers + pack badge persist across relaunch; v1→v2 save migration verified (existing
   data intact).
5. Assists fire on multi-stroke levels; parent "easier tracing" + pack reset verified.
6. Zero-text audit passes on new child surfaces; art batch (card, 10 goals, 10 stickers,
   star) reviewed via screenshots.
7. Offline cold start + install still work (Android + iPad) with pack assets cached;
   dist-size and perf spot-checks recorded.
8. All checks green; no v1 regressions; device session: the toddler completes at least
   one numeral level unaided.

## Out of Scope

- Letters A–Z (follow-up track; this track's foundation makes them content work).
- Spoken voice/localization; accounts/cloud sync; store shipping; parent dashboards; new
  world themes/backdrops.
- Changes to the existing 12+3 levels' designs.
- Push/PR/release/tags — the track stays local on `track/letters-numbers-pack`; merge &
  release decisions are the owner's, afterwards. (The v1.0.0 stable cut remains the
  separate, pending CI/CD-handoff item.)
