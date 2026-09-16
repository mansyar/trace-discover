# Implementation Plan: Payload Diet & Dino Rebuild

**Spec:** [spec.md](./spec.md) · **Track:** `payload-diet_20260916` (Chore) · **Methodology:** follows `conductor/workflow.md` — every phase closes with the Phase Verification & Checkpoint protocol. **Chore-adapted TDD:** the existing Vitest suite is the regression harness; the one piece of new app-adjacent logic (art-reference test) is written test-first; dev-only scripts (`reencode-art`, `dist-budget`) are verified mechanically (sample runs + negative controls + screenshots), mirroring the `repo-organization` precedent. Test edits are limited to pinned URL literals — any other red test signals an accidental behavior change: stop and fix the cause.

**Delivery strategy:** docs-first (tech-stack policy + baseline measurement), then the shipped-art re-encode + reference integration, then the dino rebuild, then the budget guard + CI wiring, then full-gate close-out. Work stays local on `track/payload-diet` — no push/PR/release (spec §Out of Scope).

## Phase 1 — Docs first + baseline measurement [checkpoint: 503b817]

*Goal: the format policy is written before anything changes (workflow.md: Tech Stack is Deliberate), and the before-numbers are pinned for the after/after table.*

- [x] Task: Context docs resync — `tech-stack.md`: shipped-raster-format policy (WebP for art; PNG stays for icons/favicons), pipeline note, current size baseline (~10.31 MB / 148 precache entries) (documented before implementation per workflow.md) [817fef7]
- [x] Task: Baseline measurement — `pnpm build`; record dist total bytes, precache entry count, and per-category breakdown (art 6.39 MB · rive 1.87 MB · other) as the before/after reference [503b817]
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [40ae0c8]

## Phase 2 — Shipped art re-encode + reference integration [checkpoint: dced3d3]

*Goal: `public/art/**` is all WebP at identical dimensions; every reference follows; suite green.*

- [x] Task: Re-encode tool (`dev/tools/reencode-art.mjs`) — encodes from the shipped lossless files (identical dimensions + appearance by construction; `dev/art-src` is pre-opt/larger and not dimension-equivalent so it is not used), per-class quality (cutouts ≈0.85 lossy-with-alpha, backdrops ≈0.8); stages `.webp` + `manifest.json` (bytes/dims/RMSE) + per-class contact sheets + worst-diff 1:1 focus sheet into ignored `dev/qa/out/reencode/` (mechanical verification: deterministic re-run, metrics review, sheet read-back) [d91ed7c]
- [x] Task: Art-reference test (TDD: Red first) — every app-referenced art URL resolves to an existing `public/` file with the expected extension; **Red** while legacy `.png`/`.jpg` refs or files remain; hostile case (missing file) must fail [3af4ca5]
- [x] Task: Approve & migrate — owner side-by-side approval per class → reference sweep (`src/{packs,app,skins}` literals + pinned tests; Workbox `globPatterns` += `webp`; dev tooling reads; `git grep` clean) → delete originals → suite **Green** (+gap check: no legacy raster under `public/art/**`) [b7edb71]
- [x] Task: Pipeline forward-fix — shipped-art emitters (`opt-art` / `opt-pre` / `card` / `gen-rewards` / `faces` / `vignette` / `letters-compose`) default to WebP with the tuned per-class qualities; `dev/README.md` documents the shipped-format policy (mechanical verification: re-run one emitter on a sample asset) [dced3d3]
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [dced3d3]

## Phase 3 — `dino.riv` rebuild

*Goal: dino closes its standing deviation at cast standard, with parity proven.*

- [ ] Task: Rebuild `dino.riv` from `dev/characters/dino4/` with the cast patch technique — `rive --verify` clean; size recorded (target ~460 KB, ≤ 500 KB guideline); same state machine (autoplay idle + `celebrate`)
- [ ] Task: Verification — Rive screenshots (idle/jump/blink) + in-app browser burst (mid-blink vs rest) + cast parity; **fallback:** revert and keep the deviation open with a dated note if parity can't hold within budget
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — Budget guard + CI gate

*Goal: the diet can't silently regress — checked locally and in CI, with fail behavior proven.*

- [ ] Task: `dev/tools/dist-budget.mjs` + `pnpm budget` — dist total + precache entries with breakdown; ceilings derived from the measured post-diet build (documented headroom); clear failure message (mechanical verification: pass + negative control with a temporarily lowered ceiling)
- [ ] Task: Docs + CI wiring — ceilings/rationale in `README.md` + `dev/README.md` + `tech-stack.md`; `ci.yml` step after build runs `pnpm budget`; local negative-control evidence recorded (actual CI failure proof lands with the owner's first push)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5 — Compliance & close-out

*Goal: measured, verified, documented — acceptance criteria 1–8 traced to evidence.*

- [ ] Task: Full gates — `CI=true pnpm check && CI=true pnpm test`, `pnpm build`, `pnpm budget`; before/after table recorded (dist, entries, per-category, `dino.riv` bytes); coverage recorded
- [ ] Task: QA sweep — app/letters journey + `qa-offline` (WebP precached; offline cold start) + `qa-perf` spot-check (boot within baseline); screenshots; device pass Android + iPad (owner)
- [ ] Task: Docs close-out + acceptance evidence (criteria 1–8) + git notes
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
