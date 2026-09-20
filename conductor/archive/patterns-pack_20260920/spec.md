# Spec: Patterns pack — pre-writing part 2 (loops, spirals, stairs)

**Track ID:** `patterns-pack_20260920`
**Branch:** `track/patterns-pack`
**Type:** Feature
**Created:** 2026-09-20

## 1. Overview

Add a sixth static content pack, **Patterns**, extending the pre-writing ladder after line/wave/arc/zigzag. It ships **9 levels: three motifs × three sizes** (`loop`, `spiral`, `stairs`), each with a playground/garden object reward. Pure content-pipeline work: new pack JSON + thin loader + one additive parser enum extension + a 20-file art batch. No engine, save-schema, or layout-engine changes. Branch `track/patterns-pack` (created on `7fd62f2`).

## 2. Functional Requirements

- **FR1 — Pack content:** `src/packs/data/patterns.json`, id `patterns`, levels `pattern-1`…`pattern-9`; motifs `loop`, `spiral`, `stairs` × sizes small/medium/large (geometry bands mirror the pre pack's small/medium/large). No bonus levels (shapes/animals precedent).
- **FR2 — Level labels:** each level's `stroke` field carries its motif label; parser gains `'loop' | 'spiral' | 'stairs'` **additively** in `STROKE_PATTERNS`/`StrokePattern` (no behavioral branching exists on the label — verified).
- **FR3 — Registration:** thin loader `src/packs/patterns.ts` (shapes.ts precedent) + `PATTERNS_PACK` appended to the catalog after Animals (creation-order convention); `badgeId: "patterns-badge"`.
- **FR4 — Gameplay parity:** each level traces with the existing multi-stroke engine — start star, hand hint, nudge, 6 checkpoints → chime, completion celebration, sticker award, pack badge on full completion. Zero text; zero failure states.
- **FR5 — Screens:** pack screen mirrors the pre pack's grid configuration (3-column portrait; landscape grid consistent with shipped packs); menu shows 6 static cards (name set → paginates to page 2 using the shipped pager).
- **FR6 — Art batch (playground & garden):** 9 goal WebPs (`/art/goal/pattern-N.webp`), 9 sticker WebPs (`/art/sticker/pattern-N.webp`), card `card-patterns.webp`, badge `patterns-badge.webp` — consistent WebP quality policy, owner approval gate at preview screenshots. Reward mapping (final set locked at art review): yo-yo / hula hoop / jump rope (loops), snail / pinwheel / rose (spirals), step ladder / slide steps / treehouse ladder (stairs).
- **FR7 — QA:** `pnpm pack:check` covers the new pack; `qa-pack-preview --all` sweep includes the 9 levels; rotation/landscape reflow spot-checked on a spiral level; smoke journey unchanged.
- **FR8 — Docs:** product.md pack list + track log entry; dev/README QA/level-count references; root README stale line ("five characters × three packs") corrected as part of this content change.

## 3. Non-Functional Requirements

- **NFR1 — Budget:** remains within existing ceilings — **6,000,000 B / 200 entries, no re-anchor**: predicted ≈ +200–240 KB / +20 entries → ≈5.87 MB / 197 entries (final measured at the budget gate).
- **NFR2 — Offline:** all new assets precached; no network at runtime.
- **NFR3 — Save compatibility:** no schema change; new ids are additive; existing saves unaffected.
- **NFR4 — Quality gates:** `pnpm check`, `pnpm test --coverage` (thresholds hold), `pnpm build`, `pnpm budget` all green; ≥80% coverage on new code (loader is declarative).

## 4. Acceptance Criteria

- [ ] `pnpm pack:check` validates patterns.json; parser rejects still-unknown stroke labels and accepts the three new ones (tested).
- [ ] All 9 levels playable start→finish in portrait **and** landscape; sticker + board + badge flow works; badge awarded after level 9.
- [ ] Menu: 6 cards render; with a saved name, pager appears and navigates correctly.
- [ ] Budget gate passes without ceiling changes; measured numbers recorded.
- [ ] Owner device pass (Android + iPad) and an independent-play observation session with friction notes.
- [ ] Docs updated; no text appears on any child-facing surface.

## 5. Out of Scope

- Rainbows & wave-run motifs (deferred — future "Patterns, Part 2" candidates).
- Bonus levels for this pack; engine/assist changes; new skins; save schema changes; ceiling re-anchors; anything in product.md's global out-of-scope (lowercase/phonics, accounts, voice, store, parent dashboards).
