# Implementation Plan: Trex — Sixth Skin (Toy T-Rex)

**Spec:** [spec.md](./spec.md) · **Track:** `trex-skin_20260917` (Feature) · **Methodology:** follows `conductor/workflow.md` — every task is TDD (failing tests first → implement → verify), gated by `pnpm check && pnpm test`; every phase closes with the Phase Verification & Checkpoint protocol.

**Delivery strategy:** art-first behind the owner's approval gate — the stylized master is generated and **explicitly approved** before any downstream build (Phase 1); the character is then built through the cast golden loop (cutout → poses → Rive → screenshot/browser verification, Phase 2); skin + voice are integrated with TDD (Phase 3); the remaining art (backdrop, face icon) lands as a batch (Phase 4); compliance, QA evidence, device pass and acceptance close it out (Phase 5). Work stays local on `track/trex-skin` — no push/PR/release (spec §Out of Scope).

## Phase 1 — Docs resync + stylized master (owner approval gate) [checkpoint: 59f7fc6]

*Goal: the context docs describe the sixth skin before implementation; the stylized character master exists in the house art language and is approved by the owner — the hard gate before any build work.*

- [x] Task: Context docs resync — before implementation per workflow.md [59f7fc6]
  - [x] `product.md`: sixth skin noted; out-of-scope line re-scoped (further skins remain pipeline work per the drop-in contract); dated note
  - [x] `tech-stack.md`: skins list gains trex; instruments list gains the new preset; dated note
  - [x] `dev/README.md`: character workspace list gains trex
- [x] Task: Reference prep + stylization candidates — copy `dev/.cf_token` into this worktree (from the main worktree; untracked); `gen2.mjs` img2img from `dev/gen/ref-trex.jpeg`; tune strength/seed; candidates inspected; raw reference + raws stay untracked — BLOCKED 2026-09-17: Workers AI daily free allocation exhausted (HTTP 429 / code 4006; shared account token); prerequisites verified ready (`dev/.cf_token`, `dev/gen/ref-trex.jpeg`, rive 1.0.2); resume after the 00:00 UTC reset (10:00 +10:00) — 3 candidates 2026-09-18 (`dev/gen/trex-cand-a..c.png`, strengths 0.6/0.75/0.9, seed 7); all viewed (a: shaded gradients; b: flat + clean; c: blush + cyan artifact)
- [x] Task: **Owner approval of the stylized master (hard gate)** — owner approved candidate B (`dev/gen/trex-cand-b.png`, strength 0.75, seed 7) 2026-09-18; canonical copy `dev/characters/trex/master.png`; downstream work unlocked
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Character build: cutout → poses → Rive → verification

*Goal: `public/rive/trex.riv` passes the cast golden loop — rest/blink/celebrate screenshots verified, headless browser test green, ≤ ~500 KB.*

- [~] Task: Pose sources from the approved master — base + celebrate (stomp/roar-jump proposal) + same-pose blink at low strength; regenerated sources get their own measurements — never inherit placements
- [ ] Task: Cutouts — base + celebrate + blink with the same `--box` discipline for pixel-aligned exports; verify by looking
- [ ] Task: Rive project `dev/characters/trex/` (from the dino4 template) — idle loop, celebrate swap, tap proxy, sparkles; `rive . --verify` → `inspect --json` (problems empty) → `--once` → screenshots rest / blink / celebrate — look at every PNG; size ≤ ~500 KB
- [ ] Task: Blink patch calibration — `composite.mjs` feathered patch; `gridshot.mjs` measurements; node placement recomputed from the crop rect; seam-free confirmation
- [ ] Task: Headless browser test + size/ship — `qa-trex.mjs` (harness `?char=trex` override + real-pointer trace) → completion → burst → success, no character error, page errors none; ship `public/rive/trex.riv`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Skin + voice integration (TDD)

*Goal: trex is a selectable, persisted skin with its new voice — code green, suite green.*

- [ ] Task: Skins registry + six-skin cycle (TDD)
  - [ ] Tests: trex carries id/character/backdrop/accent/instrument/face; unique ids; cycle dino→star→construction→animal→teddy→trex (wrap); unknown-id fallback intact; `settings.skin` round-trips trex — red → green; `app.test.ts` cycle walk extended to six taps
  - [ ] Implement `src/skins/skins.ts` (extend existing tests to six)
- [ ] Task: Sixth instrument preset (TDD)
  - [ ] Tests: `InstrumentId` includes the new id; preset = approved waveform/duration/gain; chimes + completion resolve through it; counted toy-piano notes unchanged; volume/mute respected — red → green
  - [ ] Implement `src/audio/synth.ts` — preset values confirmed by ear at the Phase 4 art review
- [ ] Task: Wiring sweep — `.riv` src resolution (`public/rive/trex.riv`); face/backdrop refs render on menu/pack/level/success; skin button + parent setter include trex; QA/harness enumerations updated where they list skins; `faces.mjs` row added
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — Remaining art: backdrop + face icon

*Goal: all trex art integrated and screenshot-approved; precache/size recorded.*

- [ ] Task: Backdrop — generate → optimize → `public/art/bg/trex.webp`; integrate; menu/pack/level/success screenshots (readability/contrast) approved
- [ ] Task: Face icon — trex head cutout → `public/art/face/trex.webp`; button-scale crispness verified (skin button + parent setter)
- [ ] Task: Precache/size checkpoint — SW glob covers new assets; `pnpm build` + `pnpm budget` green (or ceiling raised deliberately with fresh measurements, recorded); dist + precache entries vs v1.4.0 baseline recorded
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5 — Compliance, QA & acceptance

*Goal: every acceptance criterion traced to evidence; proven on device.*

- [ ] Task: Full gates — `CI=true pnpm check && CI=true pnpm test && pnpm build`; coverage + dist recorded
- [ ] Task: Trex spot-sweep — six-skin cycle reaches trex; one trex level traced to completion (hop + celebrate); screenshots menu/pack/level/success; zero-text audit; offline probe (`qa-offline.mjs`) covers new assets
- [ ] Task: Perf spot-check — cold boot / fps sampling; findings folded into the owner pass
- [ ] Task: Owner device pass — one trex level on Android + iPad; new-voice speaker check; verdict recorded
- [ ] Task: Acceptance criteria 1–10 evidence recorded (plan + git note)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
