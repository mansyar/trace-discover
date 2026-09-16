# Implementation Plan: Teddy — Fifth Skin (Family Plush)

**Spec:** [spec.md](./spec.md) · **Track:** `teddy-skin_20260916` (Feature) · **Methodology:** follows `conductor/workflow.md` — every task is TDD (failing tests first → implement → verify), gated by `pnpm check && pnpm test`; every phase closes with the Phase Verification & Checkpoint protocol.

**Delivery strategy:** art-first behind the owner's approval gate — the stylized master is generated and **explicitly approved** before any downstream build (Phase 1); the character is then built through the cast golden loop (cutout → poses → Rive → screenshot/browser verification, Phase 2); skin + voice are integrated with TDD (Phase 3); the remaining art (bedroom backdrop, face icon) lands as a batch (Phase 4); compliance, QA evidence, device pass and acceptance close it out (Phase 5). Work stays local on `track/teddy-skin` — no push/PR/release (spec §Out of Scope).

## Phase 1 — Docs resync + stylized master (owner approval gate) [checkpoint: ea47a7f]

*Goal: the context docs describe the fifth skin before implementation; the stylized character master exists in the house art language and is approved by the owner — the hard gate before any build work.*

- [x] Task: Context docs resync — before implementation per workflow.md [ea47a7f]
  - [x] `product.md`: fifth skin noted (description/features); out-of-scope line re-scoped (further skins remain pipeline work per the drop-in contract); dated note
  - [x] `tech-stack.md`: skins list gains teddy; instruments list gains `musicbox`; dated note
  - [x] `dev/README.md`: character workspace list gains teddy
- [x] Task: Reference prep + stylization candidates — `gen2.mjs` img2img from the reference photo (prereq: `dev/.cf_token` present in this worktree, untracked); tune strength/seed; candidates inspected; raw reference + raws stay untracked — 4 candidates (`dev/gen/teddy-cand-a..d.png`): a=0.6; b/c/d=0.7–0.9 byte-identical (stable high-strength result)
- [x] Task: **Owner approval of the stylized master (hard gate)** — owner approved candidate B (`dev/gen/teddy-cand-b.png`, strength 0.7, seed 7) 2026-09-16; canonical copy `dev/characters/teddy/master.png`; downstream work unlocked
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Character build: cutout → poses → Rive → verification [checkpoint: 61bd9c3]

*Goal: `public/rive/teddy.riv` passes the cast golden loop — rest/blink/celebrate screenshots verified, headless browser test green, ≤ ~500 KB.*

- [x] Task: Pose sources from the approved master — base + celebrate (arm-raised jump) + same-pose blink at low strength (regenerated sources get their own measurements — never inherit placements) — celebrate `--strength 0.55 --seed 11`, blink `--strength 0.28 --seed 7` (`dev/gen/teddy-celebrate.png`, `dev/gen/teddy-blink.png`); both viewed
- [x] Task: Cutouts — base + celebrate + blink with the same `--box` discipline for pixel-aligned exports; verify by looking — shared `--box=200,131,833,944`; cutouts viewed; blink shipped as feathered patch since the 0.28 regen jitters the whole figure (82 k px raw diff); all three re-cut 600→520 px in Task 'Rive project' for the byte budget
- [x] Task: Rive project `dev/characters/teddy/` (from the dino4 template) — idle loop, celebrate swap, tap proxy, sparkles; `rive . --verify` → `inspect --json` (problems empty) → `--once` → screenshots rest / blink / celebrate — look at every PNG — verify/inspect clean (0 errors, 0 warnings); built 445,653 B; screenshots rest/blink/celebrate viewed; 520 px re-cut for the byte budget (scene scales 0.71 → 0.819 keep the 426 artboard px footprint) [c968a14]
- [x] Task: Blink patch calibration — `composite.mjs` feathered patch; `gridshot.mjs` measurements; node placement recomputed from the crop rect; seam-free confirmation — eyes measured via gridshot (rect 190,57→330,116); composite feather 9, margin 30 → patch 200×119 (42,522 B); blur tail (≤ 24 px) fully inside the crop; seams gone (magnified before/after viewed); node y=-146 @ scale 0.819 [c968a14]
- [x] Task: Headless browser test + size/ship — stale `browsertest.mjs` (its page was removed in repo-organization) → replaced by `dev/qa/qa-teddy.mjs` + `?char=` harness override: pre-2 real-pointer trace → completion → burst → success, no character error, page errors none; riv 445,653 B (~435 KiB) ≤ ~500 KB; shipped `public/rive/teddy.riv` [61bd9c3]
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Skin + voice integration (TDD) [checkpoint: 724e603]

*Goal: teddy is a selectable, persisted skin with its music-box voice — code green, suite green.*

- [x] Task: Skins registry + five-skin cycle (TDD) [724e603]
  - [x] Tests: teddy carries id/character/backdrop/accent/instrument/face; unique ids; cycle dino→star→construction→animal→teddy (wrap); unknown-id fallback intact; `settings.skin` round-trips teddy — red 7 failures → green; `app.test.ts` cycle walk extended to five taps
  - [x] Implement `src/skins/skins.ts` (extend existing tests to five) — teddy entry `#e07a5f` / `/art/bg/teddy.jpg` / `/art/face/teddy.png` / `musicbox`; persistence needed no code change (`asSettings` validates via `skinById`)
