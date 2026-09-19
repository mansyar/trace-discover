# Plan: Patterns pack — pre-writing part 2 (loops, spirals, stairs)

**Track ID:** `patterns-pack_20260920`
**Branch:** `track/patterns-pack`
**Spec:** [spec.md](./spec.md)
**Created:** 2026-09-20

---

## Phase 1 — Parser stroke extension + patterns pack content + registration

- [ ] Task: Write failing tests for the new stroke labels (Red)
  - [ ] Test: parser/json suite (`src/packs/json.test.ts`) — `loop`, `spiral`, `stairs` accepted; unknown labels still rejected with the labeled error
  - [ ] Run `CI=true pnpm test -- src/packs/json.test.ts` and confirm RED
- [ ] Task: Write failing tests for the patterns pack loader (Red)
  - [ ] Test: `src/packs/patterns.test.ts` — `PATTERNS_PACK` identity (`id: "patterns"`, `badgeId: "patterns-badge"`, `menuFill: "#8fd6c8"`, no bonuses), 9 levels `pattern-1`…`pattern-9` in locked order (size-major, pre-pack convention: loop/spiral/stairs × small → medium → large), per-level `stroke` label, stroke-count expectations, valid geometry per parser rules (margins, ≥2 points, no duplicate consecutive points), labeled load-time error on a malformed fixture
  - [ ] Run `CI=true pnpm test -- src/packs/patterns.test.ts` and confirm RED
- [ ] Task: Implement (Green)
  - [ ] Extend `STROKE_PATTERNS`/`StrokePattern` additively in `src/packs/parser.ts` (no behavioral branching exists on the label — verified)
  - [ ] Author `src/packs/data/patterns.json` — 430×860 field geometry, size bands mirroring the pre pack (small ≈145–285, medium ≈100–330, large ≈60–370); stairs keep flats straight via edge midpoints; spirals sized to stay inside margins
  - [ ] Create `src/packs/patterns.ts` thin loader over `parsePackJson` (shapes.ts pattern)
  - [ ] Ship placeholders at the final art URLs (adapt `dev/tools/animals-placeholders.mjs`): 9 goal + 9 sticker + `card-patterns.webp` + `patterns-badge.webp` — so the `artRefs.test.ts` invariant resolves
  - [ ] Run the full suite; confirm GREEN
- [ ] Task: Register the pack (TDD)
  - [ ] Red: failing tests asserting `patterns` appends after `animals` and before the runtime `name` pack (with and without a saved name); pack screen grid config test
  - [ ] Green: catalog registration + `PACK_GRID` entry mirroring `pre` (columns 3; landscape 6 cols/12 slots); no other menu changes (6 static cards fit the 6-card capacity; a saved name pushes to page 2 via the shipped pager)
- [ ] Task: Validate content via tooling
  - [ ] `pnpm pack:check` passes over the directory incl. `patterns.json`
  - [ ] Dev preview renders `?pack=patterns` (all 9 levels) portrait + landscape with correct markers; screenshots reviewed
- [ ] Task: Commit + checkpoint
  - [ ] Commit code (`feat(packs): add patterns pack as validated JSON`), attach git note with task summary
  - [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Reward art batch (goal art, stickers, card, badge)

- [ ] Task: Author the asset pipeline batch
  - [ ] Generate → cutout → WebP per level: 9 goal + 9 stickers (playground & garden mapping: yo-yo / hula hoop / jump rope (loops), snail / pinwheel / rose (spirals), step ladder / slide steps / treehouse ladder (stairs); final set locked at art review)
  - [ ] Pack card art + `patterns-badge` badge art
  - [ ] Owner screenshot approval gate per asset (teddy/shapes precedent) — record approvals in the plan
- [ ] Task: Swap art into place + budget re-measure
  - [ ] Bytes swapped at the identical placeholder URLs (no reference changes); confirm GREEN
  - [ ] `pnpm build` + `pnpm budget`; record dist/precache deltas vs baseline **5,630,286 B / 177 entries** — expected ≈ +200–240 KB / +20 entries (≈5.87 MB / 197) under the 6.00 MB / 200 ceilings
  - [ ] If a ceiling is exceeded: raise deliberately with measured evidence (documented in the dist-budget history comment + tech-stack note), never silently
- [ ] Task: Commit + checkpoint
  - [ ] Commit code (`feat(packs): patterns reward art batch`), attach git note with task summary
  - [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Generic surfaces, QA sweeps, docs, closeout

- [ ] Task: Verify pack-generic surfaces with zero special-casing (tests)
  - [ ] Sticker board: 9 pattern stickers pop/notes; shelf pulse; badge award on completion; success screen
  - [ ] Save round-trip: progress/stickers/badge for `patterns`; reset-progress unaffected; no schema change
- [ ] Task: QA sweeps on a fresh production build
  - [ ] `CI=true pnpm check && CI=true pnpm test && pnpm pack:check && pnpm build && pnpm budget` — all PASS
  - [ ] Create `dev/qa/qa-patterns-sweep.mjs` (from `qa-shapes-sweep.mjs`) — trace all 9 levels to success + badge seal
  - [ ] `qa-pack-preview --all` (incl. 9 new levels); `qa-landscape` spot (rotation mid-spiral keeps progress); zero-text audit; offline cold start
  - [ ] Evidence (commands + outcomes) recorded in the plan
- [ ] Task: Docs resync
  - [ ] `conductor/tech-stack.md`: dated note — Patterns pack (data + art), parser stroke-label extension, budget delta
  - [ ] `conductor/product.md`: dated note — Patterns pack in the product story; packs list updated
  - [ ] `src/packs/data/README.md`: production pack list (pre, numbers, abc, shapes, animals, patterns)
  - [ ] `dev/README.md`: preview/QA notes for patterns; level counts; stale budget line fix
  - [ ] Root `README.md`: stale "five characters × three packs" line corrected (six skins × six packs)
- [ ] Task: Owner device pass (Android + iPad)
  - [ ] Patterns journey traced unaided; menu/pager; sticker board tap; sound check; independent-play observation session with friction notes
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
