# Plan: Shapes pack — the sixth pack as JSON + menu overflow paging

**Track ID:** `shapes-pack_20260918`
**Branch:** `track/shapes-pack`
**Spec:** [spec.md](./spec.md)
**Created:** 2026-09-18

---

## Phase 1 — Shapes pack content + registration `[checkpoint: 00055c3]`

- [x] Task: Write failing tests for the shapes pack loader (Red)
  - [x] Test: `src/packs/shapes.test.ts` — `SHAPES_PACK` identity (`id: "shapes"`, `badgeId: "shapes-badge"`, `menuFill: "#b8a9e8"`, no bonuses), 8 levels `shape-1`…`shape-8` in the locked order (circle, square, triangle, oval, diamond, heart, star, plus), stroke-count expectations (star 2, plus 2, others 1), valid geometry (per parser rules), labeled load-time error on a malformed fixture
  - [x] Run `CI=true pnpm test -- src/packs/shapes.test.ts` and confirm RED
- [x] Task: Implement the pack (Green)
  - [x] Author `src/packs/data/shapes.json` (geometry in the 430×860 field space per `src/packs/data/README.md`; goalArt paths follow the letters convention)
  - [x] Create `src/packs/shapes.ts` as a thin loader over `parsePackJson` (Numbers pattern), preserving the tested exports
  - [x] Run the full pack suite; confirm GREEN
- [x] Task: Register the pack + menu card position (TDD)
  - [x] Red: failing tests asserting `shapes` sits between `abc` and the runtime `name` in menu order (with and without a saved name) and renders a card with the pack's art/menuFill
  - [x] Green: catalog registration + menu card wiring (no other menu changes)
- [x] Task: Validate content via tooling
  - [x] `pnpm pack:check` passes over the 4-pack directory (incl. `shapes.json`)
  - [x] Dev preview renders `?pack=shapes` (all 8 levels) at 430×860 with correct markers; screenshots reviewed
- [x] Task: Commit + checkpoint
  - [x] Commit code (`feat(packs): add shapes pack as validated JSON`), attach git note with task summary
  - [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Menu overflow paging

- [x] Task: Write failing tests for the pager (Red)
  - [x] Test: counts ≤ 6 render exactly as today — fidelity-locked rects (existing suite untouched and green)
  - [x] Test: synthetic 7–9 cards paginate — one full fit-to-floors page at a time; page capacity = floors fit; page dots + zero-text prev/next affordances inside the field; ≥ 90px targets
  - [x] Test: hit parity (only visible-page cards hit; arrows/dots hit regions) + zone semantics (parent gate precedence preserved)
  - [x] Test: both orientations covered (count × orientation matrix extension)
  - [x] Run suite; confirm RED for pager behavior
- [x] Task: Implement the pager (Green)
  - [x] Extend `menu.ts` layout math: page state + per-page card rects (capacity = full floors fit), pager affordance geometry
  - [x] Wire pager interaction in `src/main.ts` / render painting in `src/app/render.ts`; zero-text; calm motion
  - [x] Run suite; confirm GREEN
- [x] Task: Dev harness preview
  - [x] Extend the synthetic-count preview (2–9 cards × both orientations) via `dev/harness/screens.html` + `src/dev/screens.ts`; screenshot matrix reviewed (incl. 7-card paging cases)
  - [x] Documented in `dev/README.md`
- [x] Task: Commit + checkpoint
  - [x] Commit (`feat(ui): menu overflow paging beyond the six-card capacity`), attach git note
  - [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Reward art batch (goal art, stickers, card, badge)

- [ ] Task: Author the asset pipeline batch
  - [ ] Generate → cutout → WebP per level: 8 goal art + 8 stickers (object-per-shape mapping from spec; pipeline emitters default WebP)
  - [ ] Pack card art + `shapes-badge` badge art
  - [ ] Owner screenshot approval gate per asset (teddy precedent) — record approvals in the plan
- [ ] Task: Wire art into content + registry (TDD where code)
  - [ ] Red: extend art-reference tests (`artRefs.test.ts` pattern) asserting every shape level's goalArt/sticker path exists as a shipped asset; card/badge references resolve
  - [ ] Update `shapes.json` goalArt references; confirm GREEN
- [ ] Task: Budget re-measure
  - [ ] `pnpm build` + `pnpm budget`; record dist/precache deltas vs the pre-track baseline in the plan
  - [ ] If the 5.00 MB ceiling is exceeded: raise ceilings deliberately with measured evidence (documented in tech-stack note), never silently
- [ ] Task: Commit + checkpoint
  - [ ] Commit (`feat(packs): shapes reward art batch`), attach git note
  - [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — Generic surfaces, QA sweeps, docs, closeout

- [ ] Task: Verify pack-generic surfaces with zero special-casing (tests)
  - [ ] Sticker board: 8 shape stickers pop/notes on the board (generic behavior asserted)
  - [ ] Badge award on pack completion; success screen; pack screen grid + shelf
  - [ ] Save round-trip: progress/stickers/badge for `shapes`; reset-progress unaffected; no schema change
- [ ] Task: QA sweeps on a fresh production build
  - [ ] `CI=true pnpm check && CI=true pnpm test && pnpm pack:check && pnpm build && pnpm budget`
  - [ ] App journey sweep; shapes sweep (trace all 8 levels to success); `qa-pack-preview --all`; `qa-landscape` spot (both orientations); zero-text audit; offline cold start
  - [ ] Evidence (commands + outcomes) recorded in the plan
- [ ] Task: Docs resync
  - [ ] `conductor/tech-stack.md`: dated note — Shapes pack (data + art), menu pager (capacity rule now "pages beyond 6"), budget delta
  - [ ] `conductor/product.md`: dated note — Shapes pack live in the product story; packs list updated
  - [ ] `src/packs/data/README.md`: production pack list (pre, numbers, abc, shapes)
  - [ ] `dev/README.md`: preview/QA notes for shapes + paging matrix
- [ ] Task: Owner device pass (Android + iPad)
  - [ ] Shapes journey traced unaided; menu/pager visual check both orientations; sticker board tap; sound check
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Review Fixes

*(appended by `conductor-review` when a review identifies corrections)*
