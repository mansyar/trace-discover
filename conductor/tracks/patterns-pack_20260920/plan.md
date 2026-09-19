# Plan: Patterns pack — pre-writing part 2 (loops, spirals, stairs)

**Track ID:** `patterns-pack_20260920`
**Branch:** `track/patterns-pack`
**Spec:** [spec.md](./spec.md)
**Created:** 2026-09-20

---

## Phase 1 — Parser stroke extension + patterns pack content + registration [checkpoint: 69b0bd0]

- [x] Task: Write failing tests for the new stroke labels (Red)
  - [x] Test: parser/json suite (`src/packs/json.test.ts`) — `loop`, `spiral`, `stairs` accepted; unknown labels still rejected with the labeled error (still-unknown label is `'rainbow'` — the spec-deferred motif; the pre-existing `'spiral'` invalid-label fixtures in json/shapes/animals suites were retargeted to `'rainbow'` as part of the additive extension)
  - [x] Run `CI=true pnpm test -- src/packs/json.test.ts` and confirm RED *(confirmed: `invalid stroke 'loop'` at the extension test — 1 failed / 728 passed)*
- [x] Task: Write failing tests for the patterns pack loader (Red)
  - [x] Test: `src/packs/patterns.test.ts` — `PATTERNS_PACK` identity (`id: "patterns"`, `badgeId: "patterns-badge"`, `menuFill: "#8fd6c8"`, no bonuses), 9 levels `pattern-1`…`pattern-9` in locked order (size-major, pre-pack convention: loop/spiral/stairs × small → medium → large), per-level `stroke` label, stroke-count expectations, valid geometry per parser rules (margins, ≥2 points, no duplicate consecutive points), labeled load-time error on a malformed fixture
  - [x] Run `CI=true pnpm test -- src/packs/patterns.test.ts` and confirm RED *(confirmed: `Cannot find module './patterns'`)*
- [x] Task: Implement (Green)
  - [x] Extend `STROKE_PATTERNS`/`StrokePattern` additively in `src/packs/parser.ts` (no behavioral branching exists on the label — verified)
  - [x] Author `src/packs/data/patterns.json` — 430×860 field geometry, size bands mirroring the pre pack (small ≈145–285, medium ≈100–330, large ≈60–370); stairs keep flats straight via edge midpoints; spirals sized to stay inside margins
  - [x] Create `src/packs/patterns.ts` thin loader over `parsePackJson` (shapes.ts pattern)
  - [x] Ship placeholders at the final art URLs (adapt `dev/tools/animals-placeholders.mjs`): 9 goal + 9 sticker + `card-patterns.webp` + `patterns-badge.webp` — so the `artRefs.test.ts` invariant resolves *(new `dev/tools/patterns-placeholders.mjs`, 20 files, 78 KB total)*
  - [x] Run the full suite; confirm GREEN *(746/746)*
- [x] Task: Register the pack (TDD)
  - [x] Red: failing tests asserting `patterns` appends after `animals` and before the runtime `name` pack (with and without a saved name); pack screen grid config test *(3 catalog tests red as intended)*
  - [x] Green: catalog registration + `PACK_GRID` entry mirroring `pre` (columns 3; landscape 6 cols/12 slots); no other menu changes (6 static cards fit the 6-card capacity; a saved name pushes to page 2 via the shipped pager) *(menu-capacity guard test re-anchored: 7 entries paginate; animals menu-state tests updated for six static packs)*
- [x] Task: Validate content via tooling
  - [x] `pnpm pack:check` passes over the directory incl. `patterns.json`
  - [x] Dev preview renders `?pack=patterns` (all 9 levels) portrait + landscape with correct markers; screenshots reviewed *(qa-pack-preview --all: 9/9 OK, strokes/checkpoints 6/margin 24; inline landscape probe on pattern-1/5/9 OK, zero page errors; screenshots in dev/qa/out/)*
- [x] Task: Commit + checkpoint
  - [x] Commit code (`feat(packs): add patterns pack as validated JSON`), attach git note with task summary *(`69b0bd0`)*
  - [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) *(checkpoint `69b0bd0`, user-approved 2026-09-20; verification report appended as a git note — gates: check clean, 746/746 tests, coverage 73.62/77.75/89.79/73.17 ≥ thresholds, pack:check PASS, build OK, budget PASS 5,727,956 B / 197 entries of 6.00 MB / 200; manual menu/pack walk presented and approved)*

## Phase 2 — Reward art batch (goal art, stickers, card, badge) [checkpoint: 42e639f]

