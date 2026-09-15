# Implementation Plan: CI/CD Pipeline — GitHub Actions → Cloudflare Pages

**Spec:** [spec.md](./spec.md) · **Track:** `cicd-pipeline_20260915` (Chore) · **Methodology:** follows `conductor/workflow.md` — verification-first adaptation for YAML infrastructure: each workflow lands with a local lint pass (actionlint), a live GitHub run, and a negative control before the next layer is built on it; app gates stay `pnpm check && pnpm test`; every phase closes with the Phase Verification & Checkpoint protocol.

**Delivery strategy:** host & gate first (Phase 1) so `master` is covered from day one; release automation second (Phase 2), where the fail-fast guards are proven with real bad tags *before* any deploy path exists; then the live end-to-end proof on `v1.0.0-rc.1` and handoff docs (Phase 3).

## Phase 1 — GitHub Hosting & CI Gates [checkpoint: 7be8431]

*Goal: public repo with PR/master gates that demonstrably fail on a bad change.*

- [x] Task: Document the CI/CD stack in `tech-stack.md` (before implementation, per workflow.md §7) [f1ca4b7]
  - [x] Add CI/CD section: GitHub Actions (public repo), Node 24 + pnpm pins from `packageManager`, exact `wrangler` pin, release conventions (semver tags, auto notes)
  - [x] Verify: dated change note present; no contradiction with existing entries
- [x] Task: Publish the repository to GitHub — AMENDED: maintainer pre-created public `mansyar/trace-discover` (2026-09-15); origin attached, full history pushed and verified
  - [x] Verify: repo public, default branch `master`, Actions enabled (`gh api`); `origin` configured; remote sync = local `master` (pushed `f1ca4b7`)
  - [x] Secrets `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` present (`gh secret list`, set by maintainer) — CD prerequisites landed early
- [x] Task: CI workflow — checks on PR & master [fa343d7]
  - [x] Author `.github/workflows/ci.yml`: triggers `pull_request→master`, `push→master`, `workflow_dispatch`; `concurrency` cancel-in-progress; `permissions: contents: read`; `ubuntu-latest`; `timeout-minutes: 15`
  - [x] Steps: checkout → `pnpm/action-setup` (reads `packageManager`) → `setup-node` 24 + pnpm cache → `pnpm install --frozen-lockfile` → `pnpm check` → tests with coverage (`pnpm test --coverage` passthrough verified) → `pnpm build` → upload `coverage/` artifact (informational; 150,039 bytes uploaded)
  - [x] Verify locally: `actionlint` v1.7.12 clean; actions pinned to latest verified majors (checkout v7, setup-node v7, upload-artifact v7, pnpm/action-setup v6)
  - [x] Verify live: master push run [34919040984] green (~32s); dispatch run [34919111407] green; superseded dispatch run [34919096966] cancelled by `concurrency`
- [x] Task: Negative control — a failing PR fails CI
  - [x] PR #1 (`qa/ci-negative-control`) proven red/green in sequence: failing test → red at `Tests with coverage` [34919251028]; broken type → red at `Lint and typecheck` (tsc TS2322) [34919310152]; misformatted file → red at `Lint and typecheck` (Biome formatter, log-verified) [34919357599]; cleanup commit → all gates green [34919423243]
  - [x] Incident from this control: transient artifact-finalize 403 failed the green run → upload step hardened non-blocking [7be8431]; job rerun of the identical commit succeeded — PR #1 closed without merging (2026-09-15), branch deleted (local + remote)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Release Automation (CD on tag) [checkpoint: f203e10]

*Goal: tag → validate → gate → build → deploy → release note, with fail-fast guards proven before any deploy exists.*