- [x] Task: Music-box preset (TDD) [2a17f29]
  - [x] Tests: `InstrumentId` includes `musicbox`; preset = soft sine, long decay ~1.5 s, gentle gain; chimes + completion resolve through it; counted toy-piano notes unchanged; volume/mute respected — red 3 failures → green (volume/mute + counted notes covered by existing meter/player tests)
  - [x] Implement `src/audio/synth.ts` — `musicbox: { duration: 1.5, gain: 0.3, type: 'sine' }`
- [x] Task: Wiring sweep — `.riv` src resolution (`public/rive/teddy.riv`); face/backdrop refs render on menu/pack/level/success; skin button + parent setter include teddy; QA/harness enumerations updated where they list skins — audit: everything resolves through the registry (`main.ts` `/rive/${character}.riv` + `SKINS` face preload + `levelPresentation` backdrop; both setters call `nextSkinId`); QA/harness greps checked (no four-skin assumption); `faces.mjs` teddy row deferred to Phase 4 (needs the head crop); no product-code change required — the drop-in contract held
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — Remaining art: bedroom backdrop + face icon [checkpoint: ed2546b]

*Goal: all teddy art integrated and screenshot-approved; precache/size recorded.*

- [x] Task: Cozy-bedroom backdrop — generate → optimize → `public/art/bg/teddy.jpg`; integrate; menu/pack/level/success screenshots (readability/contrast) approved — 2 `gen.mjs` candidates (`dev/gen/bg-teddy.png` chosen / `bg-teddy-a.png` alternate kept untracked); owner approved candidate 2 + accent `#e07a5f` 2026-09-16; `opt-art.mjs teddy` → 1024² JPEG q75 44,761 B; real-app screens via new `dev/qa/qa-teddy-screens.mjs` (menu/pack/level/success, no page errors) [c5659ce; tooling 9a2a2a9]
- [x] Task: Face icon — teddy head cutout → `public/art/face/teddy.png`; button-scale crispness verified (skin button + parent setter) — hand box (dark dot eyes, no eye-white auto-detect) → 256 px icon 81,424 B over accent disc `#e07a5f`; 4x zooms of the menu skin-cycle button + parent-zone setter (grown-ups) crisp, no artifacts; other faces untouched [7524f01; tooling ed2546b]
- [x] Task: Precache/size checkpoint — SW glob covers new assets; dist + precache entries recorded vs baseline (6.71 MB / 76 entries) — `pnpm build` green; precache **79 entries / 7,413.33 KiB**; dist **7.26 MB / 81 files** (Δ ≈ +0.55 MB / +3 entries vs the repo-organization baseline); `teddy.riv` + `bg/teddy.jpg` + `face/teddy.png` all IN precache (spot-checked in `dist/sw.js`); NFR (< ~10–15 MB offline) respected
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5 — Compliance, QA & acceptance

*Goal: every acceptance criterion traced to evidence; proven on device.*

- [x] Task: Full gates — `CI=true pnpm check && CI=true pnpm test && pnpm build`; coverage + dist recorded — biome + tsc clean (77 files); Vitest 323/323 (32 files); coverage v8: 98.2% stmts / 90.92% branch / 100% funcs (skins.ts 100% stmts; synth.ts 97.29%; store.ts 98.71%); build green → dist 7.26 MB / 81 files, precache 79 entries / 7,413.33 KiB
- [x] Task: Teddy spot-sweep — skin cycle reaches teddy; one teddy level traced to completion (hop + celebrate); screenshots menu/pack/level/success; zero-text audit; offline probe (`qa-offline.mjs`) covers new assets — cycle: 4 taps from a clean save → storage `teddy` asserted; real-app pre-2 trace → `hop.png` + `success.png` (celebrate + confetti); screens recaptured (menu/pack/level/success/parent, no page errors); zero-text audit: no words on child surfaces (parent zone is the adult surface); offline: teddy preset boots from precache offline (storage-verified) + pre-2 trace SUCCESS — deterministic after the settle+assert fix [5d8a846]
- [x] Task: Perf spot-check — cold boot / fps sampling; device findings folded into the owner pass — cold boot to interactive 119ms (DCL 66ms, load 80ms, responseEnd 15ms); input-to-next-frame 2.7ms upper bound (budget <100ms); frame intervals during a full pre-2 trace: n=1,581 mean 4.28ms / p50 4.20ms / p95 4.30ms / max 83.5ms (single transition hitch); dist 7.26MB — top files: rive wasm 835KB, dino.riv 683KB, teddy.riv 435KB (5th); no page errors — headless-Edge bound; hardware verdict folded into the owner pass
- [ ] Task: Owner device pass — one teddy level on Android + iPad; music-box speaker check; verdict recorded
- [ ] Task: Acceptance criteria 1–10 evidence recorded (plan + git note)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
