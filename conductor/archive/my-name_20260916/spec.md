# Specification: My Name — personalized name tracing

**Track ID:** `my-name_20260916`
**Type:** Feature
**Status:** new
**Branch:** `track/my-name`
**Created:** 2026-09-16

## Overview

The first personalized content in Trace & Discover: the child traces her own
name. A parent enters the name once (behind the 2-finger gate); the app composes
a trace level at runtime from the already-shipped uppercase glyph geometry and
presents it as a mini-pack ("My Name") with its own menu card, sticker, and
badge. The name is on-device data only — never shipped, never networked. This
track also proves the runtime-composition pattern: personalized content as
pipeline work, not hand-authored levels.

## Functional Requirements

### FR1 — Name capture (parent zone)

- A new "name" button in the parent zone (behind the 2-finger gate) opens an
  overlay panel.
- The panel contains a DOM text field and a Save button; a Clear button appears
  only when a name exists; Cancel dismisses without saving.
- Save sanitizes input: uppercase, non-A–Z stripped (spaces, hyphens, accents,
  digits removed), length clamped to `MAX_NAME_LENGTH` (initial 7; device-tuned
  final; floor 5). Fewer than 2 valid letters → Save rejected (overlay stays
  open).
- Saving persists immediately (soft pop) and dismisses the overlay.
- Clear removes the name without confirmation; rewards are kept.

### FR2 — Persistence

- `SaveData` gains an additive `name?: string` (top level; absent = no name).
- The loader sanitizes it with the same `sanitizeName` used by input, so
  hostile/garbage values degrade to "no name" — no crash, no schema version
  bump (stays v3; v1/v2/v3 migrations and existing fixtures unaffected).
- "Reset progress" does not clear the name (it is not progress).
- The name never leaves localStorage (never in git, dist, or any payload).

### FR3 — Runtime level composition

- `buildNameLevel(name)` (pure, unit-tested) composes level `name-1` from the
  shipped letter glyphs: letters in order, each letter's authored stroke order
  preserved, uniform scale + advance so the name fits centered in the standard
  letter box; goal = final control point of the last stroke.
- Per-stroke hops, checkpoints/chimes, celebrates, and assists ride existing
  session machinery — no engine changes.
- Long names: path visuals (ribbon/dots/tip radii) scale proportionally with a
  floor; tolerance/speed stay untouched (visual-only).
- STOP gate: if device tuning cannot confirm `MAX_NAME_LENGTH ≥ 5` with
  acceptable feel, return to the owner for a decision (options: lower cap, or a
  two-row writing-practice layout).

### FR4 — Menu, pack screen, and flow

- While a valid name is set, the menu shows a 4th card ("My Name") drawn with
  name mini-glyphs; one progress dot; gold star once awarded; it disappears when
  cleared (menu back to 3 cards).
- The card opens the mini-pack screen (one level card with name mini-paths, one
  sticker slot, badge seal) which opens the level.
- Success offers the standard replay/home behavior (the single level's "next"
  wraps to itself).

### FR5 — Rewards

- First completion awards sticker `name-1` + badge `name-badge` with the
  standard ceremony.
- Stable ids mean rewards are earned once, replayable anytime, kept when the
  name changes or is cleared (hidden surfaces only).

### FR6 — Assets

- Two new art assets via the dev pipeline with owner screenshot approval:
  sticker (`/art/sticker/name-1.png`) and badge (`/art/pack/name-badge.png`).
- Level goal art reuses the final letter's existing letter art; the menu card
  and pack mini-paths are drawn from geometry (no card art file).
- The name mini-pack gets a distinct pastel `menuFill` (tentative warm
  coral/gold, screenshot-approved).

### FR7 — Docs resync + QA

- product.md (feature + dated note), tech-stack.md (save field, composition,
  assets), root README (stale line fix).
- Headless probe: set name behind the gate → 4-card menu → pack → trace to
  completion → sticker/badge → reload persistence → clear → card gone;
  hostile-name save fixtures; zero-text audit; offline cold start unaffected.

## Non-Functional Requirements

- Zero-text child surfaces preserved: name letters are drawn content; text
  appears only in the parent overlay.
- Privacy: the name is runtime user data — never committed, shipped, or
  transmitted.
- No regressions: existing packs/skins/hostile fixtures unaffected; engine
  behavior unchanged.
- Coverage >80% on new logic (composer, sanitizer, pack/menu wiring);
  `pnpm check && pnpm test` green.
- Size: +2 small assets; dist stays within the <~10–15 MB budget; offline
  precache updated automatically.
- Device targets: Android Chrome + iPad Safari (typing overlay + keyboard,
  tracing feel, long-name check).

## Acceptance Criteria

1. Parent can set/change/clear the name via the overlay behind the gate;
   sanitization enforced; persists across reload.
2. Card appears exactly while a valid name is set (3→4 cards), draws the name
   glyphs, and disappears when cleared.
3. Card → pack screen → level flow works; per-stroke hops/chimes; completion →
   hop, celebrate, sticker fly, success (screenshots).
4. Sticker + badge awarded once with ceremony; replay safe; name change/clear
   keeps rewards.
5. Every accepted name composes correctly within field bounds (unit coverage
   per letter); `MAX_NAME_LENGTH ≥ 5` confirmed by device check.
6. Zero-text audit passes; offline cold start unaffected; no new runtime
   network.
7. Hostile save fixtures safe; v1–v3 loads unchanged.
8. Docs synced; dist size recorded within budget.
9. Device pass on Android + iPad; owner confirms the toddler traces her name
   ≥1 time unaided.
10. All checks green; review passed.

## Out of Scope

Lowercase/accented/spaced or hyphenated names · multiple names/profiles · name
pronunciation or phonics · changes to letters/pre-writing/numbers content · new
skins (teddy track untouched — separate branch) · engine mechanics changes
(tolerance, speed, assists) · save-schema version bump · cloud/accounts/parent
dashboards · push/PR/release (local branch only).

## Decisions & Fallbacks

- Long names: proportional visual thinning + device-tuned cap (owner-selected);
  fallback gate above.
- Rejected: hard cap of 5 (less flexible); two-row layout (kept only as the
  fallback if the gate fails); embedding the name inside the Letters pack
  (rejected for discoverability).
