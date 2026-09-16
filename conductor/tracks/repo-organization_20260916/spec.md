# Repo Organization & Dev Tooling Hygiene

**Track ID:** `repo-organization_20260916` · **Type:** Chore · **Status:** new
**Branch:** `track/repo-organization` · **Created:** 2026-09-16

## Overview

Four shipped tracks left the dev-time tooling in a catch-all `spike/` folder — asset pipeline scripts, 22 QA scripts, four generations of dino workspaces, and 15.6 MB of numerals art intermediates — while the repo root mixes three dev harness pages with the app shell, `public/art` precaches ~1.07 MB of dead legacy art, and there is no README anywhere. Ahead of the letters track (26+ new art sources, more QA), this chore renames `spike/` → `dev/`, splits it by purpose, documents the repo, prunes provably-dead files, and locks an art-source policy. **Behavior-neutral: no app logic, content, or runtime changes.**

## Design decisions (locked)

- **Rename `spike/` → `dev/`** with a purpose-split layout; scripts become cwd-independent (`import.meta.url`-anchored) so they run from any directory.
- **Art-source policy:** `dev/art-src/<pack>/` tracks the approved **cutout** layer + derived **composites** (vignettes); raw generations stay untracked (as pre-writing already did). `spike/nums` trims to cutouts + vignettes + card — raws dropped (~6 MB).
- **QA:** all scripts moved, none deleted; `dev/README.md` marks each **canonical / one-off / stale** with its required server + port. QA screenshot outputs consolidate under one ignored `dev/qa/out/`.
- **Characters:** consolidate `dino`–`dino4` to the canonical workspace that produced `public/rive/dino.riv` (verify first); excavator/lion/star stay. Ignore rules normalized (no per-dir negation sprawl).
- **Harness pages** (`play.html`, `screens.html`, `tune.html`) move → `dev/harness/`; QA URLs updated.
- **Deferred to letters track:** numbers art rename (`card.png`→`card-num.png`, `badge.png`→`num-badge.png`) + `main.ts` special-case removal.
- **Working agreement:** local branch — no push/PR/release; merge & release decisions are the owner's afterward.

## Target layout

```
README.md                 ← NEW: project, quickstart, repo map
dev/                      ← renamed from spike/
├── README.md             ← NEW: dev runbook (pipeline + QA: script table, servers/ports)
├── package.json          ← playwright-core (as now)
├── tools/                ← asset pipeline (spike/tools + opt-art, make-icons)
├── qa/                   ← qa-*.mjs + qa-harness + browsertest + serve; out/ ignored
├── harness/              ← play.html, screens.html, tune.html
├── characters/           ← dino (canonical), star, excavator, lion workspaces
└── art-src/nums/         ← cutouts + vignettes + card (raws dropped)
```

## Functional Requirements

**FR1 — Dev workspace restructure.** `spike/` → `dev/` per layout; every moved script runs from its new home; all path assumptions anchored to `import.meta.url`; generated outputs (build/, gen/, QA screenshots) remain ignored under new paths.

**FR2 — Documentation.** Root `README.md` (project, quickstart, repo map, pointer to conductor docs) + `dev/README.md` (runbook: pipeline flow, QA script inventory with status + server/port, art-source policy). Update `tech-stack.md` paths *before* implementation (workflow.md: Tech Stack is Deliberate), the rive-cli skill's `spike/tools` reference, and the `numbers.ts` comment.

**FR3 — Dead-file prune.** (a) Delete 15 legacy theme goal PNGs in `public/art/goal` (~1.07 MB) after re-verifying zero references — precache/dist shrink accordingly. (b) Drop raw generations from art-src (~41 files, ~6 MB). (c) Prune superseded dino workspaces after the provenance check; remove stale `.gitignore` entries (`spike/web`, per-dir negations).

**FR4 — Reference hygiene.** No live `spike/` reference survives (git-grep clean outside `conductor/archive/` and history): `.gitignore`, rive-cli skill, code comments, QA script URLs (`/dev/harness/*.html`), docs.

## Non-Functional Requirements

- Behavior-neutral: app source unchanged except comment/path references; all tests stay green **unmodified**.
- Verifiable: `pnpm check && pnpm test && pnpm build` green after each phase; spot-runs of moved tooling.
- Size: dist shrinks by the dead art; no other bundle change.
- Doc self-sufficiency: a cold reader/agent can run the pipeline and a QA sweep from `dev/README.md` alone.

## Acceptance Criteria

1. `spike/` gone; layout matches; `git grep spike/` clean outside archived history.
2. Spot-verified from new homes: one pipeline tool run, `node dev/qa/qa-app.mjs <url>`, harness page loads at `/dev/harness/play.html`.
3. Both READMEs exist and are accurate; child surfaces untouched.
4. Legacy art deleted; zero dead references; build/precache measurably smaller.
5. `dev/art-src/nums` = cutouts + vignettes + card only; policy documented and applicable to letters.
6. `.gitignore` free of stale/spike entries; ignore behavior intact.
7. Checks green; no test modifications required; CI untouched.
8. `tech-stack.md`, rive-cli skill, comments synced.

## Out of Scope

- App behavior, content, UI, PWA changes · CI changes · numbers art rename (letters track) · deleting QA scripts · backfilling pre-writing art sources (originals gone) · push/PR/release.
