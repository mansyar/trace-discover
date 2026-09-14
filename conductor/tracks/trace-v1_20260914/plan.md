# Implementation Plan: Trace & Discover! — v1 MVP

**Spec:** [spec.md](./spec.md) · **Methodology:** follows `conductor/workflow.md` — every task is TDD (failing tests first → implement → verify), gated by `pnpm check && pnpm test`; every phase closes with the Phase Verification & Checkpoint protocol.

**Delivery strategy:** "is-it-fun first" — a playable dino slice (Phases 1–3) before shell/content breadth (4–5), then PWA compliance (6) and device validation (7).

## Phase 1 — Project Scaffold & Foundations [checkpoint: b8933ca]

*Goal: bootable Vite + TS + PWA-ready skeleton with quality tooling wired.*

- [x] Task: Scaffold the app (Vite + TypeScript strict + pnpm) [603ca2e]
  - [x] Create `package.json`, `vite.config.ts`, strict `tsconfig.json`, `index.html` shell, `src/` structure
  - [x] Configure Biome (aligned with `conductor/code_styleguides/`) + `pnpm check` (Biome + `tsc --noEmit`)
  - [x] Configure Vitest + `pnpm test`; scripts: `dev` / `serve` / `build` / `preview` / `check` / `test`
  - [x] Verify: clean scaffold — checks pass, dev server serves the shell
- [x] Task: Shell utilities (TDD) [5d6e655]
  - [x] Tests: DPR canvas sizing + letterbox play-field rect math
  - [x] Implement: viewport sizing, DPR scaling, letterbox helper, no-zoom meta, `touch-action: none`, safe-area CSS
  - [x] Verify on a real phone via LAN
- [x] Task: Asset intake from spike [fdf6355]
  - [x] Add `@rive-app/canvas-lite`; place `dino4.riv` in app assets; `.riv`/`.wasm` MIME verified in dev + build
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Trail Engine (TDD core) [checkpoint: 3697e9d]

*Goal: tracing math + rendering proven in a dev harness.*

- [x] Task: Path geometry [08c1c63]
  - [x] Tests: Catmull-Rom smoothing, constant-pixel resampling, cumulative lengths, nearest-point/tangent queries
  - [x] Implement `engine/path.ts` + level control-point schema types
- [x] Task: Trail-tip state machine [73a7de4]
  - [x] Tests: frontier advance within tolerance, capped speed (fast swipe cannot skip), lift keeps progress, progress never decreases, resume-from-frontier on new touch
  - [x] Implement `engine/trail.ts` (pure, frame-step API)
- [x] Task: Checkpoints & events [d4083c2]
  - [x] Tests: segment boundaries, ordered progress, chime event emission, completion detection
  - [x] Implement `engine/checkpoints.ts`
- [x] Task: Assists [629a32d]
  - [x] Tests: 2 s nudge timing + target math, 4 s hint state, auto-assist (3 nudges → widened tolerance), parent override
  - [x] Implement `engine/assists.ts`
- [x] Task: Renderer [b9bbec3]
  - [x] Tests: draw-list math (ribbon offsets, dotted spacing, paint-fill reveal)
  - [x] Implement `render/renderPath.ts` (ribbon + outline + marching dots + paint-fill + stars) with theme palettes
- [x] Task: Input binding [a4dbb34]
  - [x] Tests: pointer→canvas mapping incl. letterbox + DPR; `isPrimary`-only filtering; multi-touch ignore
  - [x] Implement `input/pointer.ts`
- [x] Task: Dev harness page (`levels/tune.html` equivalent) for device feel-testing [3697e9d]
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — First Playable Level ("is it fun" slice) [checkpoint: 4b6fe41]

*Goal: dino L1 + L2 fully playable on a phone: trace → chimes → hop → celebrate → sticker → success.*

- [x] Task: Level data + dino levels [6fd0774]
  - [x] Tests: level schema validation; L1/L2 data sanity (endpoints, left→right direction)
  - [x] Implement `themes/dino.ts` with L1/L2 control points + goal placement
