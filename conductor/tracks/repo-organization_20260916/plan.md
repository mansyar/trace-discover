# Implementation Plan: Repo Organization & Dev Tooling Hygiene

**Spec:** [spec.md](./spec.md) · **Track:** `repo-organization_20260916` (Chore) · **Methodology:** follows `conductor/workflow.md` — every phase closes with the Phase Verification & Checkpoint protocol. **Chore-adapted TDD:** no new unit tests expected — the existing Vitest suite is the regression harness and must stay green **unmodified**; task-level verification is mechanical (git-grep, spot-runs, build deltas). A forced test edit would signal an accidental behavior change — stop and fix the cause.

**Delivery strategy:** docs-first (tech-stack + READMEs drafted from the target layout), then the history-preserving workspace move (`git mv`, script hardening, ignore rules), then the dead-file prune, then verification and close-out. Work stays local on `track/repo-organization` — no push/PR/release (spec §Out of Scope).

## Phase 1 - Docs first: tech stack + READMEs [checkpoint: 52ff14a]

*Goal: the target layout and policies are written down before anything moves (workflow.md: Tech Stack is Deliberate); the READMEs become the working checklists for Phases 2–3.*

- [x] Task: Context docs resync — `tech-stack.md`: `dev/` tooling layout (tools · qa · harness · characters · art-src), updated script paths, art-source policy (documented before implementation per workflow.md) [0df3f9b]
- [x] Task: Root `README.md` — what the app is, quickstart (`pnpm install / dev / build / test / check / preview / serve`), repo map (`src/ public/ dev/ conductor/`), conductor pointers [291a8f3]
- [x] Task: `dev/README.md` frame — layout map, pipeline flow (generate → cutout → optimize → composite → screenshot approval), QA inventory table (statuses filled through Phases 2–3), art-source policy [52ff14a]
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Restructure: `spike/` → `dev/`

*Goal: the workspace is moved and every script runs from its new home; nothing live references `spike/` anymore.*

- [x] Task: History-preserving move (`git mv`) — `tools/`, QA scripts, harness pages, character workspaces, `art-src`, `package.json` into `dev/`; spot-check `git log --follow` on moved files [69a908f]
- [x] Task: Script path hardening (TDD-adapted: run-proof, no unit tests) — `import.meta.url`-anchored paths replacing cwd assumptions; QA outputs unified under ignored `dev/qa/out/`; harness URLs updated to `/dev/harness/*.html`; run-proof each family: one pipeline tool, one QA script (`qa-app`), harness page load [9f3b2cd]
- [x] Task: `.gitignore` restructure — `dev/` patterns; single QA output dir; remove stale entries (spike/web, per-dir `.gitignore` lineages, obsolete negations) [60a2c5c]
- [ ] Task: Live-reference sweep — `.agents/skills/rive-cli/SKILL.md`, `src/packs/numbers.ts` comment, current docs; `git grep spike/` clean outside `conductor/archive/` + history
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Prune dead files

*Goal: only load-bearing files remain — legacy art gone, art-src at the policy set, dino iterations consolidated.*

- [ ] Task: Legacy `public/art` prune — re-verify zero references (code + QA scripts + docs), delete the 15 legacy theme goal PNGs, record build/precache delta
- [ ] Task: art-src raw trim — drop raw generations (~41 files) from `dev/art-src/nums`; keep cutouts + vignettes + card; policy recorded in `dev/README.md`
- [ ] Task: Character consolidation — provenance check (riv-cast.md + workspace verify) → prune superseded dino iterations; star/excavator/lion retained
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — Compliance & close-out

*Goal: measured, verified, documented — acceptance criteria 1–8 traced to evidence.*

- [ ] Task: Full gates — `CI=true pnpm check && CI=true pnpm test && pnpm build`; dist size + coverage recorded vs baseline (expect ~1 MB dist reduction)
- [ ] Task: QA spot-sweep from new homes — pipeline tool run, `qa-app` against preview, harness page, offline probe where applicable
- [ ] Task: QA inventory + READMEs finalized — statuses complete; docs match reality; zero-text surfaces untouched
- [ ] Task: Acceptance evidence recorded (plan + git note for the track)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
