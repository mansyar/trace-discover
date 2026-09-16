# Skins & Packs — Decoupling Content from Theme

**Track ID:** `skins-and-packs_20260915` · **Type:** Feature · **Status:** new
**Branch:** `track/skins-and-packs` · **Created:** 2026-09-15

## Overview

Split the app's conflated "theme" concept into two orthogonal axes: **skins** (presentation — character, backdrop, accent, instrument) and **packs** (content — ordered trace exercises, rewards, progress). Analysis of the shipped v1 confirmed the three worlds contain the *same* exercises (line/wave/arc/zigzag + circle) shifted vertically to fit each backdrop (deltas ≤ ~50 px, path-length variance ≤6%). This track makes that truth the architecture: the child picks *what to trace* (content-first menu) and *who comes along* (skin switch button, anywhere), progress never depends on cosmetics, and future content (letters A–Z) and future skins become pure pipeline work.

Today's model fuses: theme modules contain levels; level ids embed themes (`dino-1`); app routing special-cases the numbers pack; save keys are theme-based. After this track: a `skins/` registry (dino, star, construction, animal), a `packs/` registry (pre-writing 12+3, numbers 10), unified progress/rewards, and save v3 with lossless migration (old world badges become display-only trophies).

## Design decisions (locked)

- **Axis model:** run = pack level × active skin. Progress and rewards are pack-owned; the skin is cosmetic + persisted (`settings.skin`).
- **Skins (4):** dino (marimba), star (bell), construction (woodblock), animal (kalimba). Star is promoted from numbers mascot to a full skin (gets a generated backdrop).
- **Character contract:** every skin `.riv` exposes the same state machine (autoplay idle + `celebrate` trigger; hop placement stays canvas-transform based). Documented so new skins are drop-in via the asset pipeline.
- **Packs:** pre-writing (12 levels, circles unlock at 4/8/12) and numbers (10). Letters ship as a follow-up track.
- **Pre-writing re-ramp:** the existing 12 slots are re-ramped into 3 difficulty blocks (small → medium → large), 4 patterns each; slot order preserved for 1:1 migration.
- **Menu:** content-first pack cards, personalized by the active skin; top-left 96 px skin button (tap-to-cycle, poof + pop, 400 ms debounce, persisted) on every child screen; idle mascot on menu + pack screens.
- **Mid-trace swaps:** allowed anytime; the visible character/backdrop swap waits until the completion sequence (glow → hop → celebrate → sticker) ends if one is running.
- **Reward art:** content-owned and skin-neutral (12 + 3 new images); no per-skin art matrix.
- **Save v3:** unified levels, pack badges, legacy trophies, `settings.skin`; lossless v2→v3 migration; parent reset covers everything.
- **Working agreement:** local branch — no push/PR/release; merge & release decisions are the owner's afterward.
- **Docs:** `product.md` + `tech-stack.md` resynced to the skins × packs model (this also fixes the stale "awaiting the merge/release decision" note).

## Functional Requirements

**FR1 — Skins registry & contract.** Four skins — dino, construction, animal (existing) + star (promoted) — each defined by: id, `.riv` character, backdrop image, accent color, instrument preset, face icon. Skins carry no levels; `ThemeDef` is replaced and `LevelDef.theme` is removed. A generated backdrop lands for star in the art batch. The character contract is documented in `tech-stack.md`.

**FR2 — Packs registry & unified progress.** Content becomes ordered packs: id, badge id, ordered levels, unlock rules, optional bonus circles. Two packs ship: pre-writing (12 levels; circles unlock at 4/8/12) and numbers (10 levels). One progress model replaces the theme-progress + pack-progress split; the numbers-specific routing branches become generic pack handling. Level ids: `pre-1..pre-12`, `pre-bonus-1..3`, `num-0..9`.

