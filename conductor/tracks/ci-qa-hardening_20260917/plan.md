# Implementation Plan: CI/QA hardening — browser smoke, coverage gate, stale sweep

**Spec:** [spec.md](./spec.md) · **Track:** `ci-qa-hardening_20260917` (Chore) · **Methodology:** follows `conductor/workflow.md` — verification-first: every gate introduced gets a recorded negative control proving it bites; commit + git note per task (7-char SHA recorded here); every phase closes with the Phase Verification & Checkpoint protocol.

**Delivery strategy:** foundation first (docs of record → deterministic dev installs → stale sweep), then the smoke script proven locally (≥5 green + sensitivity control), then CI wiring with the branch pushed and a draft PR so GitHub runs become the evidence trail (including a controlled red run for the failure path), then coverage thresholds calibrated from the measured baseline, then a full acceptance sweep and owner handoff. No `src/` app-code change; budget unaffected. Push + PR are part of this track (CI evidence requires them); merge and release remain owner decisions.

## Phase 1 — Docs of record + deterministic dev workspace + stale sweep [checkpoint: 9f3fb0d]

*Goal: the context docs describe the CI/QA hardening before implementation; QA tooling installs deterministically; the four stale scripts are gone.*

- [x] Task: Context docs resync — before implementation per workflow.md [43085cd]
  - [x] `conductor/tech-stack.md`: dated note — CI browser smoke (preinstalled Edge on `ubuntu-latest`, no browser downloads), enforced coverage thresholds (calibrated values), `dev/pnpm-lock.yaml` tracked for frozen installs
  - [x] Commit + git note
- [x] Task: Deterministic dev QA deps [8287787]
  - [x] Remove the `dev/pnpm-lock.yaml` ignore (`.gitignore`); regenerate the lockfile with the repo's pnpm (12.4.1); verify `pnpm --dir dev install --frozen-lockfile` no-ops clean; commit the lockfile
  - [x] `dev/README.md`: deps paragraph updated (tracked lockfile; frozen installs)
  - [x] Commit + git note
- [x] Task: Stale sweep [9f3fb0d]
  - [x] Delete `dev/qa/qa-diag-pre3.mjs`, `dev/qa/qa-probe.mjs`, `dev/qa/browsertest.mjs`, `dev/qa/serve.mjs`
  - [x] Repo-wide grep sweep: README rows removed; rive-cli skill refs found + fixed; archive mentions left frozen; sweep recorded
  - [x] Commit + git note
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Canonical smoke script, proven locally [checkpoint: a226c87]

*Goal: `qa-smoke.mjs` is the trustworthy canonical smoke — ≥5 consecutive green runs, and proven red on a broken build.*

- [x] Task: Write `dev/qa/qa-smoke.mjs` [16c2ca9]
  - [x] Adapt launch/tap/trace routine from `qa-app.mjs` / `qa-pre-pack.mjs`: splash → `pack:pre` → `level:pre-1` → trace → success; channel env-overridable (default `msedge`); base URL arg/env (default `http://localhost:4173`); page-error collection → non-zero exit
  - [x] Screenshots + findings log into `dev/qa/out/` (git-ignored); clean diagnostics; no retries
  - [x] Evidence: `pnpm build` + preview → ≥5 consecutive green runs recorded
  - [x] Commit + git note
- [x] Task: Negative control — sensitivity proof [2815a49]
  - [x] Temporary boot-failure patch (`src/main.ts`) → build → smoke red (screenshot + log captured) → revert → green; evidence recorded (empty evidence commit permitted)
  - [x] Commit + git note
- [x] Task: Runbook — `dev/README.md` gains the `qa-smoke` row (canonical) + usage note (two-terminal pattern) [a226c87]
  - [x] Commit + git note
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — CI wiring + recorded runs [checkpoint: 25b107b]

*Goal: every PR boots the real app on GitHub's Edge; the failure path (red step, best-effort artifact) is proven on a live run.*

- [x] Task: `ci.yml` wiring [7853f66]
  - [x] Add frozen dev-tooling install (`working-directory: dev`); extend `cache-dependency-path` with `dev/pnpm-lock.yaml`
  - [x] Add smoke step after `pnpm budget`: background `pnpm preview` + readiness loop + `node dev/qa/qa-smoke.mjs`
  - [x] Job timeout 15 → 20 min; failure-only artifact upload (`dev/qa/out/`, best-effort, `if-no-files-found: ignore`)
  - [x] Commit + git note
- [x] Task: Push + draft PR + failure-path control [25b107b]
  - [x] Push `track/ci-qa-hardening`; open draft PR → CI fires
  - [x] Temporary commit forcing smoke failure → confirm the run reddens at the smoke step only and the artifact step stays best-effort; record run URLs; revert
  - [x] Commit + git note
- [x] Task: Green end-to-end CI evidence [ccbbb53]
  - [x] Final state green; record run URL + step timings (smoke's added wall time vs 20 min budget)
  - [x] Commit + git note
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — Coverage enforcement

*Goal: coverage is a gate that provably bites, calibrated to the measured baseline.*

- [x] Task: Thresholds in `vite.config.ts` [8143243]
  - [x] Global thresholds (statements 72 / branches 76 / functions 88 / lines 72 — ≤ ~1.5 pt headroom vs measured 72.88 / 77.55 / 89.57 / 72.42; exact ints re-checked at implementation); plain `pnpm test` unaffected
  - [x] Local `pnpm test --coverage` green; record the covered summary line
  - [x] Commit + git note
- [x] Task: Negative control — temporary threshold raise → coverage red → revert → green; recorded [7549bbf]
  - [x] Commit + git note
- [x] Task: CI evidence — push; PR run shows the gate enforced and green; recorded [f95910b]
  - [x] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5 — Acceptance sweep + owner handoff

*Goal: every acceptance criterion traced to evidence; PR ready for the owner.*

- [ ] Task: Full local gates + docs final
  - [ ] `CI=true pnpm check && CI=true pnpm test --coverage && pnpm pack:check && pnpm build && pnpm budget`; dist size/entries vs baseline recorded (expect unchanged)
  - [ ] Docs consistency pass (`dev/README.md`, `tech-stack.md`); acceptance 1–7 evidence collected (runs, screenshots, greps, timings) into plan + git note
  - [ ] Commit + git note
- [ ] Task: Final PR + handoff
  - [ ] Mark PR ready for review; summarize evidence; merge/release remain with the owner
  - [ ] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
