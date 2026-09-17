# Specification: Landscape layout — wide-field play for names, words, and the full app

**Track ID:** `landscape-layout_20260917`
**Type:** Feature
**Status:** new
**Branch:** `track/landscape-layout`
**Created:** 2026-09-17

## Overview

The app ships a single portrait design space (430×860) letterboxed into any
viewport. In landscape it becomes a half-scale portrait strip — and word-class
tracing (the runtime **My Name** level, the ABC/MOM/ZOO bonuses) composes into
a 350-unit box, shrinking letters to ~49% (5 letters) / ~34% (7 letters) with
dot/ribbon guides clamped into mush. This track introduces a **native
landscape design space (860×430)** and an orientation-aware composition layer:
every screen re-lays for the wide field, word rows compose at full letter size,
and device rotation re-flows instantly with progress preserved. Portrait output
remains visually unchanged.

## Functional Requirements

### FR1 — Orientation foundation

- Dual design spaces: portrait 430×860 (unchanged) and **landscape 860×430**;
  orientation chosen by viewport aspect (width > height → landscape).
- The field, canvas backing store, input mapping, character canvas, and name
  input reflow on resize/orientation change; all layouts (menu, pack
  grids/pagers, success, parent, skin button, splash) become orientation-aware
  rebuilds instead of boot-time constants.
- `window.__app` gains an additive `orientation()` probe hook; existing probe
  API (`field`, `targets`, …) reflects the active design space.
- Portrait output is visually unchanged (baseline screenshots must match).

### FR2 — Level composition per orientation + rotation reflow

- A pure projection layer composes any `LevelDef` for the active orientation:
  single glyphs (letters/numbers/pre-writing) uniformly scale-to-fit and center
  in the wide field; word rows recompose (FR3/FR4).
- Rotation mid-activity re-flows instantly: an in-flight stroke ends cleanly;
  the level re-lays; **progress is preserved** (stroke index + proportional
  position within the stroke); menu/pack/success/badge/parent screens simply
  re-lay with no state loss.
- No orientation gate, no restart-on-rotate, no data loss. (iOS PWAs have no
  reliable orientation lock — not attempted.)

### FR3 — My Name in landscape

- `buildNameLevel` takes the orientation: landscape composes the whole name in
  one row across an ~800-unit-wide box at a **scale cap of 1.0** — 5-letter
  names hit full letter size (same as single-letter levels), 7-letter names
  ~0.72+ (~2.3× today).
- Path visuals (ribbon/dots/tip) follow the glyph scale without hitting
  clumping floors at max length.
- Portrait keeps today's composition exactly (squeezed long names included —
  accepted).

### FR4 — Word bonuses in landscape

- ABC / MOM / ZOO recompose from the shipped letter glyphs as full-size rows in
  the wide box (shared composer with the name path).

### FR5 — Child shell screens in landscape

- Menu: pack cards re-laid for the wide field (centered row; wrapped grid
  beyond four cards); gate zone, skin button, mascot park re-tuned. Pack
  screens: grids/pagers/sticker shelves/badge seals recompose per pack
  configuration. Success, badge, splash recompose (layouts are already
  dimension-parameterized where possible).
- Level presentation (backdrop, goal vignette, character parks,
  confetti/particles) covers the wide field; letterboxing minimized to the
  design/aspect difference (~20px bars on 900×430).

### FR6 — Parent surfaces in landscape

- Parent zone (nine controls + trophies), name overlay, and install panel
  recompose for 430 height with big-target ergonomics. Builds on the in-flight
  `track/parent-zone` design — see Decisions.

### FR7 — QA & evidence

- Unit tests: orientation policy, projection/composition math (name scale, word
  rows, glyph fit), layout rebuilds, session reflow preserving progress.
- New canonical `dev/qa/qa-landscape.mjs`: per-screen screenshot matrix
  (portrait reference + landscape), rotate mid-trace and mid-menu with
  state/progress assertions, target-size and field-aspect assertions;
  supersedes the stale `qa-viewport.mjs` (its `success:home → menu` assumption
  is already broken). Name/word probes extended with landscape passes.
- Device pass: Android + iPad, portrait regression + landscape acceptance
  (owner-signed screenshots; toddler traces a 5+ letter name ≥1 time unaided).

### FR8 — Docs & housekeeping

- product.md (feature + dated note), tech-stack.md (dual design spaces,
  orientation policy, composition layer), dev/README probe table; `pnpm budget`
  re-recorded (no new assets expected).

## Non-Functional Requirements

- Coverage >80% on new logic; `pnpm check && pnpm test` green; pre-commit gates
  per workflow.md.
- Zero new dependencies; zero network; offline cold start unaffected; save
  schema unchanged (v3, no new fields).
- Zero-text child surfaces preserved; all child targets keep the 90px-design
  floor at landscape scales (device-verified on the smallest phones; any
  sub-90 exception documented).
- Budget unchanged (~4.64 MB anchor); no new art assets.
- Rotation reflow is visually instant (same-frame re-lay on resize; no flicker,
  no blank frame).

## Acceptance Criteria

1. In landscape (phone rotated + tablet on stand) every screen fills the wide
   field natively — no portrait strip, no dead cream, screenshots per screen.
2. A 5-letter name composes at full letter size and a 7-letter name ≥0.7 scale,
   traced to completion on device with clean guides (photo/video evidence).
3. ABC/MOM/ZOO trace as full-size rows in landscape.
4. Letters, numbers, and pre-writing levels are centered and comfortably sized
   in landscape.
5. Rotate mid-trace, mid-menu, mid-success: no state loss, no crash; tracing
   resumes from preserved progress; reflow is instant.
6. Portrait is visually unchanged vs the v1.3.0 baseline (screenshot
   regression).
7. Parent zone, name overlay, and install panel are fully usable in landscape.
8. Zero-text audit passes; offline cold start unaffected; no new runtime
   network; budget within ceilings.
9. QA probes green incl. new landscape matrix; unit coverage >80%; docs synced.
10. Device pass Android + iPad (owner confirms); all checks green; review
    passed.

## Out of Scope

Portrait long-name relayout (two-row, bigger names) · orientation lock · new
art/assets · menu capacity redesign beyond wide recompose · sticker book ·
parent-zone visual redesign (owned by the in-flight track) · engine gameplay
changes (tolerance/speed/assists) · save schema changes · accounts/cloud/
monetization.

## Decisions & Fallbacks

- **Sequencing with `track/parent-zone` (unmerged):** recommended — land
  parent-zone first, then rebase this track onto it (both touch the parent
  screen, gate zone, and render wiring); fallback — this track proceeds from
  master and parent-zone rebases after (coordinate at merge; landscape parent
  layout mirrors whichever design is canonical).
- Design decisions: orientation by viewport aspect; reflow-on-rotate without
  gates; name scale cap 1.0; recomposed full-size word rows; per-screen
  screenshot approval for all re-laid screens (the established art-review
  loop).
- Fallback: if a surface resists wide adaptation late in the track, it may
  temporarily keep the letterboxed strip **explicitly listed** (target: none)
  rather than blocking the track.