**FR3 — Pre-writing re-ramp.** The canonical pack keeps 12 slots (1:1 with today's ids for migration) but each pattern's three variants become a genuine ramp — final values tuned in the content phase and verified by screenshot + device QA:

| Block | Line | Wave | Arc | Zigzag | Circle |
|---|---|---|---|---|---|
| Small (slots 1–4) | ~140 px | amplitude ~25 px | rise ~70 px | 2 teeth | Ø ~150 |
| Medium (slots 5–8) | ~230 px | amplitude ~55 px | rise ~110 px | 3 teeth | Ø ~200 |
| Large (slots 9–12) | full 310 px | amplitude ~85 px | rise ~160 px | 4 teeth | Ø ~260 |

Circles unlock at 4/8/12 and grow with their blocks. Geometry validated via `validateLevel` + screenshot QA + on-device feel check.

**FR4 — Content-first menu.** The Main Menu presents pack cards (Pre-writing, Numbers; future packs append) in the existing card language, personalized by the active skin (accent + character presence). Parent gate stays top-right; zero text as v1.

**FR5 — Skin switching.** Top-left 96 px skin button (current skin's face icon) on every child screen (menu, pack, level, success, badge). Tap cycles dino → star → construction → animal (wrap); feedback = poof sparkles + soft pop; 400 ms debounce; persists immediately. Mid-trace swaps never disturb stroke progress; the visible swap is deferred past a running completion sequence. Parent zone gains a skin setter + display-only legacy trophy row.

**FR6 — Idle mascot & skin-driven rendering.** The active character idles on menu and pack screens (parked where space allows) as well as in levels. Backdrops and the level-screen character resolve from the active skin; pack screens render pack content (cards, sticker shelf, badge) independent of the skin.

**FR7 — Audio mapping.** Checkpoint chimes and completion use the skin's instrument (dino marimba · star bell · construction woodblock · animal kalimba; same pentatonic language and completion melody, different timbre). Numerals keep toy-piano counted notes (content semantics). Unlock-on-first-touch, volume/mute unchanged.

**FR8 — Save v3 & migration.** Schema v3 unifies: `completedLevels` (all packs), `badges` (per pack), `trophies` (legacy world badges), `settings` (incl. `skin`). v2→v3 lossless mapping: `dino-N`→`pre-N`, `construction-N`→`pre-(N+4)`, `animals-N`→`pre-(N+8)`, `dino-bonus`/`construction-bonus`/`animals-bonus`→`pre-bonus-1..3`, `num-*` preserved, old theme badges→trophies, numbers pack badge→pack badges; v1 saves continue to migrate through. Hostile-input sanitizing preserved. The write-only `assistWidened` flag is dropped (widening is computed per level at runtime). Parent reset clears packs, badges, trophies (2-step confirm as v1).

**FR9 — Reward art batch.** 12 + 3 content-neutral rewards (achievement-themed: e.g. wave→water, arc→rainbow, zigzag→lightning; circles→sun/ball), doubling as stickers, plus star backdrop, pre-writing menu-card art, and four face icons. Standard batch process (generate → cutout → composite → screenshot approval).

**FR10 — PWA/offline.** All new assets (rewards, backdrop, icons) covered by the existing Workbox glob and precache; zero runtime network calls; install/offline behavior unchanged.

## Documentation updates

- `product.md` — reframe around packs × skins; refresh the dated note (numbers pack merged/released; follow-up wording).
- `tech-stack.md` — skins/packs architecture, save v3, character contract; refresh the stale letters-pack note.
- Track-local — ramp geometry table and migration mapping (this spec).

## Non-Functional Requirements

- **Performance:** 60 fps on mid-range Android + base iPad, incl. mid-trace skin swaps; tap→feedback <100 ms; sprite swap masked by poof; no new crash states.
- **Offline/PWA:** zero runtime network; offline cold start <1 s unaffected; install unchanged.
- **Size:** dist within the <~10–15 MB budget (v1 = 6.25 MB; expected +1.5–3 MB).
- **Quality:** >80 % coverage on new logic (registries, progress, migration, switching); existing tests updated to the new model stay green; `pnpm check` clean (Biome + tsc strict).
- **Zero-text:** all child-facing surfaces remain text-free.
- **No regressions:** stroke engine behavior (tolerance, assists, choreography, audio unlock) unchanged; v1 device audits re-run.

## Acceptance Criteria

1. Four skins × both packs: every combination boots, plays, and completes — star backdrop included.
2. Skin button on all child screens; cycles with poof/pop; persists across relaunch; mid-trace swap keeps progress; celebration never interrupted.
3. Menu is content-first and personalized by the active skin; idle mascot visible on menu + pack screens.
4. Pre-writing ramp verified: 12 levels small→large by blocks, circles unlock at 4/8/12, badge on completion; screenshot batch + on-device feel checks recorded.
5. Numbers content unchanged and playable under any skin (star no longer required there).
6. Save migration: seeded v2 fixtures (empty / partial world / full world + numbers / hostile input) migrate losslessly with trophies preserved; reset clears all; verified on-device.
7. Audio: per-skin instruments on chimes/completion; counted notes unchanged; mute/volume respected.
8. Zero-text audit passes; art batch approved via screenshots; offline cold start + install verified (Android + iPad); dist/perf recorded.
9. All checks green; device session: toddler completes a re-ramped level and swaps skins mid-trace happily.

## Out of Scope

- Letters A–Z (follow-up track — pure content on this foundation).
- New skins beyond the four (contract + pipeline documented only).
- Changes to numerals 0–9 designs; packs beyond pre-writing + numbers.
- Spoken voice/localization · accounts/cloud sync · store shipping/monetization · parent dashboards.
- Push/PR/release/tags — stays local on `track/skins-and-packs`; merge & release decisions are the owner's.
