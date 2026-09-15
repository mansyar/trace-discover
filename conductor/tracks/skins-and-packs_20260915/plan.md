# Implementation Plan: Skins & Packs — Decoupling Content from Theme

**Spec:** [spec.md](./spec.md) · **Track:** `skins-and-packs_20260915` (Feature) · **Methodology:** follows `conductor/workflow.md` — every task is TDD (failing tests first → implement → verify), gated by `pnpm check && pnpm test`; every phase closes with the Phase Verification & Checkpoint protocol.

**Delivery strategy:** model-first — registries + save v3 + routing + content-first shell (Phase 1) land a working content-first app on the fixed dino skin before anything cosmetic changes; skins in motion next (Phase 2: button, mascot, audio, parent controls); the pre-writing re-ramp as focused content work (Phase 3); the art batch with screenshot approval (Phase 4); compliance sweep (Phase 5); device validation & acceptance with the toddler (Phase 6). Work stays local on `track/skins-and-packs` — no push/PR/release (spec §Out of Scope).

## Phase 1 — Foundations: docs, skins/packs model, save v3, content-first shell [checkpoint: ae5e5e1]

*Goal: the app runs on the new model — content-first menu (Pre-writing + Numbers), both packs playable under the (temporarily fixed) dino skin, save v3 migrating v1/v2 losslessly, docs resynced.*

- [x] Task: Context docs resync — `tech-stack.md` (skins/packs architecture, save v3, character contract) + `product.md` (packs × skins framing; stale note refresh) — before implementation per workflow.md [df9752b]
  - [x] Update `tech-stack.md`: module map (`skins/`, `packs/`), save schema v3, character contract, asset pipeline notes
  - [x] Update `product.md`: description/direction around packs × skins; refresh the dated note; verify no contradictions
- [x] Task: Skins registry (TDD) [b347ef1]
  - [x] Tests: four skins (dino, star, construction, animal) each carrying id/character/backdrop/accent/instrument; unique ids; lookup by id; contract fields present
  - [x] Implement `src/skins/` (star backdrop refs the future art path; placeholder until Phase 4)
- [x] Task: Packs registry + pre-writing pack data (TDD) [e78a703]
  - [x] Tests: pack entry shape; pre-writing holds 12 slots (`pre-1..pre-12`) + 3 circles (`pre-bonus-1..3`) in current slot order (geometry relabeled, re-ramp lands Phase 3); numbers folds in (`num-0..9`); ids unique; `validateLevel` clean for all
  - [x] Implement `src/packs/` (level schema moves from `themes/level.ts`; `LevelDef.theme` removed)
- [x] Task: Unified progress module (TDD) [ed1e8ba]
  - [x] Tests: completedCount; isPackComplete; shouldAwardPackBadge; circle unlock boundaries at 4/8/12; nextPackLevelId wrap; no-circles pack (numbers) parity
  - [x] Implement progress; supersedes `themes/progress.ts`/`themes/pack.ts`/`themes/catalog.ts` (physical removal happens in the consumer sweep)
- [x] Task: Save schema v3 + migration (TDD) [0e4fa98]
  - [x] Tests: v2→v3 mapping (`dino-N`→`pre-N`, `construction-N`→`pre-(N+4)`, `animals-N`→`pre-(N+8)`, `*-bonus`→`pre-bonus-1..3`, `num-*` preserved, theme badges→trophies, numbers badge→pack badges); v1→v3 chain; hostile input; `assistWidened` dropped; reset covers v3 fields
  - [x] Implement in `save/store.ts`
- [x] Task: Consumer sweep — module moves, id renames, imports across `app/`, `render`, `main.ts`, `dev/`, tests [272e377]
- [x] Task: App routing generalization (TDD) — landed with the sweep commit to keep the tree green [272e377]
  - [x] Tests: pack-generic screens/events (no `PACK_ID` special-casing); success replay/next/home per pack; badge per pack; circle unlock gating
  - [x] Implement in `app/app.ts`
- [x] Task: Content-first menu + pre-writing pack screen (zero-text) [ad514f5]
  - [x] Menu: pack cards (Pre-writing, Numbers) in the existing card language; parent gate unchanged [272e377]
  - [x] Pack screen: 12 cards + 12 sticker slots + badge + home; 90 px+ targets; safe-area + letterbox as v1 (3x4 grid + 6x2 shelf via pack layout options)
  - [x] Wire render + `main.ts`; screens-harness QA (wired in [272e377]; QA probe spike/qa-pre-pack.mjs verified menu -> pack:pre -> level:pre-1, no page errors)