- [x] Task: Release workflow — trigger + fail-fast validation
  - [x] Author `.github/workflows/release.yml` (stage 1, guards only): trigger `push: tags: ['v*.*.*']` [5bfd94c]; `concurrency` without cancel-in-progress; `permissions: contents: write`; `ubuntu-latest`; `timeout-minutes: 20`
  - [x] Step: strict semver regex on `${GITHUB_REF_NAME#v}` **and** tag == `package.json#version` — fails before install/build/deploy; emits `version`/`prerelease` outputs
  - [x] Verify locally: `actionlint` clean; regex mirror sanity (rejects `1.0.x`, `01.0.0`, `1.0`, accepts `1.0.0-rc.1`/`1.0.0-rc.9`)
  - [x] Negative control A: tag `v1.0.x` → run [34920352519] failed in ~6s at "Validate tag" (*"not strict semver … Refusing to release"*), nothing further ran; tag deleted
  - [x] Negative control B: tag `v1.0.0-rc.9` while `package.json` = 0.1.0 → run [34920397104] failed at "Validate tag" (*"does not match package.json version '0.1.0'"*); tag deleted — remote tag list empty
- [x] Task: Cloudflare Pages deploy step [b1eb68c]
  - [x] Production branch confirmed with maintainer: `master` (API evidence: existing Production deployments on branch `master` from source `47747df`; user confirmed) → stable → `--branch=master`, prerelease → `--branch=rc`
  - [x] Secrets `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` present in repo secrets (`gh secret list`; set by maintainer 2026-09-15; values never echoed/committed)
  - [x] Deploy step added: `npx --yes wrangler@4.131.2 pages deploy dist --project-name trace-discover --branch=<master|rc> --commit-hash=$GITHUB_SHA --commit-message="Release $TAG"` — stable → `https://trace-discover.pages.dev`, prerelease → `https://rc.trace-discover.pages.dev`; URL → step summary + `deploy.url` output [b1eb68c]
  - [x] Flags verified against installed wrangler (`--project-name`, `--branch`, `--commit-hash`, `--commit-message` all present); actionlint clean; live proof lands in Phase 3
- [x] Task: GitHub Release creation with notes [f203e10]
  - [x] Release step added: `gh release create "$TAG" --title "$TAG" --generate-notes` (+ `--prerelease` when tag contains `-`); body appended with `Deployed at <url>` via `gh release edit`; summary line written [f203e10]
  - [ ] (Deferred — Phase 3) Verify via `gh release view`: prerelease flag, generated notes, URL line
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — End-to-End Release Proof & Handoff

*Goal: the full chain proven on a real prerelease, production untouched, runbook recorded.*

- [x] Task: Cut `v1.0.0-rc.1` end-to-end
  - [x] Bump `package.json` → `1.0.0-rc.1` (`chore(release): 1.0.0-rc.1`), pushed to `master` [e4fb31d]
  - [x] Tag + push `v1.0.0-rc.1`; CD run [34920856339] green: guards passed, gates ran, deploy succeeded to the `rc` preview, URL captured (`deploy.url` → summary + release body)
  - [x] Verify: prerelease exists with generated notes + `Deployed at https://rc.trace-discover.pages.dev`; preview serves PWA (HTTP 200) with offline cold-start intact (`spike/qa-offline.mjs`: booted from precache, dino-1 traced SUCCESS, zero page errors); production untouched (no new Production deployment; site still `47747df` build); CI [34920853873] green; evidence recorded in plan + git note
- [x] Task: Documentation alignment — release runbook [a0660d8]
  - [x] Rewrite `workflow.md` "Deployment Workflow" → real runbook: pre-release checklist → bump → annotated tag → push → observe → verify; rollback via Pages deployment promotion / revert+bump+re-tag; never move or delete released tags; no hand-deploys to production
  - [x] `tech-stack.md` CI/CD section reflects shipped reality (dated note with the live v1.0.0-rc.1 proof); secret names, project, production branch and URLs recorded in spec/plan/tech-stack
- [~] Task: Handoff — stable-release checklist for the maintainer
  - [ ] Write the `v1.0.0` cut checklist (after the v1 track is formally closed) incl. RC tag disposition; verify it satisfies every spec acceptance criterion
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
