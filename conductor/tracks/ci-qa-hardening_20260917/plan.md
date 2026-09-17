# Implementation Plan: CI/QA hardening — browser smoke, coverage gate, stale sweep

**Spec:** [spec.md](./spec.md) · **Track:** `ci-qa-hardening_20260917` (Chore) · **Methodology:** follows `conductor/workflow.md` — verification-first: every gate introduced gets a recorded negative control proving it bites; commit + git note per task (7-char SHA recorded here); every phase closes with the Phase Verification & Checkpoint protocol.

**Delivery strategy:** foundation first (docs of record → deterministic dev installs → stale sweep), then the smoke script proven locally (≥5 green + sensitivity control), then CI wiring with the branch pushed and a draft PR so GitHub runs become the evidence trail (including a controlled red run for the failure path), then coverage thresholds calibrated from the measured baseline, then a full acceptance sweep and owner handoff. No `src/` app-code change; budget unaffected. Push + PR are part of this track (CI evidence requires them); merge and release remain owner decisions.

## Phase 1 — Docs of record + deterministic dev workspace + stale sweep

*Goal: the context docs describe the CI/QA hardening before implementation; QA tooling installs deterministically; the four stale scripts are gone.*

- [x] Task: Context docs resync — before implementation per workflow.md [43085cd]
  - [x] `conductor/tech-stack.md`: dated note — CI browser smoke (preinstalled Edge on `ubuntu-latest`, no browser downloads), enforced coverage thresholds (calibrated values), `dev/pnpm-lock.yaml` tracked for frozen installs
  - [x] Commit + git note
- [x] Task: Deterministic dev QA deps [8287787]
  - [x] Remove the `dev/pnpm-lock.yaml` ignore (`.gitignore`); regenerate the lockfile with the repo's pnpm (12.4.1); verify `pnpm --dir dev install --frozen-lockfile` no-ops clean; commit the lockfile
  - [x] `dev/README.md`: deps paragraph updated (tracked lockfile; frozen installs)
  - [x] Commit + git note
- [~] Task: Stale sweep
  - [~] Delete `dev/qa/qa-diag-pre3.mjs`, `dev/qa/qa-probe.mjs`, `dev/qa/browsertest.mjs`, `dev/qa/serve.mjs`
  - [ ] Repo-wide grep confirms no references remain beyond the README rows; remove those rows + the stale note; record the sweep
  - [ ] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Canonical smoke script, proven locally

*Goal: `qa-smoke.mjs` is the trustworthy canonical smoke — ≥5 consecutive green runs, and proven red on a broken build.*

- [ ] Task: Write `dev/qa/qa-smoke.mjs`
  - [ ] Adapt launch/tap/trace routine from `qa-app.mjs` / `qa-pre-pack.mjs`: splash → `pack:pre` → `level:pre-1` → trace → success; channel env-overridable (default `msedge`); base URL arg/env (default `http://localhost:4173`); page-error collection → non-zero exit
  - [ ] Screenshots + findings log into `dev/qa/out/` (git-ignored); clean diagnostics; no retries
  - [ ] Evidence: `pnpm build` + preview → ≥5 consecutive green runs recorded
  - [ ] Commit + git note
- [ ] Task: Negative control — sensitivity proof
  - [ ] Temporary boot-failure patch (`src/main.ts`) → build → smoke red (screenshot + log captured) → revert → green; evidence recorded (empty evidence commit permitted)
  - [ ] Commit + git note
- [ ] Task: Runbook — `dev/README.md` gains the `qa-smoke` row (canonical) + usage note (two-terminal pattern)
  - [ ] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — CI wiring + recorded runs

*Goal: every PR boots the real app on GitHub's Edge; the failure path (red step, best-effort artifact) is proven on a live run.*

- [ ] Task: `ci.yml` wiring
  - [ ] Add frozen dev-tooling install (`working-directory: dev`); extend `cache-dependency-path` with `dev/pnpm-lock.yaml`
  - [ ] Add smoke step after `pnpm budget`: background `pnpm preview` + readiness loop + `node dev/qa/qa-smoke.mjs`
  - [ ] Job timeout 15 → 20 min; failure-only artifact upload (`dev/qa/out/`, best-effort, `if-no-files-found: ignore`)
  - [ ] Commit + git note
- [ ] Task: Push + draft PR + failure-path control
  - [ ] Push `track/ci-qa-hardening`; open draft PR → CI fires
  - [ ] Temporary commit forcing smoke failure → confirm the run reddens at the smoke step only and the artifact step stays best-effort; record run URLs; revert
  - [ ] Commit + git note
- [ ] Task: Green end-to-end CI evidence
  - [ ] Final state green; record run URL + step timings (smoke's added wall time vs 20 min budget)
  - [ ] Commit + git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — Coverage enforcement

*Goal: coverage is a gate that provably bites, calibrated to the measured baseline.*

- [ ] Task: Thresholds in `vite.config.ts`
  - [ ] Global thresholds (statements 72 / branches 76 / functions 88 / lines 72 — ≤ ~1.5 pt headroom vs measured 72.88 / 77.55 / 89.57 / 72.42; exact ints re-checked at implementation); plain `pnpm test` unaffected
  - [ ] Local `pnpm test --coverage` green; record the covered summary line
  - [ ] Commit + git note
- [ ] Task: Negative control — temporary threshold raise → coverage red → revert → green; recorded
  - [ ] Commit + git note
- [ ] Task: CI evidence — push; PR run shows the gate enforced and green; recorded
  - [ ] Commit + git note
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
