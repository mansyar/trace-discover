# Spec: Menu capacity headroom — six-card dynamic-fit menu

**Track ID:** `menu-capacity_20260917`
**Type:** Chore
**Branch:** `track/menu-capacity`
**Created:** 2026-09-17

## Overview

Every static content pack is now validated JSON, so the next content track is authoring + art — but the menu cannot show a fourth pack. With My Name saved, today's 4 cards become 5 the moment a pack is added, and 5 cards overflow **both** orientations (portrait stack 5×150 + 4×30 = 870 > 860 field; landscape two-column wrap 3×150 + 2×30 = 510 > 430 field). This chore makes the menu **dynamic-fit**: it comfortably holds up to **six** pack cards (five static packs + the runtime My Name card) in both orientations by growing columns first and shrinking secondarily within floors. Today's look stays visually identical at current counts (≤ 4 cards). No new content, art, save, or engine changes — this is the capacity unblocker that lets future pack tracks stay pure pipeline work.

## Locked design decisions

- **Capacity:** **6 cards** in both orientations — including the runtime My Name mini-pack (so 5 static packs + name). Design fields: portrait 430×860 / landscape 860×430.
- **Dynamic fit, columns first:** portrait stays a full-width single-column stack through 4 cards, then reflows to a centered 2-column grid at 5–6 (row-major, last-row centering). Landscape keeps the single row / 2-column wrap rules, extending to a 3-column wrap when needed. Height/gap/side-margin shrink is a secondary lever, within floors.
- **Fidelity:** card rects visually identical at 1–4 cards in both orientations (position/size and look); existing screenshot approvals stay valid.
- **Floors:** the existing hard floor holds — every card ≥ 90px on both dims (test-locked), fully inside the field, never overlapping another card (test-locked). Zone semantics match the shipped menu: the invisible parent-gate corner and the decorative mascot park may sit over a card exactly as at today's counts, with parent-gate input precedence and edge-inclusive hit parity preserved (fidelity lock). Dot strips and card art stay clear of each other; dot radius/spacing may scale within legibility floors.
- **Beyond 6:** graceful degrade — the layout keeps fitting to floors without overflow/overlap; tests lock 2–6 crisp and 7+ degrade; docs flag paging as a future track if capacity is ever exceeded. No paging now.
- **Evidence:** dev-only harness preview with synthetic card counts (2–6, both orientations) + screenshot matrix; layout unit tests extend the existing 90px / inside-field / no-overlap suite into a count × orientation matrix.
- **No new art/assets**, no pack registration changes, no save/schema, no engine/assists, no pack-screen changes.
- **Working agreement:** all work stays local on `track/menu-capacity` — no push/PR/release.

## Functional Requirements

### FR1 — Dynamic card layout (pure math, both orientations)

`menuLayout()` returns centered, gap-scaled card rects for any count 1–6: portrait — full-width single-column stack (≤4), centered 2-column grid (5–6, row-major order, last-row centering); landscape — single row when cards stay toddlers-wide, else 2-column, else 3-column wrap. Deterministic; no viewport access; shrink only as the secondary lever when columns alone cannot fit.

### FR2 — Zones & hit parity

Park position and parent-gate zone are preserved (gate stays top-right, 100×100); card/zone overlaps match the shipped menu exactly (fidelity-locked rects at today's counts — the gate corner or the decorative park may sit over a card as today, with parent-gate input precedence intact); `hitMenuCard` returns exactly the rendered rects (edge-inclusive) at every count/orientation, so every card remains a ≥ 90px toddler target.

### FR3 — Dots & art adapt to scaled footprints

`menuDotPositions` / `dotsPerRow` / `menuCardArtMaxHeight` keep working for grid-scaled cards: dot rows wrap as today, radius/spacing may scale within legibility floors, all dots stay inside the card; no dot clipping and no art/dot overlap at 5–6 cards; art max-height never goes negative.

### FR4 — Consumers unchanged in shape

`src/main.ts` menu wiring, `src/app/render.ts` painting, and `src/dev/screens.ts` consume the layout output as the single source of rects; no screen-state, session, or pack-registry changes.

### FR5 — Dev harness preview (dev-only)

A dev-only parameter renders the menu with N synthetic cards (2–6) in both orientations via `dev/harness/screens.html` + `src/dev/screens.ts` (used for the screenshot matrix); never reachable from child surfaces; documented in `dev/README.md`.

### FR6 — Capacity-lock tests

Extend `src/ui/menu.test.ts`: matrix for counts 1–6 × both orientations (fit inside field, ≥ 90px both dims, no card/card overlap, shipped zone semantics at the fidelity-locked counts, hit parity, dots/art sane); **fidelity lock** — current-count rects unchanged vs recorded expectations; beyond-capacity (7–8) asserts graceful fit-to-floors without overflow/overlap; a registered-static-pack-count guard documents the supported limit.

### FR7 — QA & evidence

Harness screenshot matrix (3–6 cards × portrait/landscape, including the name-card case) reviewed; spot re-run of `qa-screens` / `qa-landscape` at current counts shows no visual change; evidence (commands + outcomes + chosen floors) recorded in the plan and git note. Zero-text audit unchanged; offline/precache unaffected.

### FR8 — Docs resync (before implementation)

`conductor/tech-stack.md`: dated note — dynamic-fit menu (capacity 6, column-growth rules, floors, degrade rule). `dev/README.md`: harness parameter + QA notes. `product.md` only if a child-visible claim changes — expected: none.

## Non-Functional Requirements

- **No payload impact:** no new assets; dist size / precache entries recorded and ~unchanged.
- **Perf:** layout stays cheap per-frame math; no measurable boot/render regression.
- **Quality:** >80% coverage on changed modules; full suite green; `pnpm check` clean; CI-aware commands.
- **Guidelines:** 90px+ touch floors, zero-text, calm motion; current-count look pixel-faithful.
- **Determinism:** pure layout math; no device-specific branching beyond orientation.

## Acceptance Criteria

1. Six cards (including name) render cleanly in both orientations — screenshot matrix approved; no overflow; cards never overlap each other and rects match the locked geometry incl. shipped zone semantics (gate/park may sit over a card exactly as today); art + dots legible.
2. Current counts (3 packs; 4 with name) visually identical to pre-track screenshots (fidelity lock test + visual spot check).
3. Layout tests green for the 1–6 matrix, hit parity, and beyond-capacity degrade; registered-pack guard documented.
4. Harness supports synthetic 2–6 card previews (both orientations), documented in `dev/README.md`.
5. `CI=true pnpm check && CI=true pnpm test` and `pnpm budget` green; dist delta recorded (~neutral).
6. QA evidence recorded; zero-text audit passes; offline behavior unchanged.
7. Docs resynced (tech-stack note, dev README).
8. All work stays local on `track/menu-capacity` — no push/PR/release.

## Out of Scope

New packs/content or registration (next pipeline tracks) · paging/scrolling/gestures beyond graceful degrade · pack-screen, level, success, or pack-card art changes · new art/assets · save schema or progress changes · tracing engine/assists · skins/instruments · parent zone · release/version bump/PR.
