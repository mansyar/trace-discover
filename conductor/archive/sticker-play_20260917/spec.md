# Specification: Sticker Play — interactive sticker rewards

**Track ID:** `sticker-play_20260917`
**Type:** Feature
**Status:** new
**Branch:** `track/sticker-play`
**Created:** 2026-09-17

## Overview

The reward loop currently ends at collection: a completed level flies its
sticker into the pack shelf, where it sits as an inert 40-unit dot. Nothing
in the app ever *does* anything with the earned stickers, so the deepest
asset the child owns — up to 55 stickers across packs — has no play value.

This track gives collected stickers a play surface: a per-pack **sticker
board** (a zero-text album) opened by tapping the sticker shelf on pack
screens. Every earned sticker can be tapped for a springy pop, sparkle burst,
and a pentatonic note — stickers map to scale steps, so tapping several in a
row plays little melodies. A soft shelf pulse teaches "the shelf opens
something" until the first open, then guidance never returns. No new art, no
new dependencies, no schema bump (one additive boolean).

## Functional Requirements

### FR1 — Sticker board screen & navigation

- New `AppScreen` variant (`sticker-board`, packId) + events: open from a
  pack screen by tapping the sticker shelf band, close via home (returns to
  that pack screen), tap a sticker.
- Entry is active only while the pack has ≥1 earned sticker; on a fresh save
  the shelf stays display-only (exactly today's behavior).
- The shelf band is a tap target **excluding** the home + pager corner zones
  (existing controls keep precedence).
- The board belongs to the pack (not the page): letters' A–L and M–Z pages
  open the same 29-slot board.
- Guards: open only for an existing pack with stickers; taps only on earned
  stickers; no dead ends (home always exits).

### FR2 — Board layout & sticker art

- Reuses the shipped per-level sticker art at board scale — no new assets.
- All slots of the pack shown (incl. bonuses): earned = filled sticker,
  unearned = ghosted placeholder (matches the shelf's collection narrative).
- Cell targets sized for toddler fingers: ≈96 field units where the count
  allows (pre 15 / nums 10 / name 1); the 29-slot letters board uses the
  largest single-screen grid that fits (~74 units — final values device-tuned
  and recorded in the plan).
- Single screen per pack (no paging/scrolling); no layout collisions on
  phone + iPad.
- Skin backdrop behind the board, consistent with other screens; home button
  in the pack-screen corner style.

### FR3 — Tap moment (springy pop + sparkle)

- Tapping an earned sticker starts a short performance (~1–1.5s): the
  sticker springs to ~400 field units with squash & stretch overshoot, a
  sparkle burst fires, one synth note plays, then everything settles back to
  calm.
- Rapid taps: a new tap restarts the moment with the newly tapped sticker;
  at most one note active at a time.
- Ghosted slots do nothing; nothing can be lost or broken by tapping.

### FR4 — Pentatonic ladder audio

- Each sticker maps to a fixed step on the skin's pentatonic scale
  (C D E G A), cycling in level order with rising octaves — so sequential
  taps play a little musical run and the same sticker always sounds the same.
- Uses the active skin's instrument preset (marimba · bell · woodblock ·
  kalimba · music box) and existing synth/player modules.
- Final note mapping tuned by ear; owner-approved on device.

### FR5 — First-open shelf pulse & save flag

- While the intro flag is unset **and** the pack has ≥1 earned sticker, the
  shelf band shows a soft repeating pulse (scale/glow) — non-blocking, no
  text, never intercepts taps.
- The first successful board open sets the flag (persisted immediately); the
  pulse never returns.
- Additive top-level `stickerIntroSeen?: boolean` (absent/non-boolean →
  false; hostile values safe; no schema version bump; v1–v3 migrations
  untouched).
- Reset-progress **preserves** the flag (same rule as the child's name and
  the parent hint) — progress resets, learned cues don't.

### FR6 — State machine, input, render wiring

- `applyAppEvent` handles board open/close/tap purely; every transition
  unit-tested.
- Render/input reuse existing primitives: `mapPointerToField`, hit-testing
  in a new pure `ui/stickerBoard.ts` layout module, rAF-driven pop animation,
  existing confetti/sparkle renderers.
- Audio hook goes through the existing player (volume/mute respected).
- `window.__app.targets()` gains the board's targets (shelf band, home,
  sticker cells) for QA.

