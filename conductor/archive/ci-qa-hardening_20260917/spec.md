# Spec: CI/QA hardening — browser smoke, coverage gate, stale sweep

**Track ID:** `ci-qa-hardening_20260917`
**Type:** Chore
**Branch:** `track/ci-qa-hardening`
**Created:** 2026-09-17

## Overview

CI verifies types, lint, unit tests, the production build and the payload budget — but never boots the real app in a browser. The runtime face (canvas boot, Rive WASM, Web Audio, the PWA shell) is protected only by manual headless-QA runs on a developer machine. Coverage is reported but never enforced, and the QA runbook still lists four scripts it has flagged as stale.

This track hardens the safety net without touching child-visible behavior: a canonical browser smoke runs the production build in GitHub Actions on every PR/push to master (minimal journey: boot → Pre-writing → trace `pre-1` → success, zero uncaught page errors); Vitest coverage thresholds become an enforced gate calibrated from the measured master baseline; the stale scripts are retired with a reference sweep. Dev-time and CI-only — no shipped-code change.

## Locked design decisions

- **Smoke browser = the runner's preinstalled Edge** (`channel: 'msedge'`): GitHub's `ubuntu-latest` images ship Microsoft Edge (verified in the runner-image manifests) — no browser downloads, no new cache weight, same engine family the local QA scripts already use.
- **Minimal journey by choice:** boot → menu → Pre-writing → `pre-1` traced to success + zero uncaught page errors. Extended journeys (pack screens, letters, skin cycle) and the offline SW probe are explicitly deferred.
- **Deterministic QA tooling:** `dev/pnpm-lock.yaml` (today gitignored) becomes tracked so CI installs dev dependencies with `--frozen-lockfile`; no semver drift.
- **Coverage gate semantics:** global thresholds only (not per-file), calibrated with small deliberate headroom under the measured baseline; plain `pnpm test` stays threshold-free — only `--coverage` runs gate. `src/app/render.ts` (canvas-heavy painter, 15.5%) stays the documented unit-test boundary — coverage perfectionism is out of scope.
- **Working agreement:** the branch is pushed and a PR to master opened as part of this track (CI evidence requires GitHub runs); merge and release stay with the owner. No new runtime dependencies; no new services.

## Functional Requirements

### FR1 — Canonical smoke script (`dev/qa/qa-smoke.mjs`)
- Headless Edge via `channel: 'msedge'`, env-overridable; base URL via argument/env (default `http://localhost:4173` — the built app served by `pnpm preview`).
- Asserts the minimal journey: splash → menu → Pre-writing pack → `pre-1` level; traces with the established synthetic-pointer technique; asserts success.
- Fails (non-zero exit) on any uncaught page error or failed assertion; writes screenshots + a findings log to git-ignored `dev/qa/out/`; no retries — flake is a defect.

### FR2 — CI wiring
- `ci.yml` gains, on the existing triggers (PR→master, push→master, dispatch): a frozen dev-tooling install, and a smoke step after `build` + `budget` (background `pnpm preview` + readiness wait + `node dev/qa/qa-smoke.mjs`).
- `cache-dependency-path` includes `dev/pnpm-lock.yaml`; job timeout raised as needed (≤ 20 min).
- Smoke evidence (`dev/qa/out/`) uploads on failure, best-effort — mirroring the coverage artifact's rule that artifact-service problems must never redden runs.

### FR3 — Coverage enforcement
- `vite.config.ts` test config gains global coverage thresholds enforced by the existing CI `pnpm test --coverage` step.
- Calibration baseline (measured on master @ `fa84ee1`, 2026-09-17): **72.88 statements / 77.55 branches / 89.57 functions / 72.42 lines** (634 tests, 54 files).
- A negative control proves the gate bites.

### FR4 — Stale sweep
- Delete `dev/qa/qa-diag-pre3.mjs`, `dev/qa/qa-probe.mjs`, `dev/qa/browsertest.mjs`, `dev/qa/serve.mjs`; sweep references (verified: only the `dev/README.md` table rows); runbook updated — `qa-smoke` joins the table as canonical.

### FR5 — Documentation resync
- `conductor/tech-stack.md`: dated note — CI browser smoke (preinstalled Edge, no downloads), enforced coverage thresholds (with values), tracked dev lockfile.
- `dev/README.md`: deps paragraph (tracked lockfile, frozen install), QA table (smoke row, stale rows removed), smoke usage.

## Non-Functional Requirements

- Determinism: frozen-lockfile installs; smoke passes on assertions alone (screenshots never gate); stability proven by ≥5 consecutive local runs + repeated CI runs.
- CI budget: ≲ ~3 min added wall time; total job ≤ 20 min.
- $0 lane: no new services or runtime deps; Edge preinstalled; existing dev deps only.
- No product change: no `src/` app-code change; dist/precache/budget and the unit suite unaffected.
- Robustness: smoke script fails loudly with clean diagnostics (never hangs); CI artifacts best-effort.

## Acceptance Criteria

1. Smoke green locally (≥5 consecutive runs) + recorded green CI runs on the PR. (FR1, FR2)
2. Negative control: smoke red on a deliberately broken build; green after revert (recorded). (FR1)
3. Negative control: coverage gate red when under threshold (recorded); green at calibrated thresholds in CI. (FR3)
4. Stale scripts removed; grep sweep shows no dangling references; `dev/README.md` updated. (FR4)
5. Failure-path control: a red CI run shows the smoke step reddening correctly while the artifact step stays best-effort (recorded). (FR2)
6. Docs synced before implementation per workflow.md. (FR5)
7. `CI=true pnpm check && CI=true pnpm test --coverage && pnpm pack:check && pnpm build && pnpm budget` all green; diff confined to `.github/`, `dev/`, config, docs. (all)

## Out of Scope

- Extended smoke journeys (pack screens / letters / skin cycle) and the offline SW probe — deferred by choice.
- Visual-regression baselines, screenshots-as-gates.
- Modifying existing QA scripts beyond the shared routine adaptation noted in the plan.
- Coverage perfectionism (the `render.ts` unit-test boundary stays as documented).
- Merge, release, deploy decisions (the owner's).
