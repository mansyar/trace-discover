# Spec: Animal outlines pack — eight organic silhouettes as validated JSON

**Track ID:** `animal-outlines_20260919`
**Type:** Feature
**Branch:** `track/animal-outlines`
**Created:** 2026-09-19

## Overview

The declarative pack pipeline turned new content into data + art (`pack-pipeline`, `pack-pipeline-2`, `shapes-pack`). This track adds the next content expansion: an **Animals pack** — 8 animal-outline tracing levels where the traced path is the animal's silhouette and the animal waits at the goal in a per-animal mini-habitat. After this track: six menu entries live (Pre-writing · Numbers · Letters · Shapes · Animals · My Name) — with a saved name the menu holds exactly one full 6-card page — and the pack ships with no engine, save, or progress changes.

## Locked design decisions

- **Pack:** `animals` in `src/packs/data/animals.json` (file-name-equals-id); `badgeId: "animals-badge"`; `menuFill: "#f4a6a0"` (coral — distinct from the five current fills; tunable at owner card-art approval); **no bonuses** (Numbers/Shapes precedent).
- **Levels:** 8 levels `animal-1`…`animal-8`, ramp simple → detailed: **fish → ladybug → duck → turtle → bunny → cat → butterfly → elephant**. Level ids use the singular `animal-` prefix on purpose: the legacy save migration already maps `animals-1..4` to pre-writing, so the plural namespace stays reserved.
- **Outlines:** anatomy-driven stroke structure — one flowing closed outline where the silhouette is clean (duck, turtle, bunny, cat, elephant), 2–3 strokes where nature asks (fish body + tail/fin; ladybug dome + head line; butterfly upper + lower wings). Geometry is **reference-traced** (owner decision 2026-09-19, after hand-placed control points read poorly): generated side-view references → contour tracing → simplified control points; the traced contours were owner-approved from `dev/qa/out/animals-contact.png`. Butterfly re-pinned from the draft's “mirrored wings + body” to 2 strokes (upper/lower wings) because a traced silhouette can only split at natural wing notches — star/plus multi-stroke precedent. Each stroke keeps its own start star (per-stroke frontier). Exact stroke counts and control points are locked in `dev/harness/pack.html` with owner approval during authoring.
- **Geometry:** authored in the 430×860 portrait field per `src/packs/data/README.md` (24-pt margin, ≥2 control points per stroke, Catmull-Rom smoothing); consistent generous sizing (~300–420 pt outlines) — difficulty comes from outline detail, not size; runtime reflows to landscape like every pack.
- **Rewards:** animal **visible at the goal** in a per-animal mini-habitat vignette (fish in a pond, duck by the reeds, bunny at a burrow, cat in a basket…); sticker = full-body chibi cutout in house style (thick navy outline, pastel fill); card art = animal group scene (2–3 animals); badge = paw-print medallion. ~18 new WebP assets through the shipped pipeline (generate → cutout → WebP), owner screenshot approval per batch (teddy/shapes precedent).
- **Menu:** order Pre-writing · Numbers · Letters · Shapes · **Animals** · My Name (name runtime-conditional); at ≤6 cards behavior is unchanged — paging remains tested headroom (`qa-menu-capacity`).
- **Save:** no schema change — pack-owned progress, stickers, badge are generic.
- **Working agreement:** all work stays local on `track/animal-outlines` — no push/PR/release.

## Functional Requirements

**FR1 — Animals pack as JSON.** `animals.json` is the content source of truth; `src/packs/animals.ts` is a thin loader over `parsePackJson` (Numbers/Shapes pattern), preserving pack/level exports; malformed content throws labeled load-time errors; `pnpm pack:check` validates it in CI.

**FR2 — Registration + menu card.** Catalog registration places `animals` between `shapes` and the runtime `name`; menu card uses approved card art + `menuFill`; completion/badge semantics identical to other static packs (badge on completing the 8 main levels; no bonuses, no unlock thresholds).

**FR3 — Eight organic animal outlines.** Levels ramp fish → ladybug → duck → turtle → bunny → cat → butterfly → elephant; every control point inside the 24-pt margin; anatomy-driven stroke structure with per-stroke start stars; both orientations trace cleanly (runtime reflow); each path approved in `dev/harness/pack.html?pack=animals&level=animal-N` during authoring.

**FR4 — Reward art batch.** Goal art (mini-habitat with the animal visible) + full-body chibi sticker per level; card group scene; paw-print badge — WebP per the shipped-raster policy; owner screenshot approval before references land.

**FR5 — Generic surfaces verified for a 6-entry menu.** Sticker board, badge award, success screen, pack screen (grid + shelf), `?pack=animals` preview all work with the new pack with zero per-pack special-casing (tests assert generic behavior); pack screen grid config added only via the existing generic config shape.

**FR6 — QA + evidence.** `CI=true pnpm check` + `CI=true pnpm test` + `pnpm pack:check` + `pnpm build` + `pnpm budget` green; QA sweeps on a fresh build: app journey, animals sweep (all 8 levels traced), `qa-pack-preview --all` (now 70 levels), `qa-landscape` spot (both orientations), zero-text audit, offline cold start; dist/precache deltas recorded.

**FR7 — Docs resync.** `conductor/tech-stack.md` + `conductor/product.md` dated notes; `src/packs/data/README.md` pack list; `dev/README.md` QA/harness notes.

## Non-Functional Requirements

- **Budget:** ceilings are currently 5.60 MB / 170 precache entries; the last annotated merged build measured 5.42 MB / 159 entries, so this batch (≈ +18 entries and ≈ +0.25 MB by the Shapes precedent) is expected to require a **deliberate, documented re-anchor** — fresh `pnpm build` baseline first, raise only with measurements, trim harder if the batch runs heavy.
- **Quality:** >80% coverage on changed modules; zero-text child surfaces; 90px+ targets; calm motion; no new runtime dependency; offline/precache unchanged beyond the content delta.
- **Devices:** owner device pass (Android + iPad) before close, per project practice.

## Acceptance Criteria

1. All 8 animal levels validate via `pnpm pack:check` and trace cleanly in both orientations (preview sweep + device).
2. Menu shows Animals between Shapes and My Name with approved card art; with a saved name the six cards render as one full page (no pager) — layouts per the tested capacity matrix.
3. Goal vignettes read as mini-habitats with the animal visible; stickers + badge approved and shipped; sticker board pop/notes work for all 8 animal stickers; reset-progress unaffected.
4. Save round-trips: progress, stickers, badge for `animals` without schema change.
5. Full gates green; budget delta recorded (re-anchor documented if taken); docs resynced.
6. All work stays local on `track/animal-outlines`.

## Out of Scope

Lowercase letters/phonics · additional skins · save-schema changes · engine/assists/celebration changes · parent zone · more animals beyond these 8 (future pipeline work) · release/version bump/PR decisions (owner's).