- [x] Task: Dev harness + spike QA script updates (new ids/screens; v2→v3 migration probe) [ae5e5e1]
  - [x] All QA scripts re-pointed to packs × skins navigation (14 scripts); qa-persistence probes v1→v3 migration; qa-app drives the full pre-pack loop
  - [x] Fix found during the sweep: pack badge spot opens the first unlocked circle (v1 parity, no dead-end) [922e740]
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Skins in motion: switching, mascot, audio, parent controls

*Goal: any skin, anywhere — tap-to-cycle on every child screen, persisted; idle mascot on menu/pack screens; per-skin instruments; mid-trace swaps with celebration guard.*

- [ ] Task: Skin button — cycle logic + persistence (TDD)
  - [ ] Tests: cycle order dino→star→construction→animal (wrap); 400 ms debounce; written to `settings.skin`; default dino
  - [ ] Implement button zone/hit-test (`ui/`), render (face icon + poof + pop), tap routing on every child screen
- [ ] Task: Skin-driven rendering (TDD)
  - [ ] Tests: backdrop/character/accent resolution from the active skin per screen; swap-decision helper — mid-trace applies immediately, defers while the completion sequence runs, applies when it ends
  - [ ] Implement in `app/render.ts` + `main.ts` wiring + session guard
- [ ] Task: Idle mascot on menu + pack screens
  - [ ] Character idles (parked) outside levels; placeholder star backdrop until Phase 4 art
- [ ] Task: Audio — per-skin instrument presets (TDD)
  - [ ] Tests: preset registry (marimba · bell · woodblock · kalimba); chimes + completion accept the skin preset; counted notes stay toy piano; volume/mute unaffected
  - [ ] Implement in `audio/synth.ts` + wiring
- [ ] Task: Parent zone — skin setter + trophy row + reset coverage (TDD)
  - [ ] Tests: setter writes `settings.skin`; trophies display-only; reset clears packs/badges/trophies after confirm; volume/mute still apply per skin
- [ ] Task: Device feel check via LAN — skin swap (incl. mid-trace) + audio timbres; record findings; tune if needed
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Pre-writing re-ramp (content)

*Goal: the 12 slots form a real small→medium→large ramp; screenshots approved; feel checked.*

- [ ] Task: Ramp geometry table + level data (TDD)
  - [ ] Tests: control points within margins; ramp targets per block (line length, wave amplitude, arc rise, zigzag teeth, circle size); start/goal/direction conventions
  - [ ] Implement per-block geometry; `validateLevel` clean; record the final table (track content note)
- [ ] Task: Headless screenshot QA per level — start/goal/direction + the ramp reads visually
- [ ] Task: Harness/device feel check via LAN — trace small/medium/large spot levels; tune values; record findings
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — Art batch: rewards, star backdrop, cards, face icons

*Goal: real art everywhere for the new model; screenshot-approved.*

- [ ] Task: Reward art brief + batch — 12 + 3 content-neutral rewards (generate → cutout → optimize → composite → screenshot approval)
- [ ] Task: Integrate rewards — goal art + sticker slots + fly-in for pre-writing; screens QA
- [ ] Task: Star backdrop + pre-writing menu card art + four face icons; integrate; menu card final states for both packs
- [ ] Task: Precache/size checkpoint — SW glob covers new assets; dist recorded
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5 — Compliance & QA sweep

*Goal: offline, zero-text, right-sized, measured — within every constraint.*

- [ ] Task: Build + offline probe — SW precache covers all new assets; `spike/qa-offline.mjs` from preview; dist within budget
- [ ] Task: Zero-text + 90 px audit of new surfaces (menu, pack screens, success, parent zone, skin button, mascot) — screenshots + vision + code scan
- [ ] Task: Perf spot-checks — skin swaps (incl. mid-trace), cold start, fps sampling (mid-range Android + base iPad); fix if warranted
- [ ] Task: Regression sweep — stroke feel/assists/completion parity; numbers unchanged; full suite green; QA script suite pass
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 6 — Device validation & acceptance

*Goal: proven on real hardware with the toddler; every acceptance criterion traced to evidence.*

- [ ] Task: Install/offline re-check (Android + iPad) with new assets cached; rotation/gesture spot-checks
- [ ] Task: On-device save migration — real v2 save → updated app: progress + trophies intact; reset verified
- [ ] Task: Independent-play session — toddler completes a re-ramped level; mid-trace skin swap; friction notes → polish
- [ ] Task: Acceptance criteria 1–9 evidence recorded (plan + git note)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