- [x] Task: Character integration (Rive) [4d15078]
  - [x] Wire `@rive-app/canvas-lite`; load `dino4.riv`; idle autoplay; celebrate trigger from JS; resize handling
  - [x] Component tests for the Rive wrapper (load/trigger API with mocked runtime)
- [x] Task: Audio engine v1 [cda8072]
  - [x] Tests: pentatonic mapping (checkpoint index → note), envelope/pitch math, unlock state machine
  - [x] Implement `audio/synth.ts` (marimba-ish preset); chime per checkpoint; chord resolve + arpeggio on completion
- [x] Task: Completion choreography [ce40f8e]
  - [x] Tests: hop timeline math (waypoints along traced path, 50% burst point), deterministic confetti particle step
  - [x] Implement sequence: path glow → hop → celebrate at goal → confetti → sticker fly-in → success overlay
- [x] Task: Success screen (3 icons) + replay/next/home wiring; placeholder sticker art [4b6fe41]
- [x] Task: On-device feel test via LAN + tune tolerance/speed/nudge defaults (findings: defaults confirmed on device 2026-09-15, no tuning needed)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — Shell, Navigation & Persistence

*Goal: the full app loop around the engine — menu → theme → level → rewards, with saved progress.*

- [x] Task: Save module (TDD) [2363803]
  - [x] Tests: typed schema, load/migrate/save, corrupt-JSON recovery, sticker+badge state, settings, auto-assist state
  - [x] Implement `save/store.ts`
- [ ] Task: Screen router (TDD)
  - [ ] Tests: transitions menu → theme → level → success → (badge) → theme; home always reachable
  - [ ] Implement `app/router.ts`
- [ ] Task: Boot splash + Main Menu (3 theme cards, parent-gate corner zone)
- [ ] Task: Theme screen (4 level cards + 4 sticker slots + badge spot) wired to save
- [ ] Task: Parent zone UI (2-finger hold gate; volume, easier tracing, reset with confirm, install guide text)
- [ ] Task: Badge + bonus flow (4th sticker → theme celebration → badge + bonus circle → finale)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5 — Full Content (12 + 3)

*Goal: every level, character, backdrop, goal and sticker in place, via the assembly line.*

- [ ] Task: Content spec pass (cast per theme, goals, sticker motifs, checkpoint counts, stroke-direction checklist)
- [ ] Task: Generate art batch via Workers AI (3 backdrops, remaining characters + pose variants, goal art, 12 stickers + badge) → cutout tools
- [ ] Task: Build `.riv` cast via the rive-cli skill (per character: RML → verify/inspect/screenshot loop → ≤~500 KB)
- [ ] Task: Author remaining level data (construction L1–L4, animal L1–L4, all 3 bonuses); validate directions
- [ ] Task: Full-level QA pass (headless screenshot harness per level + manual device run of every level)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 6 — PWA & Compliance Polish

*Goal: installable, offline, measured, audited — deployable.*

- [ ] Task: Manifest + icons (star-on-path, 192/512/maskable) + `vite-plugin-pwa` precache config; offline cold-start test
- [ ] Task: Orientation/safe-area audit (phone portrait + iPad landscape letterboxed, rotation mid-level safe, gesture insets)
- [ ] Task: NFR measurement pass (fps sampling, load times, ≤ ~10–15 MB) → fix findings
- [ ] Task: Zero-text + 90px targets visual audit on every child screen
- [ ] Task: Cloudflare Pages deploy config (static `dist/`) + dry run
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 7 — Device Validation & Acceptance

*Goal: proven on the actual hardware, with the actual toddler.*

- [ ] Task: Install on test Android phone + iPad; offline re-launch; gesture/rotation spot-checks
- [ ] Task: Independent-play observation session → capture friction notes → fix pass
- [ ] Task: Run every acceptance criterion (spec §Acceptance Criteria) and record evidence
- [ ] Task: Final polish fixes; re-verify affected criteria
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
