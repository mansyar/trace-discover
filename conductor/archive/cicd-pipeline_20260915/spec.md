# Specification: CI/CD Pipeline — GitHub Actions → Cloudflare Pages

**Track:** `cicd-pipeline_20260915` · **Type:** Chore · **Status:** new

## Overview

Give the project a production-grade, $0-aligned delivery pipeline: every change reaches `master` through automated quality gates, and every release is a verifiable, immutably-built artifact — triggered by pushing a version tag, deployed to Cloudflare Pages, and published as a GitHub Release with auto-generated notes. Today the repo is local-only: no remote, no workflows, and "releasing" would mean a manual upload with no record of what shipped.

## Current State (verified 2026-09-15)

- Local git repo on `master`, **no remote**; history verified clean of secrets (`.cf_token` was gitignored from day one — re-checked across full history).
- Baseline green: `pnpm check` (Biome, 68 files + `tsc --noEmit`) clean · `pnpm test` 214/214 in 27 files · `pnpm build` → 31 precache entries (~3.8 MB).
- Toolchain pinned: Node 24.16, pnpm 12.4.1 (`packageManager`), Vite 8.3, Vitest 5, Biome 2.5.13, TS 7.0.2.
- Deploy path proven by the Phase-6 dry run: `wrangler pages deploy dist --project-name trace-discover`; the Cloudflare Pages project exists.
- No `.github/`; `spike/qa/**` browser harnesses are intentionally untracked → CI cannot run them.

## Functional Requirements

**FR1 — Repository hosting.** Create a **public** GitHub repository (`mansyar/trace-discover`), push the full history, set it as `origin`, and confirm Actions is enabled. Public ⇒ free unlimited Actions minutes; the `spike/` pipeline internals become world-visible — accepted, and the history is verified secret-free.

**FR2 — CI on PR (and master).** `.github/workflows/ci.yml` runs on `pull_request` → `master`, `push` → `master`, and `workflow_dispatch`. Ubuntu runner · Node 24 · pnpm pinned from `packageManager` · frozen lockfile · pnpm-store cache. Gates in order: `pnpm check` → `pnpm test` → `pnpm build`. Coverage (`vitest --coverage`) is collected and uploaded as a workflow artifact — **informational only**, no threshold gate yet. Superseded runs cancel via `concurrency`.

**FR3 — CD on tag.** `.github/workflows/release.yml` runs on tags matching `v*.*.*`. Order: strict-semver tag validation → tag == `package.json#version` guard (fail fast, before any build) → install → the same quality gates as CI → `pnpm build` → deploy `dist/` to Cloudflare Pages → create the GitHub Release. Any failed gate aborts before deploy (no partial releases); an in-flight deployment is never cancelled.

**FR4 — Release notes.** GitHub Release: title = tag, body = auto-generated notes (`--generate-notes`) plus a `Deployed at <url>` line. Prerelease tags (contain `-`, e.g. `v1.0.0-rc.1`) are published as GitHub prereleases and deployed to a **preview** branch (`--branch=rc`) — production stays untouched. Only stable tags reach the Pages production branch.

**FR5 — Secrets & least privilege.** Two Actions secrets, set via `gh secret set` (values supplied by the maintainer): `CLOUDFLARE_API_TOKEN` (Account → Cloudflare Pages → Edit) + `CLOUDFLARE_ACCOUNT_ID`. CI runs with `contents: read`; only the release job adds `contents: write` (release creation). Secrets never touch PR contexts.

**FR6 — Documentation alignment.** `tech-stack.md` gains a CI/CD section (dated note, per Conductor principle #2); `workflow.md`'s generic "Deployment Workflow" is replaced with the actual release runbook (bump version → commit → tag → push tag → observe CD → rollback options); required secrets/scopes are recorded in the track docs.

**FR7 — End-to-end proof.** Pushing `v1.0.0-rc.1` must go green end-to-end: panels pass, `dist/` deploys to a Pages preview, a GitHub prerelease is published with notes + deploy URL, and the preview URL serves the installable PWA with offline intact. Cutting stable `v1.0.0` production remains a deliberate maintainer act after the v1 track closes.

## Non-Functional Requirements

- **NFR1 — Speed:** CI ≤ ~3 min on a warm cache; CD ≤ ~5 min end-to-end.
- **NFR2 — Determinism:** pnpm from `packageManager`, frozen lockfile, actions pinned by verified major version, `wrangler` pinned to an exact version — no floating installs.
- **NFR3 — Toolchain parity:** Windows/Node 24.16 dev vs. Ubuntu/Node 24 CI — the first green run is the proof; native TS 7 platform friction falls back per the documented path in `tech-stack.md`.
- **NFR4 — Cost:** $0 lane only — public-repo free Actions minutes, Pages free tier, no paid services.
- **NFR5 — Safety:** fail-fast validation; deploy only from a green tagged build; secrets only in the release workflow.

## Acceptance Criteria

1. Public repo `mansyar/trace-discover` exists with the full history; `origin` set; Actions enabled.
2. A PR to `master` runs CI with status reported; a deliberately broken PR fails the expected step *(negative control)*.
3. A `push` to `master` runs CI; superseded runs cancel.
4. Tag `v1.0.0-rc.1`: version guard passes, gates pass, `dist/` deploys to the Pages **preview**, GitHub Release exists as prerelease with notes + deploy URL.
5. A tag that matches the trigger but is not valid semver (e.g. `v1.0.x`), and a well-formed tag whose version ≠ `package.json#version`, both fail **before** build/deploy *(negative controls)*.
6. The Pages production branch is verified against the live project and recorded (the stable-tag deploy path is exercised only when the maintainer cuts `v1.0.0`).
7. `tech-stack.md` + `workflow.md` document the pipeline and release runbook.

## Out of Scope

Browser/device smoke tests in CI (`spike/qa/**` harnesses are untracked; re-adding them is a separate track) · PR preview deployments (declined) · auto-versioning (semantic-release style — tags stay a deliberate human act) · README/site overhaul, custom domain, analytics, store shipping.

## Risks & Mitigations

- **Native TS 7 on Ubuntu** → first-run parity check; documented fallback in `tech-stack.md`.
- **Pages production branch assumption (`main`)** → verified against the live project before the first stable deploy.
- **RC reaches a preview URL, not production** → intentional; stable tags are the only production path.
- **Public history includes spike internals** → accepted by decision; secret scan already clean.
