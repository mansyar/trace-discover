# Handoff: Cutting `v1.0.0` (stable release)

**Track:** `cicd-pipeline_20260915` · **Written:** 2026-09-15 · **State:** waiting for the `trace-v1_20260914` track to formally close

The release machinery is live and proven end-to-end with `v1.0.0-rc.1` (prerelease → `rc` preview). This checklist is everything the maintainer needs to ship stable `v1.0.0`.

## Preconditions

- [ ] The `trace-v1_20260914` track is formally complete (final review/acceptance done)
- [ ] `master` CI green; no open v1-scope work items
- [ ] RC tag disposition decided — recommended: **keep `v1.0.0-rc.1` published** (tags are immutable; the RC documents the validation run). If you insist on deleting it, do so *before* shipping stable, and never reuse or move a pushed tag
- [ ] `package.json` bumped to `1.0.0` (`chore(release): 1.0.0`), pushed — the version guard requires the exact match
- [ ] Sanity: `git ls-remote --tags origin` shows only expected tags

## Cut

- [ ] `git tag -a v1.0.0 -m "Trace & Discover! v1.0.0"` then `git push origin v1.0.0`
- [ ] Watch the Release run go green: guards → checks → tests → build → Pages deploy → GitHub Release
- [ ] Verify the Release is a **full release** (not prerelease) with generated notes + `Deployed at https://trace-discover.pages.dev`
- [ ] Verify production serves the new build: open https://trace-discover.pages.dev
- [ ] Offline cold-start probe against production: `node spike/qa-offline.mjs https://trace-discover.pages.dev` (expect: SW controlling → booted from precache → dino-1 SUCCESS → no page errors)
- [ ] Real-device install re-check (Android Chrome + iPad Safari) from the production URL

## Rollback (if the stable cut goes wrong)

- [ ] Bad deploy, good code: promote the previous Pages deployment (Cloudflare dashboard → Deployments → ⋯ → Rollback)
- [ ] Bad code: revert on `master`, bump to the next patch version, re-tag and push — never move/delete the published tag

## Acceptance trace — spec criteria vs. evidence

| # | Acceptance criterion (spec) | Evidence |
|---|---|---|
| 1 | Public repo with origin + Actions enabled | repo live since 2026-09-15; `master` default; Actions runs recorded |
| 2 | PR triggers CI; a deliberately broken PR fails | PR #1: red at tests [34919251028](https://github.com/mansyar/trace-discover/actions/runs/34919251028), red at tsc [34919310152](https://github.com/mansyar/trace-discover/actions/runs/34919310152), red at Biome [34919357599](https://github.com/mansyar/trace-discover/actions/runs/34919357599), then green [34919423243](https://github.com/mansyar/trace-discover/actions/runs/34919423243) |
| 3 | `master` push runs CI; superseded runs cancel | green push runs incl. [34919679151](https://github.com/mansyar/trace-discover/actions/runs/34919679151); cancellation proven: [34919096966](https://github.com/mansyar/trace-discover/actions/runs/34919096966) cancelled by [34919111407](https://github.com/mansyar/trace-discover/actions/runs/34919111407) |
| 4 | `v1.0.0-rc.1` → guards pass, preview deploy, prerelease with notes + URL | run [34920856339](https://github.com/mansyar/trace-discover/actions/runs/34920856339) green; release https://github.com/mansyar/trace-discover/releases/tag/v1.0.0-rc.1 (prerelease, notes + `Deployed at https://rc.trace-discover.pages.dev`); offline probe passed on live preview |
| 5 | Trigger-matching non-semver tag fails before build/deploy | `v1.0.x` → [34920352519](https://github.com/mansyar/trace-discover/actions/runs/34920352519) failed in ~6s at *Validate tag* (no further steps) |
| 6 | Version-mismatch tag fails before build/deploy | `v1.0.0-rc.9` (pkg 0.1.0) → [34920397104](https://github.com/mansyar/trace-discover/actions/runs/34920397104) failed at *Validate tag* |
| 7 | Pages production branch verified and recorded | `master` (existing Production deployments from source `47747df` + maintainer confirmation); stable → `master`, prerelease → `rc` |
| 8 | Docs aligned | `workflow.md` Deployment Workflow = real runbook; `tech-stack.md` §CI/CD synced + dated verified note |
