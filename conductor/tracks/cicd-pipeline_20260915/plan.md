# Implementation Plan: CI/CD Pipeline — GitHub Actions → Cloudflare Pages

**Spec:** [spec.md](./spec.md) · **Track:** `cicd-pipeline_20260915` (Chore) · **Methodology:** follows `conductor/workflow.md` — verification-first adaptation for YAML infrastructure: each workflow lands with a local lint pass (actionlint), a live GitHub run, and a negative control before the next layer is built on it; app gates stay `pnpm check && pnpm test`; every phase closes with the Phase Verification & Checkpoint protocol.

**Delivery strategy:** host & gate first (Phase 1) so `master` is covered from day one; release automation second (Phase 2), where the fail-fast guards are proven with real bad tags *before* any deploy path exists; then the live end-to-end proof on `v1.0.0-rc.1` and handoff docs (Phase 3).

## Phase 1 — GitHub Hosting & CI Gates

*Goal: public repo with PR/master gates that demonstrably fail on a bad change.*

- [ ] Task: Document the CI/CD stack in `tech-stack.md` (before implementation, per workflow.md §7)
  - [ ] Add CI/CD section: GitHub Actions (public repo), Node 24 + pnpm pins from `packageManager`, exact `wrangler` pin, release conventions (semver tags, auto notes)
  - [ ] Verify: dated change note present; no contradiction with existing entries
- [ ] Task: Publish the repository to GitHub
  - [ ] `gh auth setup-git` if the credential helper isn't wired; create public `mansyar/trace-discover` (`gh repo create --source . --remote origin --push`) — full history, default branch `master`
  - [ ] Verify: `gh repo view` (public, `master`), `origin` set, Actions enabled (`gh api`)
- [ ] Task: CI workflow — checks on PR & master
  - [ ] Author `.github/workflows/ci.yml`: triggers `pull_request→master`, `push→master`, `workflow_dispatch`; `concurrency` cancel-in-progress; `permissions: contents: read`; `ubuntu-latest`; `timeout-minutes: 15`
  - [ ] Steps: checkout → `pnpm/action-setup` (reads `packageManager`) → `setup-node` 24 + pnpm cache → `pnpm install --frozen-lockfile` → `pnpm check` → tests with coverage (verify `pnpm test --coverage` passthrough; fallback `pnpm exec vitest run --coverage`) → `pnpm build` → upload `coverage/` artifact (informational, no threshold)
  - [ ] Verify locally: `actionlint` clean (via `go install github.com/rhysd/actionlint/cmd/actionlint@latest` or Docker `rhysd/actionlint`); actions pinned to latest verified majors
  - [ ] Verify live: a `master` push run is green; a `workflow_dispatch` run is green; a superseded run is cancelled by `concurrency`
- [ ] Task: Negative control — a failing PR fails CI
  - [ ] Branch with a deliberate lint violation **and** a failing unit test → PR → both steps fail at the expected gates
  - [ ] Push the fix to the same PR → green; close PR without merging; delete branch
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Release Automation (CD on tag)

*Goal: tag → validate → gate → build → deploy → release note, with fail-fast guards proven before any deploy exists.*

- [ ] Task: Release workflow — trigger + fail-fast validation
  - [ ] Author `.github/workflows/release.yml`: trigger `push: tags: ['v*.*.*']`; `concurrency` **without** cancel-in-progress; `permissions: contents: write`; `ubuntu-latest`; `timeout-minutes: 20`
  - [ ] Step: strict semver check of `${GITHUB_REF_NAME#v}` **and** tag == `package.json#version` — fail before install/build/deploy
  - [ ] Verify locally: `actionlint` clean
  - [ ] Negative control A: push tag `v1.0.x` (matches trigger, rejected by semver) → fails at validation, no build/deploy attempted; delete tag
  - [ ] Negative control B: push tag `v1.0.0-rc.9` while `package.json` = 0.1.0 → fails at the version guard; delete tag
- [ ] Task: Cloudflare Pages deploy step
  - [ ] Confirm the live Pages project's production branch with the maintainer (dashboard) and record it
  - [ ] Secrets: `gh secret set CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` (Pages: Edit) — values supplied by the maintainer, never echoed, never committed; verify via `gh secret list`
  - [ ] Deploy: `npx --yes wrangler@4.131.2 pages deploy dist --project-name trace-discover --branch=<production|rc> --commit-hash=$GITHUB_SHA --commit-message="Release $TAG"` — stable → production branch, prerelease (contains `-`) → `rc` preview; capture the deployed URL into the step summary (+ constructed-URL fallback)
  - [ ] Verify flags against the installed wrangler (`--help`); live proof lands in Phase 3
- [ ] Task: GitHub Release creation with notes
  - [ ] `gh release create "$TAG" --title "$TAG" --generate-notes` (+ `--prerelease` when tag contains `-`); append `Deployed at <url>` to the body
  - [ ] Verify via `gh release view` in Phase 3: prerelease flag, notes, URL line
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — End-to-End Release Proof & Handoff

*Goal: the full chain proven on a real prerelease, production untouched, runbook recorded.*

- [ ] Task: Cut `v1.0.0-rc.1` end-to-end
  - [ ] Bump `package.json` → `1.0.0-rc.1` (`chore(release): 1.0.0-rc.1`), push to `master`
  - [ ] Tag + push `v1.0.0-rc.1`; observe the CD run: guards pass, gates run, deploy succeeds to the `rc` preview, URL captured
  - [ ] Verify: release exists (prerelease + notes + URL); preview URL serves the PWA with offline intact; production URL unchanged; evidence (run URLs, deployed URL) recorded in the track
- [ ] Task: Documentation alignment — release runbook
  - [ ] Rewrite `workflow.md` "Deployment Workflow" → real runbook (bump → PR/merge → tag → push → observe → verify; rollback = promote a previous Pages deployment / re-tag a fixed build)
  - [ ] `tech-stack.md` CI/CD section reflects what actually shipped (dated note); track docs list secret names, project name, production branch, URLs
- [ ] Task: Handoff — stable-release checklist for the maintainer
  - [ ] Write the `v1.0.0` cut checklist (after the v1 track is formally closed) incl. RC tag disposition; verify it satisfies every spec acceptance criterion
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
