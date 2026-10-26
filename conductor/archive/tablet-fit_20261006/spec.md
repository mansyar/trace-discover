# Specification: Tablet fit — fill the canvas on iPads and Android tablets

**Track ID:** `tablet-fit_20261006`
**Type:** Feature
**Status:** new
**Branch:** `track/tablet-fit`
**Created:** 2026-10-06

## Overview

The app ships two design spaces sized to a phone (portrait 430×860, landscape
860×430) and letterboxes them into any viewport (`field.ts`,
`shell/layout.ts`). On a **4:3 iPad this wastes ~33% of the screen** —
measured on a live 1024×1366 viewport: the field renders 683×1366, leaving
~170 px of dead cream per side; landscape loses the same third top-and-bottom.
Android tablets (16:10, 3:2) lose comparable margins, and the landscape track's
own acceptance criterion ("no dead cream") was met only at the 900×430 phone
case it was measured on.

This track adds **tablet design spaces** with a deterministic nearest-anchor
selection rule, **cover-crops backdrops with a fixed anchor**, and recomposes
every child and parent surface at the new dimensions. Phone output remains
visually unchanged.

## Functional Requirements

### FR1 — Design spaces + selection rule

- Six canonical spaces, chosen by viewport aspect:

  | Class | Phone | Tablet 16:10 | Tablet 4:3 |
  | --- | --- | --- | --- |
  | Portrait | 430×860 (0.5) | 800×1280 (0.625) | 960×1280 (0.75) |
  | Landscape | 860×430 (2.0) | 1280×800 (1.6) | 1280×960 (1.333) |

- A pure `fieldSpaceFor(viewportWidth, viewportHeight)` resolves the space:
  orientation class first (the existing `orientationFor` policy — square stays
  portrait), then the anchor that minimizes letterbox; ties resolve to the
  narrower space (documented in the module).
- Expected outcome: **iPad 4:3 and Android 16:10 render with zero bars**;
  Android 3:2 lands on the 16:10 anchor with a bar on each long side (measured
  2026-10-26 on a 1080×1920 viewport: 96 px top and bottom, 5% per side and 10%
  of the area — the authoring estimate said ≈6%, corrected here); phones are
  unchanged (tall phones keep the phone space and their current small bars —
  out of scope).
- The design-space table and selection rule are recorded in `tech-stack.md`
  **before** implementation (workflow.md: Tech Stack is Deliberate).

### FR2 — Reflow plumbing across spaces

- The selected space drives the field rect, canvas backing store, input
  mapping, character canvas and name input. A resize/rotation between any two
  spaces re-selects the space and rebuilds every view instantly.
- `window.__app` gains an additive probe exposing the active space (and the
  existing `field()` reflects it); existing probe contracts are unchanged.
- Tracing progress survives a phone↔tablet rotation (stroke index +
  proportional position within the stroke), as the landscape track established.

### FR3 — Level composition per space

- Every pack's levels compose fit-and-center in all new spaces through the
  existing projection layer; word rows (My Name, `ABC`/`MOM`/`ZOO`) recompose
  **into the active space's box** at the same scale rules as today.
- No glyph exceeds scale 1.0; level geometry stays identical relative to the
  field; level glyphs sit at or above today's size on tablets.
- **Decided 2026-10-06 — magnification scope:** word rows recompose into the
  active space's box. Measured against the shipping composer, a 7-letter name
  scales 0.373 in the portrait 350-unit box used on phones today, 0.767 in a
  slate-portrait 720-unit box, 0.937 in a tablet-portrait 880-unit box and
  1.000 in a landscape tablet 1200-unit box; a 5-letter name scales 0.529 in
  portrait today and 1.000 (the cap) in every other box. Single glyphs and
  every other level keep their authored unit size, centred. **No engine retune is required**, because
  `composeWordRow` caps scale at a single letter's authored size, so no
  geometry ever exceeds the size the tolerance (`FIELD_WIDTH × 0.12` = 51.6
  units) and advance cap (600 units/s) were calibrated against. Magnifying
  single glyphs was rejected: a uniform per-space zoom must fit the tallest
  authored levels, which forces per-level clamping in landscape-oriented tablet
  spaces and would break the packs' authored size ordering. Recorded in
  `tech-stack.md` (dated note, 2026-10-06). The row's vertical band inside a
  larger box needs screenshot and device sign-off, so it ships as its own task.

### FR4 — Backdrop and art fit (cover-crop, fixed anchor)

- Backdrop images draw **cover-cropped** to the field under a fixed anchor
  policy that holds the character's ground line and the horizon in place;
  no bars, gaps or visible seams inside the field.
