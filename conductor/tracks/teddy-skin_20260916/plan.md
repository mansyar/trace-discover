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

## Phase 2 — Character build: cutout → poses → Rive → verification

*Goal: `public/rive/teddy.riv` passes the cast golden loop — rest/blink/celebrate screenshots verified, headless browser test green, ≤ ~500 KB.*

- [x] Task: Pose sources from the approved master — base + celebrate (arm-raised jump) + same-pose blink at low strength (regenerated sources get their own measurements — never inherit placements) — celebrate `--strength 0.55 --seed 11`, blink `--strength 0.28 --seed 7` (`dev/gen/teddy-celebrate.png`, `dev/gen/teddy-blink.png`); both viewed
- [x] Task: Cutouts — base + celebrate + blink with the same `--box` discipline for pixel-aligned exports; verify by looking — shared `--box=200,131,833,944`; base/jump/blink 600 px, viewed; blink shipped as feathered patch (`composite` rect 220,66→380,134, feather 12, margin 24 → 208×116) since the 0.28 regen jitters the whole figure (82 k px raw diff)
- [~] Task: Rive project `dev/characters/teddy/` (from the dino4 template) — idle loop, celebrate swap, tap proxy, sparkles; `rive . --verify` → `inspect --json` (problems empty) → `--once` → screenshots rest / blink / celebrate — look at every PNG
- [ ] Task: Blink patch calibration — `composite.mjs` feathered patch; `gridshot.mjs` measurements; node placement recomputed from the crop rect; seam-free confirmation
- [ ] Task: Headless browser test + size/ship — `node dev/qa/browsertest.mjs` (load, fire, real pointer tap, no page errors); `.riv` ≤ ~500 KB; ship `public/rive/teddy.riv`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Skin + voice integration (TDD)

*Goal: teddy is a selectable, persisted skin with its music-box voice — code green, suite green.*

- [ ] Task: Skins registry + five-skin cycle (TDD)
  - [ ] Tests: teddy carries id/character/backdrop/accent/instrument/face; unique ids; cycle dino→star→construction→animal→teddy (wrap); unknown-id fallback intact; `settings.skin` round-trips teddy
  - [ ] Implement `src/skins/skins.ts` (extend existing tests to five)
- [ ] Task: Music-box preset (TDD)
  - [ ] Tests: `InstrumentId` includes `musicbox`; preset = soft sine, long decay ~1.5 s, gentle gain; chimes + completion resolve through it; counted toy-piano notes unchanged; volume/mute respected
  - [ ] Implement `src/audio/synth.ts`
- [ ] Task: Wiring sweep — `.riv` src resolution (`public/rive/teddy.riv`); face/backdrop refs render on menu/pack/level/success; skin button + parent setter include teddy; QA/harness enumerations updated where they list skins
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — Remaining art: bedroom backdrop + face icon

*Goal: all teddy art integrated and screenshot-approved; precache/size recorded.*

- [ ] Task: Cozy-bedroom backdrop — generate → optimize → `public/art/bg/teddy.jpg`; integrate; menu/pack/level/success screenshots (readability/contrast) approved
- [ ] Task: Face icon — teddy head cutout → `public/art/face/teddy.png`; button-scale crispness verified (skin button + parent setter)
- [ ] Task: Precache/size checkpoint — SW glob covers new assets; dist + precache entries recorded vs baseline (6.71 MB / 76 entries)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5 — Compliance, QA & acceptance

*Goal: every acceptance criterion traced to evidence; proven on device.*

- [ ] Task: Full gates — `CI=true pnpm check && CI=true pnpm test && pnpm build`; coverage + dist recorded
- [ ] Task: Teddy spot-sweep — skin cycle reaches teddy; one teddy level traced to completion (hop + celebrate); screenshots menu/pack/level/success; zero-text audit; offline probe (`qa-offline.mjs`) covers new assets
- [ ] Task: Perf spot-check — cold boot / fps sampling; device findings folded into the owner pass
- [ ] Task: Owner device pass — one teddy level on Android + iPad; music-box speaker check; verdict recorded
- [ ] Task: Acceptance criteria 1–10 evidence recorded (plan + git note)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
