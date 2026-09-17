# Specification: Parent Zone — one-finger gate, discovery hint, and zone finish

**Track ID:** `parent-zone_20260917`
**Type:** Feature
**Status:** new
**Branch:** `track/parent-zone`
**Created:** 2026-09-17

## Overview

First dedicated UX pass on the parent gate and area. The two-finger hold is
awkward one-handed on a phone; the gate is undiscoverable in-app (even the
install guide lives behind it); the sound controls give no feedback and go
silent while muted; the install guide always shows both platforms; the zone
reads as unfinished. This track redesigns the gate as a one-finger hold with
visible progress, teaches it once via a transient parent hint, upgrades the
sound + install sections, and finishes the zone with section cards and reactive
feedback. Child surfaces return to zero-text once the hint is learned.

## Functional Requirements

### FR1 — Gate redesign (one-finger hold)

- Menu-only, top-right corner zone (stays 100×100 field units; may be enlarged
  slightly during device tuning).
- One-finger press-and-hold: the hold progresses while a pointer that started
  inside the zone is down. Target ~2.5s, device-tuned within 2.0–3.0s (final
  value recorded).
- Feedback: a progress ring/arc at the corner fills with the hold and drains on
  release; releasing early cancels cleanly. A second finger is irrelevant.
- On open: soft pop + small sparkle burst, then the parent screen as today.
- Tracing/child input is untouched (raw gate listener unchanged);
  `window.__app.targets()` keeps the `gate` target id (QA contract).

### FR2 — One-time parent hint

- While `settings.parentHintSeen !== true`, the menu shows a small
  parent-facing hint near the corner (short text; final copy owner-approved via
  screenshot) explaining the hold.
- Non-blocking — never intercepts taps; child play unaffected.
- The first successful open sets the flag (persisted immediately); the hint
  never returns. Existing saves (no flag) see it once.
- "Reset progress" preserves the flag (like the child's name).

### FR3 — Sound controls

- Five volume pips reflect `settings.volume`; the muted state dims them and
  lights the mute button.
- quieter/louder: step volume, auto-unmute if muted, and play a preview note at
  the new level using the active skin's instrument.
- Mute stays a deliberate toggle; settings persist exactly as today.

### FR4 — Install guide upgrade

- Detect platform (iOS/iPadOS, Android, unknown) and installed state
  (`display-mode: standalone` / iOS `navigator.standalone`).
- Show only the relevant platform's steps; ambiguous/desktop → generic steps
  (may show both). Already installed → "All set" confirmation + offline
  reminder, no steps.
- Panel restyled to the finished zone's card language.

### FR5 — Zone finish (section cards + reactive feedback)

- Regroup the nine controls into labeled cards: Sound (quieter · mute · louder +
  pips) · Play (easier tracing) · Skin & Name (skin cycle + name editor) · Data
  (restart) · Help (install guide), plus the big Done. The trophies row stays
  display-only, repositioned to fit.
- Card styling per the app art language (white fill, navy outline, rounded,
  section labels), roomier spacing, clear on/off states, generous targets.
- Every control reacts instantly: pressed pulse + pop; toggles animate state;
  restart confirm banner persists; install panel animates in; skin poof
  unchanged. All nine actions keep current semantics; no new parent
  capabilities.

### FR6 — Persistence, docs, zero-text

- Additive `settings.parentHintSeen: boolean` (absent/non-boolean → false; no
  schema bump; v1–v3 migrations untouched; hostile inputs safe). Reset preserves
  name + hint flag.
- Docs updated before implementation, per workflow: product.md (gate wording +
  dated note), tech-stack.md (save field, platform detection, gate semantics).
- Child surfaces stay zero-text in steady state; the transient hint is the one
  documented, parent-targeted exception.

### FR7 — QA & tooling

- QA gate simulation becomes a single pointer (updates in `qa-name`,
  `qa-pre-pack`, `qa-teddy-screens`).
- New probe `qa-parent-zone.mjs`: hint visible → hold → open (ring/pop) → flag
  set → reload → hint gone → sound pips/preview/unmute (asserted via save) →
  install panel states (platform + standalone overrides) → restart confirm →
  screenshots.
- `dev/screens.ts` preview gains `?screen=parent` for fast iteration.
- Unit tests updated: parent gate wiring, parentZone layout, store sanitizer,
  app reset-preserve.

## Non-Functional Requirements

- Coverage >80% on new logic; `pnpm check && pnpm test` green; budget unchanged
  within ceilings (no new shipped assets expected).
- Device pass on Android phone + iPad; the owner confirms one-handed phone
  opening and hint clarity.
- Zero network; no new dependencies; name/letters/numerals flows and
  hostile-save fixtures regression-free.

## Acceptance Criteria

1. One-finger hold ~2.5s in the corner opens the zone on the menu; ring
   fills/drains; open pops + sparkles; toddler tracing unaffected (Android +
   iPad).
2. The owner can open the zone one-handed on a phone with a thumb — no
   two-finger contortion.
3. Hint shows until the first successful open, is non-blocking, and is gone
   permanently after first open + reload; reset keeps it gone (screenshots).
4. Sound: pips reflect level; each +/- previews at the new level; +/- unmutes;
   mute toggles with a clear state; all persist across reload.
5. Install guide shows only the relevant platform's steps; installed state
   shows "All set"; ambiguous platforms stay sensible.
6. Zone reads finished: sections/cards styled, every control reacts (visual +
   sound), no layout collisions on phone + iPad (screenshot approval).
7. Docs updated before implementation; zero-text audit passes except the
   documented transient hint.
8. QA probes updated + new parent probe green; unit suite + coverage green; no
   regressions; budget green.
9. Device pass on Android + iPad; owner signs off on gate feel, hint, sound, and
   zone look.

## Out of Scope

Skin presence/backdrop behind the zone · trophy-row content overhaul ·
name-overlay restyle · storage status · parent explainer panel · reset-flow
redesign beyond the current two-tap · extra accidental-open protections · gate
on non-menu screens · new parent capabilities · engine/tracing/save-schema
version changes · i18n · new packs/skins/art · accounts/cloud/analytics.

## Decisions & Fallbacks

- Hold duration: 2.5s target, device-tuned 2.0–3.0s (final recorded in the plan).
- If the device pass finds accidental opens unacceptable → fallback to a relaxed
  two-finger variant (larger zone, ~2s, drift allowed, ring) — owner decision
  gate.
- Hint placement/copy: final via screenshot approval; small, corner-anchored.
- Platform detection: UA + display-mode with a sensible generic fallback.
- Save field: `settings.parentHintSeen`; reset preserves name + flag.