### FR7 — QA & tooling

- New probe `qa-sticker-play.mjs`: seeded save → pulse visible → shelf tap →
  board opens → sticker tap (pop + note asserted via state/handler) → home →
  reload → pulse gone → fresh-save inert behavior → letters board fit →
  screenshots.
- Unit tests: app transitions, board layout/hit math, sanitizer for the new
  flag, pulse gating, reset-preserve behavior.
- `dev/screens.ts` preview gains `?screen=board` (seeded) for fast iteration.
- Audit existing QA probes that touch the shelf region (qa-name, qa-pre-pack,
  qa-menu-pack) for the new hit area.

### FR8 — Docs & workflow compliance

- Docs updated before implementation, per workflow.md: product.md (core
  features + dated note), tech-stack.md (save field, board screen, audio
  mapping + dated note).
- Zero-text audit on child surfaces; no new dependencies; offline-safe.

## Non-Functional Requirements

- Coverage >80% on new logic; `pnpm check && pnpm test` green; `pnpm budget`
  green (no new shipped assets expected — ceilings unchanged; any addition
  re-measures deliberately).
- Pop moment stays within frame budget on low-end targets (reuse the existing
  rAF path; no per-frame allocations in the new render).
- Full offline behavior (board works with no network); no new dependencies.
- Device pass on Android phone + iPad: tap targets land, pop is
  lively-not-startling, ladder is musical; owner signs off.

## Acceptance Criteria

1. Tapping the shelf on a pack with stickers opens the board; home returns to
   the pack screen; fresh saves keep today's inert shelf.
2. Board shows all pack slots (earned filled / unearned ghosted); letters' 29
   slots fit one screen without collisions (phone + iPad screenshots).
3. Tapping an earned sticker: springy pop ~400 units + sparkle + one
   instrument note; settles to calm within ~1.5s; rapid taps restart cleanly.
4. Sequential taps play a pentatonic run (stable per-sticker notes); owner
   listens on device.
5. Pulse: appears while unseen + stickers exist, non-blocking; gone
   permanently after first open, reload-safe; survives reset-progress.
6. Fresh save: no pulse, shelf inert; once the first sticker lands, the pulse
   appears and the board opens.
7. `stickerIntroSeen` persists; hostile fixtures sanitize to safe defaults; no
   schema bump; existing saves/migrations regression-free.
8. Zero-text audit passes; suite + coverage green; budget green; QA probes
   green; device pass on Android + iPad; owner sign-off.

## Out of Scope

New sticker/cast art · badge spot interactions · character reactions on the
board · drag/arrange/reordering · sharing or gifting stickers · success-screen
or menu changes · haptics · sound-setting changes (existing volume/mute apply)
· schema version bump · text/i18n on the board · board paging or scrolling ·
parent-facing settings.

## Decisions & Fallbacks

- Flag: `stickerIntroSeen` top-level, additive; **preserved by reset** (matches
  name + parent-hint precedent — progress resets, learned cues persist).
  *Earlier shortcut said "cleared by reset"; this corrects it for consistency.*
- Letters board is single-screen; **fallback** if device tuning can't keep
  cells usable: two pages mirroring the pack pager (owner decision gate).
- Layout numbers + note mapping land in the plan (device/ear-tuned, values
  recorded).
- Integration note: the in-flight `parent-zone` track also edits reset
  handling (preserves `parentHintSeen`); whichever merges second reconciles
  the merged reset to carry `name` + `parentHintSeen` + `stickerIntroSeen`.
- No new assets expected; if any surface needs art, it goes through the
  standard generate → cutout → optimize → approve loop and re-measures the
  budget.
