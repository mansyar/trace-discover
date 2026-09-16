# Implementation Plan: Letters Pack — Part 2: Uppercase A–Z + Sequence Bonuses

**Spec:** [spec.md](./spec.md) · **Track:** `letters-pack_20260916` (Feature) · **Methodology:** follows `conductor/workflow.md` — every task is TDD (failing tests first → implement → verify), gated by `pnpm check && pnpm test`; every phase closes with the Phase Verification & Checkpoint protocol.

**Delivery strategy:** wiring-first — the `abc` pack skeleton lands on rough geometry (Phase 1: registration, 26-card grid, gating, third-pack audit) so navigation and progress feel real while content is still cheap to change; then the long pole — content authoring (Phase 2: 26 glyphs + `ABC`/`MOM`/`ZOO`, content doc, early device feel checks on E/S/A); the reward layer next (Phase 3: per-stroke hops, sticker/badge, bonus seals); art batch (Phase 4); compliance sweep (Phase 5); device validation with the toddler (Phase 6). Work stays local on `track/letters-pack` — no push/PR/release (spec §Out of Scope).

## Phase 1 — Wiring: docs, pack registration, 26-card grid, third-pack audit [checkpoint: 7ef4777]

*Goal: menu → pack:abc (two pages, 12 + 14 with centered Y–Z finale) → level → success → next all work on rough geometry; progress/badge/bonus gating generic; two-pack assumptions gone or documented.*

- [x] Task: Context docs resync — `tech-stack.md` (letters pack entry: content-only integration, per-stroke hop plan) + `product-guidelines.md` (stale "Numbers-pack guide" line → skins-era wording) — before implementation per workflow.md [62241f5]
- [x] Task: Pack registration + letter level skeletons (TDD) [dc46475]
  - [ ] Tests: `abc` pack entry — 26 levels `abc-a..abc-z` in A–Z order (rough geometry, refined Phase 2), bonuses `abc-bonus-1..3`, badge `abc-badge`, `bonusUnlocks [9,18,26]`; ids unique; `validateLevel` clean; `playOrderIds` + wrap behavior
  - [ ] Implement `src/packs/letters.ts` + register in `catalog.ts`
- [x] Task: Third-pack generalization audit (TDD) [f5e5d22]
  - [ ] Tests: pack-generic art paths for a third pack (`card-abc.png`, `abc-badge.png`), routing/success/badge flows, hop-plan dispatch; numerals' intentional special-casing pinned
  - [ ] Sweep `main.ts`, `app/`, `packs/`, `render/`, `session`; fix accidental coupling; document what stays pack-specific
- [x] Task: Pack screen — 26 cards across two pages + per-page shelf + badge (layout math TDD) [f25a948]
  - [ ] Tests: 4-per-row math (12 then 14, rows 4+4+4+2), centered Y-Z finale pair, ≥90 px card + pager targets, pager hit zones + landing page (first unfinished), shelf/badge zones, cleared → sticker; cream shell (numbers pattern)
  - [ ] Implement layout config (card size, per-row centering, page slicing, pager) + render + main wiring; screens-harness QA (menu → pack:abc → level:abc-a)
- [x] Task: Menu card + navigation wiring (TDD) — third card appended (rough "ABC" art); menu → pack → letter → success; replay/next/home; badge reachability [8023792]
- [x] Task: Dev harness + spike QA script updates for the `abc` pack [7ef4777]
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Letter content: school-style glyphs & sequences

*Goal: all 26 letters authored per the content doc — school-style stroke order, field-sized glyphs with inter-stroke gaps clear of tolerance zones; `ABC`/`MOM`/`ZOO` authored; screenshots approved; trickiest glyphs feel-checked on device.*

- [x] Task: Content doc — letter formation table (`content.md`): stroke order/direction per letter, start marks, stroke counts, checkpoint tables, object list, bonus designs [ffad1a1]
- [x] Task: Author letter glyphs A–Z (TDD) [693198b]
  - [ ] Tests: stroke counts + order per content doc (E = 4, T = 2, …); margins; inter-stroke gaps clear of tolerance zones; `validateLevel` clean for all 26; multi-stroke sequencing parity
  - [ ] Implement geometries (chunky, field-sized); record the final table in `content.md`
- [x] Task: Headless screenshot QA per letter [e313d8b] — start/goal/direction + glyph legibility
- [x] Task: Author bonus sequences `ABC` / `MOM` / `ZOO` (TDD) — generous sizing, ordered multi-stroke; validate + screenshot QA [dbb70f6]
- [ ] Task: Device feel check via LAN — trace E (4-stroke), S (curve), A (diagonals); tune if needed; record findings
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Reward layer: per-stroke hops, stickers, badge & seals

*Goal: the full reward loop live — per-stroke counted hops + notes, sticker fly-in per letter, bonus unlocks sealing the pack.*

- [ ] Task: Hop plan — per-stroke hops (TDD)
  - [ ] Tests: letters branch — one hop + one note per stroke, cap 4 (E = 4, C = 1); numerals' counted behavior unchanged; pacing caps
  - [ ] Implement in `character/hops.ts` + session/app wiring
- [ ] Task: Sticker/badge/bonus flow integration — per-letter sticker fly-in; badge at 26; bonus seals (`ABC`/`MOM`/`ZOO`) mirror the numbers badge flow; screens QA
- [ ] Task: Device feel check via LAN — completion hops (E vs C) + bonus unlock loop; tune pacing; record findings
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — Art batch: objects, stickers, bonuses, card, badge

*Goal: real art everywhere — screenshot-approved; size guarded.*

- [ ] Task: Art batch — 26 goal vignettes + 26 stickers (object-per-letter) + 3 bonus arts + menu card + pack badge (generate → cutout → optimize → composite → screenshot approval)
- [ ] Task: Integrate art — goal art, sticker slots, card states (fresh/in-progress/badge), bonus arts; screens QA
- [ ] Task: Precache/size checkpoint — SW glob covers new assets; dist recorded; optimization pass if approaching budget
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5 — Compliance & QA sweep

*Goal: offline, zero-text, right-sized, measured — within every constraint; docs current.*

- [ ] Task: Build + offline probe — SW precache covers all new assets; `spike/qa-offline.mjs` from preview; dist within budget
- [ ] Task: Zero-text + 90 px audit of new surfaces (menu, 26-card pack screen, bonus flows) — screenshots + vision + code scan
- [ ] Task: Perf spot-checks — 26-card pack screen, cold start, fps (mid-range Android + base iPad); fix if warranted
- [ ] Task: Regression sweep — pre-writing + numbers + all four skins parity; full suite + QA scripts
- [ ] Task: Docs close-out — `product.md` dated note (letters shipped); track docs final
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 6 — Device validation & acceptance

*Goal: proven on real hardware with the toddler; every acceptance criterion traced to evidence.*

- [ ] Task: Install/offline re-check (Android + iPad) with letters cached; rotation/gesture spot-checks
- [ ] Task: Independent-play session — toddler traces ≥1 letter unaided; bonus unlock state; friction notes → polish
- [ ] Task: Acceptance criteria 1–9 evidence recorded (plan + git note)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