- Success wash, confetti and particles cover the field at every space.
- Per-skin backdrop results are screenshot-approved (all six skins).

### FR5 — Child surfaces at tablet spaces

- Menu (card grid/wrap, dot strips, pager band, gate corner, skin button,
  mascot park), pack screens (per-pack grids, pagers, sticker shelves, badge
  seals, home), the sticker board, success, badge and splash all recompose
  in-bounds at every new space.
- The 90 px design touch-target floor is held at tablet scales.

### FR6 — Parent surfaces at tablet spaces

- Parent zone (nine controls + trophies), the name overlay (DOM input
  placement, keyboard safety, iOS no-zoom) and the install panel recompose for
  the new spaces.

### FR7 — QA and evidence

- Unit tests: space selection incl. ties and squares; in-bounds layout per
  space; composition/projection into tablet boxes; progress-preserving reflow;
  cover-crop/anchor math.
- New canonical `dev/qa/qa-tablet.mjs`: 4:3 + 16:10 × portrait/landscape
  per-screen matrix with screenshots, rotate mid-trace and mid-menu with
  progress/state assertions, field-fill assertions (bars ≤ documented
  tolerance) and target-size assertions. `qa-landscape` stays canonical and
  must remain green.
- Device pass: **iPad + Android tablet** (owner-confirmed), plus a phone
  regression pass.

### FR8 — Docs and housekeeping

- `tech-stack.md` (spaces, selection rule, backdrop anchor policy),
  `product.md` (feature + dated note), `dev/README.md` probe table;
  `pnpm budget` re-recorded (no new shipped assets expected).

## Non-Functional Requirements

- Coverage >80% on new logic; `pnpm check && pnpm test` green; TDD per task
  with a commit and a git note per task, per `workflow.md`.
- Zero new dependencies; zero runtime network; offline cold start unaffected;
  **save schema unchanged (v3, no new fields)**.
- Zero-text child surfaces preserved; 90 px design target floor held at tablet
  scales (any exception device-verified and documented).
- No new shipped assets expected → within the current 6.00 MB / 200 ceilings;
  phone dist unchanged.
- **Phone portrait and phone landscape output remains pixel-identical to the
  v1.7.0 baseline** (screenshot regression).
- Rotation reflow is visually instant (same-frame re-lay; no flicker, no blank
  frame).

## Acceptance Criteria

1. Every screen fills the viewport on iPad 4:3 and Android 16:10, in both
   orientations — no bars beyond the documented tolerance (zero at exact-anchor
   ratios), with per-screen screenshots.
2. Measured dead space on a 1024×1366 viewport drops from ~170 px per side
   (~33%) to zero.
3. All child screens are in-bounds with target floors held at every new space.
4. Rotating mid-trace across phone↔tablet spaces loses no progress and does not
   crash; the reflow is instant.
5. Backdrops cover the field with the anchor held (ground line, horizon),
   verified per skin.
6. Phone portrait **and** phone landscape are unchanged vs the v1.7.0 baseline
   (screenshot regression).
7. Parent zone, name overlay and install panel are usable at tablet sizes and
   the keyboard never covers the field.
8. `qa-tablet` matrix green, `qa-landscape` still green, zero-text audit passes,
   offline cold start unaffected, budget within ceilings.
9. Unit coverage >80% on new logic; docs synced; review passed; device pass
   owner-confirmed (iPad + Android tablet).

## Out of Scope

Tall-phone (>2:1) residual bars · continuous aspect-matched field fit ·
landscape phone re-architecture · new art generation (except the documented
fallback) · new packs or skins · menu or parent-zone redesign · sticker book ·
engine gameplay changes (tolerance/speed/assists) · save schema changes ·
accounts/cloud/monetization · desktop/ultrawide targets.

## Decisions & Fallbacks

- **Six canonical spaces + nearest-anchor selection** — chosen over continuous
  aspect matching so the QA matrix stays finite and deterministic and phone
  output stays provably identical.
- **Cover-cropped backdrops with a fixed anchor** — no new assets and no
  Workers AI spend. *Fallback:* if one backdrop crops badly at tablet aspect
  (a character-adjacent detail is lost), re-render that single image through
  the img2img pipeline with owner approval and a fresh budget measurement.
- *Fallback:* a surface that resists adaptation late in the track may hold its
  phone composition centered inside the tablet field, **explicitly listed**
  (target: none), rather than blocking the track.
- Square viewports stay portrait-class (existing policy) and take the nearest
  portrait anchor.
