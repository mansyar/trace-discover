# Conductor Migration Report

- **Date:** 2026-10-26
- **From:** Conductor 1.x
- **To:** Conductor 2.0
- **Mode:** Upgrade in place

## Context

- **Preserved:** `product.md`, `tech-stack.md`, `product-guidelines.md` (context
  documents are untouched; `tech-stack.md` and `product.md` carry their own dated
  history), and `code_styleguides/` (`general.md`, `html-css.md`,
  `typescript.md`).
- **Regenerated:** `workflow.md` — same project policies, plus the v2
  `## Workflow Config` block and a `## Verification Strategy` section filled with
  this repository's real commands, ports, fixtures and evidence paths. The v1
  manual-confirmation loop is replaced by the agent-verified phase model, with the
  device pass, release secrets and `gh` authentication kept as human-only
  exceptions. The `git notes` audit trail is kept as a supplement to the
  committed verification reports.
- **Index:** `conductor/index.md` merged in place; `<!-- conductor-version: 2 -->`
  marker added; the Definition, Workflow and Tracks sections already pointed at
  the right files. No Capabilities section — no agent skills or Conductor
  subagents are installed in this project.
- **Scaffolding:** `conductor/tracks.md` kept (its registry lines are the
  permanent ledger); `conductor/tracks/.gitkeep` restored so the index link
  resolves; `.conductor/` added to `.gitignore` for runtime state and evidence.
- **Agents:** skipped — this is not an OpenCode host (no `OPENCODE*` env, no
  `.opencode/`). `conductor-implement` and `conductor-review` therefore fall back
  to the host's general subagent, which is how this project has been running.

## Tracks

| Track | Status | Missing metadata | Plan v2 | Spec v2 | Recommended action |
| --- | --- | --- | --- | --- | --- |
| `tablet-fit_20261006` | complete, archived at `conductor/archive/tablet-fit_20261006` | none — full v2 metadata (branch, base_sha, checkpoint, progress, review fields, PR URL/state, archive fields) | yes | yes | Keep as historical; nothing to do |

No track is active in `conductor/tracks/`, so there is no legacy track blocking
`conductor-implement`, `conductor-review` or phase revert. The older entries under
`conductor/archive/` predate v2 and keep their original minimal metadata; they are
history and were not rewritten.

## Open Questions & Assumptions

- **Coverage scope** is recorded as `project`: the enforced thresholds in
  `vite.config.ts` (72 / 76 / 88 / 72) are project-wide, and new modules are
  expected to land near 100 % by convention, not by a separate gate.
- **`pr.watch_ci: true` (15-minute cap)** was set without a dedicated question.
  CI on this repository takes about a minute and the merge gate depends on it, so
  watching is the cheaper default; say so if you would rather open the PR and
  move on.
- **`review.strict: true` with `min_severity: low`** encodes the "every finding is
  resolved unless out of scope" policy: out-of-scope findings become issues, Low
  findings are grouped by area, and the batch is shown for confirmation before
  anything is filed (`auto_create: false`).
- **PR media** is `always`; the installed `gh` is 2.103.0, so `--attach` is
  supported. Captures live under `.conductor/media/` and are never committed.

## Limits

- Legacy tracks are blocked by `conductor-implement`, `conductor-review`, and
  phase revert until they are recreated or manually repaired.
- Old specs and plans were not rewritten automatically.
- When a track is repaired, remove `legacy: true` from its metadata and update the
  spec/plan to the v2 contract.
- The pre-migration directory is backed up at
  `.conductor/backups/conductor-v1-20261026-191149/` (local, gitignored).
- v2 runs sequentially in the current worktree and creates no worktrees. No
  `.conductor/worktrees/` exists here, so there is nothing to prune.
