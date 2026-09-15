# Implementation Plan: Letters & Numbers Pack — Part 1: Numerals 0–9

**Spec:** [spec.md](./spec.md) · **Track:** `letters-numbers-pack_20260915` (Feature) · **Methodology:** follows `conductor/workflow.md` — every task is TDD (failing tests first → implement → verify), gated by `pnpm check && pnpm test`; every phase closes with the Phase Verification & Checkpoint protocol.

**Delivery strategy:** foundation-first — multi-stroke engine & schema v2 (Phase 1) before any content; then a playable numeral slice in the dev harness to prove feel on the trickiest glyphs (4, 8) while content is still cheap to change (Phase 2); the reward layer next — star buddy, toy-piano preset, counted celebration (Phase 3); art batch + progress integration (Phase 4); compliance sweep (Phase 5); device validation with the toddler (Phase 6). Work stays local on `track/letters-numbers-pack` — no push/PR/release (spec §Out of Scope).

## Phase 1 - Multi-stroke engine & schema v2 (TDD core) [checkpoint: 5823b14]

*Goal: an ordered multi-stroke level is fully traceable — engine, renderer, assists, checkpoints, save — with v1 content and behavior untouched.*

- [x] Task: Update `tech-stack.md` (schema v2 notes, before implementation per workflow.md §7) [8f0e682]
  - [x] Add dated note: level schema v2 (ordered strokes), save schema v2 (additive pack fields + migration), pack screen pattern
  - [x] Verify: no contradiction with existing entries
- [x] Task: Level schema v2 — ordered strokes (TDD) [92fac21]
  - [x] Tests: per-stroke validation (non-empty, ≥2 control points, margins, finite), stroke order preserved, v1 `controlPoints` normalized to a single stroke, `levelToPath` per stroke
  - [x] Implement schema/types + validation in `themes/level.ts`
- [x] Task: Trail engine — multi-stroke sequencing (TDD) [0fe3b9f]
  - [x] Tests: stroke completed → advance to next; per-stroke frontier; lift keeps completed strokes and resumes mid-stroke; crossing-path fixture (figure-8 shape) tracking not corrupted by nearest-point ambiguity; progress never decreases; single-stroke parity with v1
  - [x] Implement in `engine/trail.ts` (pure, frame-step API preserved)
- [x] Task: Checkpoints & completion across strokes (TDD) [a35e939]
  - [x] Tests: per-stroke segment boundaries, ordered chime events across the sequence, completion only after the final stroke
  - [x] Implement in `engine/checkpoints.ts`
- [x] Task: Assists across strokes (TDD) [73c6847]
  - [x] Tests: nudge/hint target the active stroke; auto-assist counter across strokes; parent override still effective
  - [x] Implement in `engine/assists.ts`
- [x] Task: Multi-stroke render states (TDD) [dab76ee]
  - [x] Tests: state model — active (glow + marching dots + start star) vs completed (painted) vs upcoming (faint); whole numeral visible; completion choreography only after final stroke
  - [x] Implement in `render/renderPath.ts` + stroke state helper
- [x] Task: Save schema v2 + migration (TDD) [4fc45b2]
  - [x] Tests: additive pack fields; v1 → v2 lossless migration; corrupt-JSON recovery unchanged; existing consumers unaffected
  - [x] Implement in `save/store.ts`
- [x] Task: Dev harness multi-stroke support (play/tune previews for multi-stroke levels) [5823b14]
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Numbers pack slice (first playable) [checkpoint: 1886ae1]

*Goal: pack catalogue + all 10 numeral definitions + pack screen, traceable end-to-end in the dev harness with placeholder rewards; feel verified on device for 3, 4 and 8.*

- [x] Task: Content doc — numeral formation table (`content.md` in this track folder) [25a17ab]
  - [x] Author 0–9: stroke order/direction, start marks, stroke counts (4 = two strokes), checkpoint counts, goal refs
  - [x] Stroke-direction checklist mirroring the v1 content workflow (0 = top CCW; 1 = top→bottom; …)
- [x] Task: Pack catalogue + progress model (TDD) [7af8a91]
  - [x] Tests: pack entry shape (pack id, 10 numerals, badge); playable ids; next-level wrap 0→…→9; progress read from save v2; badge-on-all-10 logic
  - [x] Implement pack catalogue (`themes/catalog.ts` extension or new pack module)
- [x] Task: Author numeral level data 0–9 [67b692e]
  - [x] Implement level defs per content doc (strokes, goal placement) with `validateLevel` clean
  - [x] Headless screenshot QA per numeral (start/goal/direction)
- [x] Task: Pack screen UI (zero-text) [3d67c35]
  - [x] 10 numeral cards + 10 sticker slots + badge spot; cleared state shows sticker; 90px+ targets; safe-area + letterbox as v1
  - [x] Wired to save v2 progress; screens-harness QA
