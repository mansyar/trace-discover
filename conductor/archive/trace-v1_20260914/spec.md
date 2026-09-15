# Specification: Trace & Discover! — v1 MVP

**Track:** `trace-v1_20260914` · **Type:** MVP · **Status:** new

## Overview

Deliver the complete v1 of **Trace & Discover!** — a mobile-first installable PWA where toddlers (~3–4) build pre-writing stroke control by tracing guided paths across three themes. This is a greenfield app built on the proven spike foundation (Rive CLI asset pipeline, canvas trail blockout, headless-Edge verification).

## Functional Requirements

**FR1 — Screens & shell (zero-text).** Boot splash (logo art) → Main Menu → Theme Screen → Level → Success → back. No text on any child surface; all child targets ≥90px; no timers, no failure states, no dead ends (home always reachable). Theme screen shows 4 level cards + 4 sticker slots (earned sticker or dashed silhouette) + badge spot.

**FR2 — Trail engine.** Code-drawn chunky paths: dark-outlined ribbon + bright fill, marching-dot direction cue, pulsing start star + fading hand hint, unique goal art per level. Continuous trail-tip tracking: frontier advances only while the finger is within tolerance, advance speed capped (fast swipes can't skip), lifting keeps progress, progress never decreases. Tolerance ≈12% of the play field's small dimension. Paint-fill reveals behind the fingertip + fingertip sparkles. Path divided into checkpoints; each adds the next ascending pentatonic chime.

**FR3 — Assists (no-fail).** Star nudge after 2s without progress; animated hand hint after 4s (fades on touch); gentle auto-assist — after 3 nudges in a level, tolerance quietly widens for the session; parent "easier tracing" toggle overrides.

**FR4 — Completion choreography.** Path glows → character hops along the traced trail (sparkle burst at 50%) → lands at goal → celebration (~2s: jump, arms-up, confetti particles follow) → sticker auto fly-in to its slot → three big icons (replay · next · home).

**FR5 — Content: 12 levels + 3 bonuses.** 3 themes × 4 patterns, same curriculum ramp in every theme: **L1 line** (left→right), **L2 wave** (left→right), **L3 arc** (bottom sweep, counterclockwise convention), **L4 zigzag** (left→right); **bonus = big closed circle** (start at top, counterclockwise). Each level: backdrop, path, character, goal, sticker art. Themes: 🦖 Dinosaur Trail, 🚜 Construction Site, 🦁 Animal Friends.

**FR6 — Characters (Rive).** AI-generated sticker art in script-free `.riv` files (≤~500 KB each), state machines: **idle** (bob + blink loop) during tracing, **celebrate** (trigger from host JS) on completion. Built via the established pipeline: generate → cutout → RML → verify/inspect/screenshot; pose variants via shared-box crops + feathered eye-patch overlays.

**FR7 — Audio (Web Audio, sounds-only).** Synthesized pentatonic: chime per checkpoint (ascending), chord resolve + sparkle arpeggio on completion, soft UI pops; per-theme instrument preset (marimba / kalimba / soft plucks) sharing one musical language; unlocked on first touch; no voice, no words, no ambient loops.

**FR8 — Rewards & persistence.** Sticker per level (12 total) auto-flies to its theme slot; completing all 4 → theme badge + surprise **5th bonus circle**; bonus seals the collection. Progress + settings in localStorage (completed levels, stickers, badges, volume, easier-tracing, auto-assist state). No accounts, no cloud.

**FR9 — Parent zone.** 2-finger hold ~3 s in a menu corner → volume/mute, easier tracing, reset progress (with confirm), install-to-home-screen guide (parent-facing text allowed — warm & plain tone).

**FR10 — PWA & offline.** `manifest.json` (standalone, star-on-path icon 192/512/maskable), Workbox precache of **everything** (incl. `.riv` + wasm) → fully offline after first load; deploy to Cloudflare Pages; installable on Android Chrome + iPad Safari; safe-area + system-gesture insets; rotation-safe letterboxed play field.

**FR11 — Input.** Unified Pointer Events; only `isPrimary` drives tracing (palm rejection); `touch-action: none`; zoom/scroll/context-menu suppressed; secondary touches ignored.

**FR12 — Level data.** Typed TS modules per theme: control points (smooth spline, constant pixel spacing at runtime), start zone, direction, goal/character/sticker/backdrop refs. Tuned on device, defaults per curriculum.

## Non-Functional Requirements

- **Performance:** 60 fps mid-range Android + base iPad while tracing · first load < ~3 s typical Wi-Fi · offline cold-start < 1 s · touch→feedback < 100 ms
- **Size:** whole app offline-cached ≤ ~10–15 MB (characters ≤ ~500 KB each)
- **Quality:** TypeScript strict · Biome + `tsc --noEmit` clean · >80% coverage on logic modules (engine, save, audio) · screenshot QA for art
- **Compatibility:** Android Chrome + iPad Safari PWA, both orientations, DPR-aware rendering
- **Reliability:** no crash states, interruptions safe, progress saved at every completion, zero network calls at runtime

## Acceptance Criteria

1. Installable, fully offline on Android phone **and** iPad (tested on both)
2. All 12 levels + 3 bonuses playable end-to-end with correct stroke directions; each runs hop → celebrate → sticker fly-in
3. Zero text on child surfaces (visual audit passes)
4. **The child completes ≥1 level unaided on a real device** (independent-play bar)
5. Assists demonstrably fire (2 s nudge, 4 s hint, auto-assist widening, parent override)
6. Parent gate opens; settings persist across restarts; reset restores fresh state
7. NFR budgets measured and passing (fps, load times, total size)
8. All automated checks green (`pnpm check && pnpm test`)

## Out of Scope (v1)

Letters/numbers tracing · accounts/cloud sync · voice/localization · store/monetization · parent dashboards · additional themes

*Draft-time content items (decided during content phase, not blockers): cast list per theme, sticker/goal art specifics, exact checkpoint counts per level.*
