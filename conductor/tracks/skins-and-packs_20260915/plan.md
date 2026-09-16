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

## Phase 2 — Skins in motion: switching, mascot, audio, parent controls [checkpoint: 947747e]

*Goal: any skin, anywhere — tap-to-cycle on every child screen, persisted; idle mascot on menu/pack screens; per-skin instruments; mid-trace swaps with celebration guard.*

- [x] Task: Skin button — cycle logic + persistence (TDD) [b743810]
  - [x] Tests: cycle order dino→star→construction→animal (wrap); 400 ms debounce; written to `settings.skin`; default dino
  - [x] Implement button zone/hit-test (`ui/`), render (face icon + poof + pop), tap routing on every child screen
- [x] Task: Skin-driven rendering (TDD) [98888d1]
  - [x] Tests: backdrop/character/accent resolution from the active skin per screen; swap-decision helper — mid-trace applies immediately, defers while the completion sequence runs, applies when it ends
  - [x] Implement in `app/render.ts` + `main.ts` wiring + session guard
- [x] Task: Idle mascot on menu + pack screens [67ba2b5]
  - [x] Character idles (parked) outside levels; placeholder star backdrop until Phase 4 art
- [x] Task: Audio — per-skin instrument presets (TDD) [a2b7796]
  - [x] Tests: preset registry (marimba · bell · woodblock · kalimba); chimes + completion accept the skin preset; counted notes stay toy piano; volume/mute unaffected
  - [x] Implement in `audio/synth.ts` + wiring
- [x] Task: Parent zone — skin setter + trophy row + reset coverage (TDD) [947747e]
  - [x] Tests: setter writes `settings.skin`; trophies display-only; reset clears packs/badges/trophies after confirm; volume/mute still apply per skin
- [x] Task: Device feel check via LAN — skin swap (incl. mid-trace) + audio timbres; record findings; tune if needed — owner verdict: all good, no tuning needed (Android + iPad, 2026-09-15)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Pre-writing re-ramp (content) [checkpoint: 17a3e9c]

*Goal: the 12 slots form a real small→medium→large ramp; screenshots approved; feel checked.*

- [x] Task: Ramp geometry table + level data (TDD) [9024c24]
  - [x] Tests: control points within margins; ramp targets per block (line length, wave amplitude, arc rise, zigzag teeth, circle size); start/goal/direction conventions
  - [x] Implement per-block geometry; `validateLevel` clean; record the final table (track content note)
- [x] Task: Headless screenshot QA per level — start/goal/direction + the ramp reads visually [17a3e9c]
- [x] Task: Harness/device feel check via LAN — trace small/medium/large spot levels; tune values; record findings — owner verdict: looks good, no tuning needed (Android + iPad, 2026-09-15)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — Art batch: rewards, star backdrop, cards, face icons [checkpoint: 946eb8c]

*Goal: real art everywhere for the new model; screenshot-approved.*

- [x] Task: Reward art brief + batch — 12 + 3 content-neutral rewards (generate → cutout → optimize → composite → screenshot approval) [946eb8c]
- [x] Task: Integrate rewards — goal art + sticker slots + fly-in for pre-writing; screens QA [946eb8c]
- [x] Task: Star backdrop + pre-writing menu card art + four face icons; integrate; menu card final states for both packs [946eb8c]
- [x] Task: Precache/size checkpoint — SW glob covers new assets; dist recorded — dist 7.77MB; precache 91 entries (7931KiB) [946eb8c]
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5 — Compliance & QA sweep [checkpoint: 5087b98]

*Goal: offline, zero-text, right-sized, measured — within every constraint.*

- [x] Task: Build + offline probe — SW precache covers all new assets; `spike/qa-offline.mjs` from preview; dist within budget — 91 precache entries (7931KiB); offline boot + pre-1 trace SUCCESS; dist 7.77MB [946eb8c]
- [x] Task: Zero-text + 90 px audit of new surfaces (menu, pack screens, success, parent zone, skin button, mascot) — screenshots + vision + code scan — fillText only inside drawParent; 90px floors unit-tested on all card/button layouts [946eb8c]
- [x] Task: Perf spot-checks — skin swaps (incl. mid-trace), cold start, fps sampling (mid-range Android + base iPad); fix if warranted — headless: cold boot 93ms, input-to-frame 2.7ms, frames p95 4.3ms, zero page errors; device sampling folded into the Phase 6 device pass [946eb8c]
- [x] Task: Regression sweep — stroke feel/assists/completion parity; numbers unchanged; full suite green; QA script suite pass — 320/320; qa-numerals + qa-pack-app green (numbers unchanged); qa-app full pre pack green [946eb8c]
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 6 — Device validation & acceptance

*Goal: proven on real hardware with the toddler; every acceptance criterion traced to evidence.*

- [x] Task: Install/offline re-check (Android + iPad) with new assets cached; rotation/gesture spot-checks — owner device pass: ALL GOOD (Android + iPad, 2026-09-16)
- [x] Task: On-device save migration — real v2 save → updated app: progress + trophies intact; reset verified — owner device pass: ALL GOOD (migration where an old save existed; reset intact)
- [x] Task: Independent-play session — toddler completes a re-ramped level; mid-trace skin swap; friction notes → polish — owner report: ALL GOOD, no friction notes, no polish needed
- [x] Task: Acceptance criteria 1–9 evidence recorded (plan + git note) — evidence below
- [~] Task: Phase Verification & Checkpoint (Refer to workflow.md)

**Acceptance evidence (2026-09-16):**
1. Four skins × both packs playable incl. star backdrop — qa-pre-pack scenarios 1-5; qa-app full pre pack (dino); qa-pack-app numbers flow; star backdrop + all art integrated [946eb8c].
2. Skin button on every child screen, cycles with poof+pop, persists, mid-trace swap keeps progress, celebration guard — qa-pre-pack scenario 3 (menu→star / pack→construction / level→animal, screen + progress preserved); skinSwap unit tests; owner device pass.
3. Content-first menu personalized + idle mascot on menu + pack — qa-pre-pack scenarios 1/4; menu + pack vision reviews (both cards, mascot framing, zero overlap).
4. Re-ramp blocks small→medium→large + circles unlock 4/8/12 + badge — ramp tests (spans 140/230/310, wave 25/55/85, arc 70/110/160, 2/3/4 teeth, Ø150/200/260); qa-levels 15/15 TRACE SUCCESS; small-vs-large vision check; owner feel check "looks good" (Phase 3).
5. Numbers unchanged, playable under any skin — qa-numerals + qa-pack-app green post-art (rest + traces); save v3 numbers flow.
6. Save migration lossless (v2→v3, v1→v3 chain), trophies kept, hostile input sanitized, reset clears everything — store.test exact-mapping fixtures; qa-persistence live probe; owner device pass.
7. Per-skin instruments on chimes + completion (marimba/bell/woodblock/kalimba); counted notes still toy piano; mute/volume respected — synth/session tests (e.g. bell chimes 1.4s sine); owner audio checks (Phase 2 + 6).
8. Zero-text + art approved + offline/install on devices + dist/perf — fillText scan (parent zone only); art approved via vision (3 pieces regenerated); qa-offline green (offline cold boot from precache); dist 7.77MB / 91 entries (7931KiB); perf 93ms cold boot, 2.7ms input-to-frame, frames p95 4.3ms; owner install + offline ALL GOOD.
9. All checks green + toddler session — 320/320 tests, pnpm check clean; owner: toddler completed re-ramped levels + mid-trace skin swap, ALL GOOD.