- [x] Task: Author the asset pipeline batch
  - [x] Generate → cutout → WebP per level: 9 goal + 9 stickers (playground & garden mapping: yo-yo / hula hoop / jump rope (loops), snail / pinwheel / rose (spirals), step ladder / slide steps / treehouse ladder (stairs); final set locked at art review) *(new `dev/tools/gen-patterns.mjs` — resumable raw batch; three prompts needed rewording past a stochastic Workers-AI NSFW false-positive filter; `cutout.mjs` ×10 at 600px into `art-src/patterns/clean/`)*
  - [x] Pack card art + `patterns-badge` badge art *(new `dev/tools/patterns-compose.mjs` — goals 256 / sticker seals 520→160 / badge 400 / card = one object per motif (yo-yo · snail · step ladder), mirrors `shapes-compose`)*
  - [x] Owner screenshot approval gate per asset (teddy/shapes precedent) — record approvals in the plan *(contact sheet `dev/art-src/patterns/contact-sheet.png` via new `dev/tools/patterns-sheet.mjs`; owner approved "Approve all" 2026-09-20)*
- [x] Task: Swap art into place + budget re-measure
  - [x] Bytes swapped at the identical placeholder URLs (no reference changes); confirm GREEN *(746/746; artRefs invariant unchanged)*
  - [x] `pnpm build` + `pnpm budget`; record dist/precache deltas vs baseline **5,630,286 B / 177 entries** — expected ≈ +200–240 KB / +20 entries (≈5.87 MB / 197) under the 6.00 MB / 200 ceilings *(measured 5,896,240 B / 197 entries: +266 KB / +20 entries vs the animals-close baseline — within ceilings, no re-anchor)*
  - [x] If a ceiling is exceeded: raise deliberately with measured evidence (documented in the dist-budget history comment + tech-stack note), never silently *(not exceeded)*
- [x] Task: Commit + checkpoint
  - [x] Commit code (`feat(packs): patterns reward art batch`), attach git note with task summary *(`42e639f`; art-src policy: `clean/` + `out/` tracked, `raw/` gitignored, sheet regenerable)*
  - [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) *(checkpoint `42e639f`, user-approved 2026-09-20; verification report appended as a git note — gates: check clean, 746/746, coverage ≥ thresholds, pack:check PASS, build OK, budget PASS 5,896,240 / 6,000,000 B, 197 / 200 entries; manual art walk presented and approved)*

## Phase 3 — Generic surfaces, QA sweeps, docs, closeout

- [x] Task: Verify pack-generic surfaces with zero special-casing (tests) *(`9cd2252`)*
  - [x] Sticker board: 9 pattern stickers pop/notes; shelf pulse; badge award on completion; success screen *(patterns.test.ts: nine stickers map to strictly rising, per-sticker-stable pentatonic notes under the two-octave wrap; badge lands exactly on the ninth completion)*
  - [x] Save round-trip: progress/stickers/badge for `patterns`; reset-progress unaffected; no schema change *(JSON round-trip asserts 9 pattern completions + `patterns-badge`; clean-reset case unchanged)*
- [x] Task: QA sweeps on a fresh production build *(`9cd2252`)*
  - [x] `CI=true pnpm check && CI=true pnpm test && pnpm pack:check && pnpm build && pnpm budget` — all PASS *(check clean 129 files; 748/748; pack:check 2/2; build ok; budget PASS 5,896,240 B / 197 entries vs 6.00 MB / 200)*
  - [x] Create `dev/qa/qa-patterns-sweep.mjs` (from `qa-shapes-sweep.mjs`) — trace all 9 levels to success + badge seal *(9/9 SUCCESS in one chain, `patterns-badge` awarded, zero page errors)*
  - [x] `qa-pack-preview --all` (incl. 9 new levels); `qa-landscape` spot (rotation mid-spiral keeps progress); zero-text audit; offline cold start *(preview 80/80 OK; new `qa-patterns-rotate.mjs`: mid-spiral rotate to landscape + back keeps the stroke set, level completes; new `qa-patterns-zerotext.mjs`: splash/menu/pack/level clean; `qa-offline` (pattern-5): SW precache boot + offline trace SUCCESS — pack mapping extended for `pattern-`/`animal-` levels)*
  - [x] Evidence (commands + outcomes) recorded in the plan
- [x] Task: Docs resync *(`9cd2252` + `8d3425c`)*
  - [x] `conductor/tech-stack.md`: dated note — Patterns pack (data + art), parser stroke-label extension, budget delta
  - [x] `conductor/product.md`: dated note — Patterns pack in the product story; packs list updated
  - [x] `src/packs/data/README.md`: production pack list (pre, numbers, abc, shapes, animals, patterns) + the three new stroke labels
  - [x] `dev/README.md`: preview/QA notes for patterns; level counts (71 JSON levels); stale budget line fix (5.60 MB / 150 → 6.00 MB / 200)
  - [x] Root `README.md`: stale "five characters × three packs" line corrected (six characters × six packs)
- [ ] Task: Owner device pass (Android + iPad)
  - [ ] Patterns journey traced unaided; menu/pager; sticker board tap; sound check; independent-play observation session with friction notes
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
