# Plan: Animal outlines pack — eight organic silhouettes as validated JSON

**Track ID:** `animal-outlines_20260919`
**Branch:** `track/animal-outlines`
**Spec:** [spec.md](./spec.md)
**Created:** 2026-09-19

---

## Phase 1 — Animals pack content + registration

- [x] Task: Record the pre-track budget baseline (fresh build)
  - [x] `pnpm build && pnpm budget` on a clean tree; record total bytes / precache entries (working `dist/` is stale — pre-shapes, no trex; the last annotated merged build was 5,415,327 B / 159 entries)
  - [x] Baseline (fresh build on this branch): **5,415,327 B / 159 precache entries** — matches the last annotated merged figure; PASS vs 5.60 MB / 170. Tight: the animals batch (~18 entries) is expected to exceed the entry ceiling → deliberate re-anchor planned in Phase 2 (grounded in the shapes precedent, +16 entries / +243 KB)
- [x] Task: Write failing tests for the animals pack loader (Red) *(`54318b8`)*
  - [x] Test: `src/packs/animals.test.ts` — `ANIMALS_PACK` identity (`id: "animals"`, `badgeId: "animals-badge"`, `menuFill: "#f4a6a0"`, no bonuses), 8 levels `animal-1`…`animal-8` in the locked order (fish, ladybug, duck, turtle, bunny, cat, butterfly, elephant), stroke structure per the spec's anatomy guidance (exact counts confirmed during harness review; tests updated in that task if a count shifts), valid geometry per parser rules, labeled load-time error on a malformed fixture
  - [x] Run `CI=true pnpm test -- src/packs/animals.test.ts` and confirm RED (confirmed: `Cannot find module './animals'`)
- [x] Task: Implement the pack (Green) *(`d94bdd4`)*
  - [x] Author `src/packs/data/animals.json` (geometry in the 430×860 field space per `src/packs/data/README.md`; `goalArt` at `/art/goal/animal-N.webp`)
  - [x] Create `src/packs/animals.ts` as a thin loader over `parsePackJson` (Numbers/Shapes pattern), preserving the tested exports
  - [x] Run the full pack suite; confirm GREEN (7/7 pack tests; full suite 721/721; `animals.ts` + `animals.json` 100% coverage; `pnpm pack:check` green)
- [~] Task: Harness path review + owner approval
  - [ ] Preview every level via `dev/harness/pack.html?pack=animals&level=animal-N` at 430×860 (plus a landscape spot); iterate control points until each animal reads instantly
  - [ ] Lock stroke counts/control points with owner screenshot approval recorded in the plan
- [ ] Task: Register the pack + menu card position (TDD)
  - [ ] Red: failing tests asserting `animals` sits between `shapes` and the runtime `name` (with and without a saved name) and renders a card with the pack's art/menuFill
  - [ ] Green: catalog registration + menu card wiring (no other menu changes)
- [ ] Task: Validate content via tooling
  - [ ] `pnpm pack:check` passes over the 5-pack directory (incl. `animals.json`)
  - [ ] Dev preview renders `?pack=animals` (all 8 levels) with correct markers; screenshots reviewed
- [ ] Task: Commit + checkpoint
  - [ ] Commit code (`feat(packs): add animals pack as validated JSON`), attach git note with task summary
  - [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Reward art batch (habitats, stickers, card, badge)

- [ ] Task: Author the asset pipeline batch
  - [ ] Generate → cutout → WebP per level: 8 goal habitats (animal visible in a mini-habitat) + 8 full-body chibi stickers; pack card group scene + `animals-badge` paw-print medallion
  - [ ] Owner screenshot approval gate per asset (teddy/shapes precedent) — record approvals in the plan; scripts under `dev/tools/` (resumable batch pattern), intermediates in `dev/art-src/animals/`
- [ ] Task: Wire art into content + registry (TDD where code)
  - [ ] Confirm the art-reference invariant (`artRefs.test.ts`) resolves every `animals` goalArt/sticker/card/badge URL; placeholders ship at final URLs, bytes swapped in place
- [ ] Task: Budget re-measure
  - [ ] `pnpm build` + `pnpm budget`; record dist/precache deltas vs the Phase 1 baseline
  - [ ] If ceilings trip (expected ≈ +18 entries / ≈ +0.25 MB): raise deliberately with measured evidence in the `dev/tools/dist-budget.mjs` history comment, never silently
- [ ] Task: Commit + checkpoint
  - [ ] Commit (`feat(packs): animals reward art batch`), attach git note
  - [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Generic surfaces, QA sweeps, docs, closeout

- [ ] Task: Verify pack-generic surfaces with zero special-casing (tests)
  - [ ] Sticker board: 8 animal stickers pop/notes (generic behavior asserted)
  - [ ] Badge award on completion; success screen; pack screen grid + shelf (portrait defaults + landscape `PACK_GRID` entry only if needed — shapes precedent)
  - [ ] Save round-trip: progress/stickers/badge for `animals`; reset-progress unaffected; no schema change
  - [ ] Menu fidelity: 6-entry menu (with saved name) renders one full page, no pager; 5-entry (no name) unchanged
- [ ] Task: QA sweeps on a fresh production build
  - [ ] `CI=true pnpm check && CI=true pnpm test && pnpm pack:check && pnpm build && pnpm budget` — all PASS
  - [ ] App journey sweep; animals sweep (trace all 8 levels to success — new `dev/qa/qa-animals-sweep.mjs` per the shapes-sweep pattern); `qa-pack-preview --all` (70 levels); `qa-landscape` spot (both orientations); zero-text audit; offline cold start
  - [ ] Evidence (commands + outcomes) recorded in the plan
- [ ] Task: Docs resync
  - [ ] `conductor/tech-stack.md` + `conductor/product.md` dated notes (packs list; budget delta)
  - [ ] `src/packs/data/README.md` production pack list (pre, numbers, abc, shapes, animals)
  - [ ] `dev/README.md` harness/QA notes
- [ ] Task: Owner device pass (Android + iPad)
  - [ ] Animals journey traced unaided; menu visual check both orientations; sticker board tap; sound check
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

---

*All work stays local on `track/animal-outlines` — no push, PR, or release.*
