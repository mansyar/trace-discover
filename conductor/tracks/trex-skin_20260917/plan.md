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

## Phase 2 — Character build: cutout → poses → Rive → verification [checkpoint: 003e04f]

*Goal: `public/rive/trex.riv` passes the cast golden loop — rest/blink/celebrate screenshots verified, headless browser test green, ≤ ~500 KB.*

- [x] Task: Pose sources from the approved master — base (= approved master) + celebrate + same-pose blink; first attempt (0.55/0.28) rendered photoreal — rejected; style-forward retry: celebrate v2a (0.75/seed 11) + blink v2a (0.45/seed 7) selected, both viewed 2026-09-18 (`dev/gen/trex-celebrate-v2a.png`, `dev/gen/trex-blink-v2a.png`); sources keep their own measurements — never inherit placements
- [x] Task: Cutouts — base + celebrate + blink with the same `--box` discipline for pixel-aligned exports; verify by looking — auto pass measured content bboxes (master 230,142→875,927 · celebrate 204,139→868,903 · blink 234,147→876,928); union box `204,139,876,928` re-cut at 600 px: base.png 290,157 B · jump.png 308,922 B · blink.png 301,638 B; all viewed — clean edges, identical framing
- [x] Task: Rive project `dev/characters/trex/` (from the dino4 template) — idle loop, celebrate swap, tap proxy, sparkles; `rive . --verify` → `inspect --json` (problems empty) → `--once` → screenshots rest / blink / celebrate — look at every PNG; size ≤ ~500 KB — scene adapted from the teddy/dino4 template (ids, state machine, listener, sparkles); 426-px cast norm via 480-px cutouts @ scale 0.8875 (dino's scale); verify 0 errors, inspect problems empty; rest/blink/giggle screenshots viewed; celebrate via throwaway rig (EntryState→celebrate; jump art aligns, sparkles + shadow squash) `dev/gen/trex-celebrate-f25/f45.png`; riv 436,355 B — QC fix 2026-09-18 (owner caught a 3-arm artifact in the first celebrate pose): regenerate v3c (0.85/seed 55, both arms up, no hanging arm); shared box widened to 150,129,878,934 @ 490 px (base/blink re-cut for alignment, node offsets recomputed); celebrate re-verified via rig; riv now 463,868 B (under the ~500 KB norm)
- [x] Task: Blink patch calibration — `composite.mjs` feathered patch; `gridshot.mjs` measurements; node placement recomputed from the crop rect; seam-free confirmation — eye measured via gridshot (297,95→402,195 on the 600 cutout); feathered patch via `composite.mjs` (rect 232,70,328,164 · feather 7 · margin 24 at 480 px; crop 208,46→352,188); node placement recomputed from the crop center (scale-invariant: x=35.5 y=−113); seam/alignment confirmed in scene screenshot + fine-grid zoom (no ghost, no halo); patch 27,897 B — final re-cut @ 490 px (see character-build QC note): rect 251,76,348,170 · feather 8 · margin 24; crop 227,52→372,194; node x=31.2 y=−117.5 (offset model validated across 600/520/480/490 geometries)
- [x] Task: Headless browser test + size/ship — `qa-trex.mjs` (harness `?char=trex` override + real-pointer trace) → completion → burst → success, no character error, page errors none; ship `public/rive/trex.riv` — `qa-trex.mjs`: idle/hop/success captured, TRACE SUCCESS (chimes 3/6→6/6, complete!, burst!, success), no character error, page errors none; first shipped 436,355 B — re-shipped 463,868 B after the celebrate QC fix; `qa-trex.mjs` re-run green on the final build
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [003e04f]

## Phase 3 — Skin + voice integration (TDD) [checkpoint: b4ee347]

*Goal: trex is a selectable, persisted skin with its new voice — code green, suite green.*

- [x] Task: Skins registry + six-skin cycle (TDD) [0443aca] — trex entry (`#d9a066` accent, `squeak` voice, `/art/bg/trex.webp` + `/art/face/trex.webp`); red→green (10 failing tests across skins/app/store); art landed early so the artRefs invariant stays green
  - [ ] Tests: trex carries id/character/backdrop/accent/instrument/face; unique ids; cycle dino→star→construction→animal→teddy→trex (wrap); unknown-id fallback intact; `settings.skin` round-trips trex — red → green; `app.test.ts` cycle walk extended to six taps
  - [ ] Implement `src/skins/skins.ts` (extend existing tests to six)
- [x] Task: Sixth instrument preset (TDD) [bfa18be] — `squeak` = triangle, 0.35 s, gain 0.48 (provisional — confirmed by ear at the art review); registry + giggle-timbre tests extended
  - [ ] Tests: `InstrumentId` includes the new id; preset = approved waveform/duration/gain; chimes + completion resolve through it; counted toy-piano notes unchanged; volume/mute respected — red → green
  - [ ] Implement `src/audio/synth.ts` — preset values confirmed by ear at the Phase 4 art review
- [x] Task: Wiring sweep — `.riv` src resolution (`public/rive/trex.riv`); face/backdrop refs render on menu/pack/level/success; skin button + parent setter include trex; QA/harness enumerations updated where they list skins; `faces.mjs` row added [b4ee347] — faces.mjs trex row (box 75,0→375,300 on the 490 cut); qa-cast trex giggle + flourish cases; README row; refs resolve through `SKINS`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [b4ee347]

## Phase 4 — Remaining art: backdrop + face icon [checkpoint: 5a2ea94]

*Goal: all trex art integrated and screenshot-approved; precache/size recorded.*

- [x] Task: Backdrop — generate → optimize → `public/art/bg/trex.webp`; integrate; menu/pack/level/success screenshots (readability/contrast) approved — playroom candidate A (owner pick); 1024×1024 WebP 28,086 B via `opt-art.mjs`; screens captured `dev/qa/out/trex-art/*` (menu/pack/level/success/parent) — readability good
- [x] Task: Face icon — trex head cutout → `public/art/face/trex.webp`; button-scale crispness verified (skin button + parent setter) — faces.mjs trex row (hand-placed box 75,0→375,300 on the 490 cut); 9,052 B WebP; crisp at button scale in menu + parent shots
- [x] Task: Precache/size checkpoint — SW glob covers new assets; `pnpm build` + `pnpm budget` green (or ceiling raised deliberately with fresh measurements, recorded); dist + precache entries vs v1.4.0 baseline recorded — build 5,224,739 B / 141 entries; ceiling re-anchored deliberately to 5.60 MB / 150 (tool history + dev/README + tech-stack); v1.4.0 ref 4,674,512 B / 138 entries (+550,227 B, +3 entries)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [5a2ea94]

## Phase 5 — Compliance, QA & acceptance [checkpoint: edf66ce]

*Goal: every acceptance criterion traced to evidence; proven on device.*

- [x] Task: Full gates — `CI=true pnpm check && CI=true pnpm test && pnpm build`; coverage + dist recorded — check 108 files clean; tests 592/592; build 141 precache entries / 5,076.64 KiB; budget 5,224,739 / 5,600,000 B + 141/150 PASS; coverage skins.ts 100% · synth.ts 97.67% (render.ts visual module, QA-covered — pre-existing baseline)
- [x] Task: Trex spot-sweep — six-skin cycle reaches trex; one trex level traced to completion (hop + celebrate); screenshots menu/pack/level/success; zero-text audit; offline probe (`qa-offline.mjs`) covers new assets — cycle reaches trex (qa-trex-screens asserts); pre-2 traced to completion incl. hop + celebrate (qa-trex + qa-trex-screens); screens `dev/qa/out/trex-art/*`; zero-text: no kid-facing text introduced (iconographic surfaces; parent hint + grown-ups labels are the designed adult zones); qa-offline with the skin arg: trex assets boot + trace fully offline
- [x] Task: Perf spot-check — cold boot / fps sampling; findings folded into the owner pass — dist 4.98 MB on-disk; cold boot to interactive 142 ms; input-to-next-frame 2.4 ms; trace frame interval mean 4.27 ms · p50 4.20 · p95 4.30 · max 87.60 (headless desktop smoke bound — folded into the owner pass)
- [x] Task: Owner device pass — one trex level on Android + iPad; new-voice speaker check; verdict recorded — owner pass Android + iPad 2026-09-18: cycle → trex, one trex level, squeak speaker check — "all good"
- [x] Task: Acceptance criteria 1–10 evidence recorded (plan + git note) — recorded in this plan + Phase 5 git note: AC1 approval gate 2026-09-18 · AC2 six-skin cycle + wrap + persistence + parent setter + fallback · AC3 rest/blink/celebrate approved · AC4 backdrop + face approved · AC5 squeak on chimes + completion, counted notes unchanged, ear + speaker check · AC6 zero-text audit · AC7 offline probe covers trex · AC8 riv 463,868 B ≤ 500 KB + budget PASS (5.60 MB re-anchor) · AC9 checks/QA green + sweep evidence · AC10 docs synced + device pass
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [edf66ce]