- [x] Task: Menu pack card + navigation wiring (TDD) [5122e66]
  - [x] Tests: menu → pack → numeral → success → pack transitions; replay/next/home behavior for numerals
  - [x] Implement card (placeholder "123" art) + flow wiring
- [x] Task: Device feel check via LAN — trace 3 (easy), 4 (two-stroke), 8 (crossing); tune tolerance/speed/nudge if needed; record findings [1886ae1]
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Star buddy, audio & counted celebration [checkpoint: bbd9e43]

*Goal: the reward layer live — star guide hops/celebrates; toy-piano preset; numeral-aware completion (N hops + N notes; 0 special).*

- [x] Task: Star buddy asset pipeline — generate concepts (Workers AI) → pick variant → cutout → RML → build `star.riv` (verify/inspect/screenshot loop; ≤ ~500 KB) [5b565fd]
- [x] Task: Character wiring — idle + celebrate triggers; counted-hop sequencing (TDD) [bababb4]
  - [ ] Tests: N-hop timeline math (waypoints, burst point, pacing caps); 0 special-treatment timeline
  - [ ] Implement via the existing character abstraction (`character/`); harness preview
- [x] Task: Audio — toy-piano/xylophone preset + counted notes (TDD) [c71b09d]
  - [x] Tests: preset note/envelope params within the pentatonic mapping; completion N-note run (0 variant); existing presets untouched
  - [x] Implement in `audio/synth.ts` (+ preset registry)
- [x] Task: Completion choreography integration — glow → N counted hops with notes → celebrate → confetti → sticker fly-in → success [bbd9e43]
  - [x] Replace the placeholder reward path in the app loop; wire the 0 treatment; screens QA
- [x] Task: Device feel check of the full loop via LAN → tune N-hop pacing (e.g., cap) if needed; record findings — device-verified 2026-09-15: hops, notes and the 0 ring move all feel right; no tuning needed
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — Art batch, stickers & progress integration [checkpoint: 0ec8bd7]

*Goal: real art everywhere + full persistence — the pack is feature-complete.*

- [x] Task: Art batch via Workers AI — "123" card/header art, 10 goal arts (numeral + count vignette), 10 stickers, pack badge → cutout/optimize/composite → screenshot approval [3a9bcac]
- [x] Task: Goal + sticker art integration — renderer goal art, sticker slots, fly-in; pack badge award flow (10th sticker → pack celebration → badge, mirroring themes) [7600ea6]
- [x] Task: Menu card final states — fresh / in-progress / badge; real art integrated [bac955e]
- [x] Task: Parent zone — pack reset + easier-tracing coverage (TDD) [2d6498c]
  - [x] Tests: reset clears pack fields only after confirm; easier tracing affects numerals; volume/mute applies to the new preset
- [x] Task: Persistence E2E — relaunch state + v1→v2 migration on a real v1 save fixture (TDD + manual) [0ec8bd7]
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5 — Compliance & QA sweep [checkpoint: 3d5c1fa]

*Goal: offline, zero-text, right-sized, measured — the pack ships within every v1 constraint.*

- [x] Task: Build + precache/size verification — SW glob covers new assets (.riv, PNGs); dist within budget; offline cold-start probe (`spike/qa-offline.mjs`) from preview [4ce0da1]
- [x] Task: Zero-text + 90px audit of new surfaces (menu card, pack screen, success overlays) — screenshot evidence — audit 2026-09-15: vision reports "(no text)" on menu, pack and success screenshots; code scan: fillText only in parent-zone functions; targets: numeral cards 96px, home Ø90, success buttons Ø96, menu pack card full width (badge on the pack screen is display-only)
- [x] Task: Perf spot-checks — multi-stroke rendering fps sampling (mid-range Android + base iPad), cold start; fix if warranted [a307ba8]
- [x] Task: v1 regression sweep — 3 worlds + bonuses quick pass (screens harness + device spot-checks); full test suite green [3d5c1fa]
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 6 — Device validation & acceptance

*Goal: proven on real hardware with the actual toddler; every acceptance criterion traced to evidence.*

- [x] Task: Install/offline re-check on Android + iPad with pack assets cached; rotation/gesture spot-checks — evidence: both devices user-confirmed 2026-09-15 (double refresh picked up the pack build; airplane-mode relaunch boots and plays fully offline; rotation letterboxes cleanly; stray touches leave progress intact) — evidence in plan commit note
- [x] Task: Independent-play session — toddler completes ≥1 numeral unaided; multi-stroke (4) + crossing (8) verified; friction notes → polish pass — evidence: 2026-09-15 session - toddler completed numerals unaided; the two-stroke 4 and crossing 8 both played correctly; no friction notes (no polish pass needed)
- [ ] Task: Acceptance criteria 1–8 evidence recorded (plan + git note)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
