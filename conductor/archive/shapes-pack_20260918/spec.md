# Spec: Shapes pack — the sixth pack as JSON + menu overflow paging

**Track ID:** `shapes-pack_20260918`
**Type:** Feature
**Branch:** `track/shapes-pack`
**Created:** 2026-09-18

## Overview

The declarative pack pipeline (tracks `pack-pipeline` / `pack-pipeline-2`) turned new content into data + art. This track delivers the next content expansion: a **Shapes pack** — 8 shape-tracing levels with object-per-shape rewards — plus the deliberately deferred **menu overflow paging**, so the menu's 6-card capacity is never a ceiling for future packs. After this track: five packs live (Pre-writing · Numbers · Letters · Shapes · My Name), every static pack ships as validated JSON, and adding content is authoring + `pnpm pack:check`.

## Locked design decisions

- **Pack:** `shapes` in `src/packs/data/shapes.json` (file-name-equals-id convention); `badgeId: "shapes-badge"`; `menuFill: "#b8a9e8"` (soft lavender — distinct from existing card pastels; tunable at owner card-art approval); **no bonuses** (Numbers precedent).
- **Levels:** 8 levels `shape-1`…`shape-8`, pedagogical ramp — circle → square → triangle → oval → diamond → heart → star → plus. Single closed strokes for circle/square/triangle/oval/diamond/heart; **star = 2 strokes** (upper + lower outline halves), **plus = 2 strokes** (vertical + horizontal). Geometry authored in the 430×860 field space per `src/packs/data/README.md`.
- **Rewards — object-per-shape** (owner-approval gate per asset batch, teddy precedent): circle→ball · square→window · triangle→tent · oval→egg · diamond→kite · heart→heart balloon · star→night-sky star · plus→airplane. Each level: goal art + sticker; plus pack card art + badge — **~18 new WebP assets** through the existing pipeline (generate → cutout → WebP).
- **Menu:** order Pre-writing · Numbers · Letters · **Shapes** · My Name (name runtime-conditional).
- **Paging (deferred work, folded in):** when card count exceeds `MENU_CARD_CAPACITY` (6), the menu paginates — zero-text pager (tap arrows + page dots, letters-pack pattern), one full fit-to-floors page at a time. At ≤ 6 cards behavior and pixels are unchanged (fidelity lock). The graceful-degrade path becomes the pager.
- **Save:** no schema change — pack-owned progress, stickers, badge are generic.
- **Working agreement:** all work stays local on `track/shapes-pack` — no push/PR/release.

## Functional Requirements

### FR1 — Shapes pack as JSON
`shapes.json` is the content source of truth; `src/packs/shapes.ts` becomes a thin loader over `parsePackJson` (Numbers pattern), preserving pack/level exports; malformed content throws labeled load-time errors (parser-provided).

### FR2 — Registration + menu card
Catalog registration places `shapes` between `abc` and the runtime `name`; menu card uses the new card art + `menuFill`; locked/unlock semantics identical to other static packs.

### FR3 — Menu overflow paging
`menu.ts` gains a pager: counts ≤ 6 render exactly as today (fidelity-locked, existing tests untouched); counts ≥ 7 paginate with page capacity = full floors fit, zero-text prev/next affordances + page dots inside the field, ≥ 90px targets; hit parity and zone semantics (parent gate precedence) preserved; tests extend the count × orientation matrix.

### FR4 — Reward art batch
Goal art + sticker per level, card art, badge — WebP per the shipped-raster policy; owner screenshot approval before each batch lands in `src/packs/data` references / art registry.

### FR5 — Generic surfaces verified for a 5-pack world
Sticker board, badge award, success screen, pack screen (grid + shelf), `?pack=shapes` preview all work with the new pack with zero per-pack special-casing (tests assert generic behavior).

### FR6 — QA + evidence
`CI=true pnpm check` + `CI=true pnpm test` + `pnpm pack:check` + `pnpm build` + `pnpm budget` green; QA sweeps on a fresh build: app journey, shapes sweep (all 8 levels traced), `qa-pack-preview --all`, `qa-landscape` spot (both orientations), zero-text audit, offline cold start; dist/precache deltas recorded.

### FR7 — Docs resync
`conductor/tech-stack.md` + `conductor/product.md` dated notes; `src/packs/data/README.md` pack list; `dev/README.md` harness/QA notes.

## Non-Functional Requirements

- **Budget:** re-measured after the art batch; if the 5.00 MB ceiling is hit, ceilings are raised **deliberately with measured evidence** (documented), never silently.
- **Quality:** >80% coverage on changed modules; zero-text child surfaces; 90px+ targets; calm motion; no new runtime dependency; offline/precache unchanged beyond content delta.
- **Devices:** owner device pass (Android + iPad) before close, per project practice.

## Acceptance Criteria

1. All 8 shape levels validate via `pnpm pack:check` and trace cleanly in both orientations (preview sweep + device).
2. Menu shows the Shapes card 4th (before My Name) with approved card art; at current counts pixel-identical layout (fidelity tests).
3. Pager verified: synthetic 7-card preview paginates zero-text in both orientations; ≤ 6 cards unchanged (tests + screenshots).
4. Goal art + stickers + badge approved and shipped; sticker board pop/notes work for all 8 shape stickers.
5. Save round-trips: progress, stickers, badge for `shapes` without schema change; reset-progress unaffected.
6. Full gates green; budget delta recorded; docs resynced.
7. All work stays local on `track/shapes-pack`.

## Out of Scope

Lowercase letters/phonics · new skins (trex already in flight) · save-schema changes · engine/assists changes · parent zone · release/version bump/PR decisions (owner's).
