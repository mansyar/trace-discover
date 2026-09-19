# Plan: Animal outlines pack — eight organic silhouettes as validated JSON

**Track ID:** `animal-outlines_20260919`
**Branch:** `track/animal-outlines`
**Spec:** [spec.md](./spec.md)
**Created:** 2026-09-19

---

## Phase 1 — Animals pack content + registration [checkpoint: d6b707e]

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
- [x] Task: Harness path review + owner approval *(`a0202e8`)*
  - [x] Preview every level via `dev/harness/pack.html?pack=animals&level=animal-N` at 430×860 (plus a landscape spot); iterate control points until each animal reads instantly — first pass + two anatomy iterations shot; owner review 2026-09-19: **rejected** ("most of them does not look like the supposed animals"); blind hand-placed control points are too loose
  - [x] **Pivot (owner decision 2026-09-19): reference-traced outlines.** Generate clean side-view reference art via the $0 pipeline (`gen.mjs` → `cutout.mjs`; raws/intermediates in `dev/art-src/animals/`), add a reusable contour tracer (`dev/tools/trace-contour.mjs`: alpha mask → largest boundary → smooth → simplify → field-mapped control points), re-author `animals.json` from traced contours (anatomy splits kept where the silhouette allows: fish body+tail, ladybug dome+head, butterfly upper/lower wings; re-pin tests if the trace disagrees), then re-shoot and re-present for owner approval. References double as Phase 2 sticker-art source. — Result: 8 side-view references generated + cut out (`dev/art-src/animals/*.png`); resumable trace batch + reusable tracer landed; `animals.json` re-authored; butterfly re-pinned 3→2 (spec updated); owner approved the traced set 2026-09-19 (`dev/qa/out/animals-contact.png` + individuals)
  - [x] Lock stroke counts/control points with owner screenshot approval recorded in the plan — Locked: fish 2 · ladybug 2 · duck/turtle/bunny/cat/elephant 1 (closed) · butterfly 2
- [x] Task: Register the pack + menu card position (TDD) *(`9c0772c`)*
  - [x] Red: failing tests asserting `animals` sits between `shapes` and the runtime `name` (with and without a saved name) and renders a card with the pack's art/menuFill — RED confirmed (catalog order + `packById('animals')` failed, 2/8); card fill/art derive from `PackEntry.menuFill` + id conventions, no extra menu code
  - [x] Green: catalog registration (animals fifth, before the runtime name) + 18 placeholder WebPs at the pack's final art URLs (`dev/tools/animals-placeholders.mjs`) keeping the `artRefs` invariant honest until Phase 2 — suite 721/721, `pnpm pack:check` + `pnpm check` green
- [x] Task: Validate content via tooling *(`d6b707e`)*
  - [x] `pnpm pack:check` passes over the 5-pack directory (incl. `animals.json`) — green (2/2 under the pack validator)
  - [x] Dev preview renders `?pack=animals` (all 8 levels) with correct markers; screenshots reviewed — harness shots error-free (owner-approved outlines); real app verified: menu shows the fifth animals card and the pack screen renders 8 traced minis (`dev/qa/qa-animals-menu.mjs` → `dev/qa/out/animals-menu.png`, `animals-pack.png`)
- [x] Task: Commit + checkpoint
  - [x] Commit code (`feat(packs): add animals pack as validated JSON`), attach git note with task summary — landed earlier as `a0202e8` (traced outlines + tools), `9c0772c` (registration), `d6b707e` (tooling probe); notes attached to all three
  - [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) *(checkpoint `d6b707e`, user-approved 2026-09-19; verification report appended as a git note — gates 721/721 + pack:check + check, manual menu/pack walk confirmed)*

## Phase 2 — Reward art batch (habitats, stickers, card, badge) [checkpoint: e31eacc]

- [x] Task: Author the asset pipeline batch *(`4c2b5d6`)*
  - [x] Generate → cutout → WebP per level: 8 goal habitats (animal visible in a mini-habitat) + 8 full-body chibi stickers; pack card group scene + `animals-badge` paw-print medallion — 8 habitat scenes + badge generated via flux (`gen-animals-art.mjs`, resumable; one cat NSFW false positive re-run); stickers compose the Phase 1 chibi cutouts in the house seal (`animals-compose.mjs`); card = fish·duck·butterfly row (shapes-card pattern)
  - [x] Owner screenshot approval gate per asset (teddy/shapes precedent) — record approvals in the plan; scripts under `dev/tools/` (resumable batch pattern), intermediates in `dev/art-src/animals/` — **owner approved all 20 finals 2026-09-19** (`dev/qa/out/animals-art-contact.png`); bytes swapped in place over the 18 placeholders
- [x] Task: Wire art into content + registry (TDD where code) *(`4c2b5d6`)*
  - [x] Confirm the art-reference invariant (`artRefs.test.ts`) resolves every `animals` goalArt/sticker/card/badge URL; placeholders ship at final URLs, bytes swapped in place — bytes swapped in place at the same URLs; full suite 721/721 green
- [x] Task: Budget re-measure *(`e31eacc`)*
  - [x] `pnpm build` + `pnpm budget`; record dist/precache deltas vs the Phase 1 baseline — fresh build: 5,630,227 B / 177 precache entries (baseline 5,415,327 / 159; delta +214,900 B / +18 entries)
  - [x] If ceilings trip (expected ≈ +18 entries / ≈ +0.25 MB): raise deliberately with measured evidence in the `dev/tools/dist-budget.mjs` history comment, never silently — both raised: 5.60 MB / 170 → **6.00 MB / 200** with a dated history entry; `pnpm budget` re-run PASS
- [x] Task: Commit + checkpoint
  - [x] Commit (`feat(packs): animals reward art batch`), attach git note — landed as `4c2b5d6` (48 files: 20 finals + pipeline scripts + contact probe; bytes swapped over the 18 placeholders) with note
  - [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) *(checkpoint `e31eacc`, user-approved 2026-09-19; verification report appended as a git note — suite 721/721, pack:check, check, build + budget PASS, manual art walk confirmed)*

## Phase 3 — Generic surfaces, QA sweeps, docs, closeout

- [x] Task: Verify pack-generic surfaces with zero special-casing (tests) *(`83b8a43`, `66e9548`)*
  - [x] Sticker board: 8 animal stickers pop/notes (generic behavior asserted) — `stickerBoardLayout` cells in order + bounds in the new `animals generic surfaces` suite
  - [x] Badge award on completion; success screen; pack screen grid + shelf (portrait defaults + landscape `PACK_GRID` entry only if needed — shapes precedent) — portrait defaults pass; landscape needed the shapes entry (the default 2-column grid overflows the 430-tall wide field for 8 cards) → `PACK_GRID.animals = { landscape: { cardSize: 90, columns: 5, slotsPerRow: 10 } }` *(`66e9548`)*
  - [x] Save round-trip: progress/stickers/badge for `animals`; reset-progress unaffected; no schema change — asserted incl. badge re-award guard + `version === 3`
  - [x] Menu fidelity: 6-entry menu (with saved name) renders one full page, no pager; 5-entry (no name) unchanged — asserted for both *(suite 727/727; `pnpm check` clean)*
- [x] Task: QA sweeps on a fresh production build *(`f1b91dc`)*
  - [x] Gates all PASS: `pnpm check` 0 · `pnpm test` 727/727 · `pnpm pack:check` 2/2 · `pnpm build` ok · `pnpm budget` PASS 5,630,286 B / 177 entries (vs 6.00 MB / 200)
  - [x] App journey sweep (`qa-app`: full pre pack incl. bonuses + badge, no errors); animals sweep (`qa-animals-sweep.mjs`: all 8 levels traced to success in one chain, `animals-badge` awarded, no page errors); `qa-pack-preview --all` 70/70 OK (8/8 animal screenshots); `qa-landscape` matrix PASS (portrait · landscape · rotation · tablet; 0 page errors); zero-text audit PASS (splash/menu/pack/level); offline cold start PASS (`qa-offline`: SW precache boot + offline `pre-1` trace SUCCESS)
  - [x] Evidence recorded in this plan; scripts `dev/qa/qa-animals-sweep.mjs` + `dev/qa/qa-animals-zerotext.mjs` committed
- [x] Task: Docs resync *(`2fbfa69`)*
  - [x] `conductor/tech-stack.md` + `conductor/product.md` dated notes (packs list now five incl. Animals; budget delta 5.60 MB / 170 → 6.00 MB / 200)
  - [x] `src/packs/data/README.md` production pack list (pre, numbers, abc, shapes, animals)
  - [x] `dev/README.md` harness/QA notes (`qa-animals-sweep` + `qa-animals-zerotext` rows + status legend)
- [x] Task: Owner device pass (Android + iPad) *(user-confirmed 2026-09-19)*
  - [x] Animals journey traced unaided; menu visual check both orientations; sticker board tap; sound check — passed on Android + iPad over the LAN build (`http://192.168.0.114:4180`)
- [~] Task: Phase Verification & Checkpoint (Refer to workflow.md)

---

*All work stays local on `track/animal-outlines` — no push, PR, or release.*
